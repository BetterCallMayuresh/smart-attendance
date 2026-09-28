import { useEffect, useMemo, useRef } from 'react';

function hashAngle(key) {
  let h = 0;
  const s = String(key || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

/**
 * Signal strength drives distance from the access point at the centre.
 * -40 dBm sits near the AP, -90 dBm sits at the edge of the sweep.
 */
function radiusFromRssi(rssi, fallbackKey) {
  if (rssi == null) {
    // No per-station signal available; spread unknowns on an outer ring.
    return 0.62 + (hashAngle(fallbackKey) % 20) / 100;
  }
  const clamped = Math.max(-90, Math.min(-40, rssi));
  return 0.12 + ((-40 - clamped) / 50) * 0.8;
}

export default function PresenceRadar({ attendees = [], devices = [], rejected = [] }) {
  const canvasRef = useRef(null);
  const sweepRef = useRef(0);

  const blips = useMemo(() => {
    const marked = attendees.map((a) => ({
      id: `s-${a.studentId}`,
      label: (a.studentName || a.studentRollNo || 'Student').split(' ')[0],
      mac: a.deviceMac || a.mac,
      rssi: a.signalDbm ?? a.rssi ?? null,
      level: a.confidenceLevel || 'MEDIUM',
      kind: 'marked',
      angle: (hashAngle(a.studentId || a.studentName) * Math.PI) / 180,
    }));

    const refused = rejected.map((r) => ({
      id: `r-${r.mac || r.studentId}`,
      label: (r.studentName || r.mac || 'Unknown').split(' ')[0],
      mac: r.mac,
      rssi: r.rssi ?? null,
      level: 'LOW',
      kind: 'refused',
      angle: (hashAngle(r.mac || r.studentId) * Math.PI) / 180,
    }));

    const accounted = new Set(
      [...marked, ...refused].map((b) => (b.mac || '').toUpperCase()).filter(Boolean)
    );

    const unknown = (devices || [])
      .filter((d) => d.mac && !accounted.has(String(d.mac).toUpperCase()))
      .map((d) => ({
        id: `d-${d.mac}`,
        label: String(d.mac).slice(-5),
        mac: d.mac,
        rssi: d.rssi ?? null,
        level: 'LOW',
        kind: 'unknown',
        angle: (hashAngle(d.mac) * Math.PI) / 180,
      }));

    return [...marked, ...refused, ...unknown].map((b) => ({
      ...b,
      radius: radiusFromRssi(b.rssi, b.id),
    }));
  }, [attendees, devices, rejected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let frame;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const css = canvas.getBoundingClientRect();
      const size = Math.min(css.width, css.height);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = size / 2;
      const cy = size / 2;
      const maxR = size * 0.46;

      ctx.clearRect(0, 0, size, size);

      const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, maxR);
      bg.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
      bg.addColorStop(1, 'rgba(10, 10, 26, 0.2)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Range rings, labelled in dBm so the distance axis is readable.
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 1;
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      for (let i = 1; i <= 4; i++) {
        const r = (maxR / 4) * i;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.fillText(`${-40 - i * 12} dBm`, cx, cy - r + 11);
      }
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      sweepRef.current = (sweepRef.current + 0.012) % (Math.PI * 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweepRef.current);
      const sweepGrad = ctx.createLinearGradient(0, 0, maxR, 0);
      sweepGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
      sweepGrad.addColorStop(1, 'rgba(34, 211, 238, 0.35)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxR, -0.45, 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Room AP', cx, cy - 13);

      blips.forEach((b) => {
        const x = cx + Math.cos(b.angle) * b.radius * maxR;
        const y = cy + Math.sin(b.angle) * b.radius * maxR;

        let color;
        if (b.kind === 'refused') color = '#ef4444';
        else if (b.kind === 'unknown') color = 'rgba(148, 163, 184, 0.7)';
        else if (b.level === 'HIGH') color = '#10b981';
        else color = '#f59e0b';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, b.kind === 'unknown' ? 4 : 6, 0, Math.PI * 2);
        ctx.fill();

        // Refused devices get a hollow warning ring.
        ctx.strokeStyle = color;
        ctx.globalAlpha = b.kind === 'refused' ? 0.8 : 0.35;
        ctx.beginPath();
        ctx.arc(x, y, b.kind === 'refused' ? 13 : 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(b.label, x + 10, y + 3);
      });

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [blips]);

  return (
    <div className="radar-wrap">
      <canvas ref={canvasRef} className="radar-canvas" />
      <div className="radar-legend">
        <span><i className="dot high" /> In room, marked</span>
        <span><i className="dot med" /> Marked, medium</span>
        <span><i className="dot refused" /> Refused (wrong AP)</span>
        <span><i className="dot low" /> Unregistered</span>
      </div>
    </div>
  );
}
