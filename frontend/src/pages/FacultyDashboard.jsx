import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { facultyAPI, WS_URL } from '../api/api';
import PresenceRadar from '../components/PresenceRadar';
import ConfidenceBadge from '../components/ConfidenceBadge';
import { useToast } from '../context/ToastContext';

export default function FacultyDashboard() {
  const [activeSession, setActiveSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [devices, setDevices] = useState([]);
  const [wireless, setWireless] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [manualPRN, setManualPRN] = useState('');
  const stompClient = useRef(null);
  const toast = useToast();

  useEffect(() => {
    loadActiveSession();
    return () => {
      if (stompClient.current) stompClient.current.deactivate();
    };
  }, []);

  useEffect(() => {
    if (!activeSession) return undefined;
    const tick = async () => {
      try {
        const res = await facultyAPI.getLivePresence();
        const payload = res.data.data || {};
        setDevices(payload.devices || []);
        setWireless(payload.wireless || null);
      } catch {
        /* presence service is optional */
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [activeSession]);

  const loadActiveSession = async () => {
    try {
      const res = await facultyAPI.getActiveSession();
      const data = res.data.data;
      if (data) {
        setActiveSession(data);
        setAttendees(data.attendees || []);
        connectWebSocket(data.id);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (sessionId) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      onConnect: () => {
        client.subscribe(`/topic/session/${sessionId}`, (msg) => {
          const update = JSON.parse(msg.body);

          if (update.type === 'attendance_marked') {
            setRejected((prev) => prev.filter((r) => r.studentId !== update.studentId));
            setAttendees((prev) => {
              if (prev.some((a) => a.studentId === update.studentId)) return prev;
              return [
                ...prev,
                {
                  studentId: update.studentId,
                  studentName: update.studentName,
                  studentRollNo: update.studentRollNo,
                  status: update.status,
                  markedAt: update.markedAt,
                  deviceMac: update.mac,
                  deviceIp: update.ip,
                  observedBssid: update.bssid,
                  signalDbm: update.rssi,
                  confidenceScore: update.confidenceScore,
                  confidenceLevel: update.confidenceLevel,
                  confidenceReasons: Array.isArray(update.confidenceReasons)
                    ? update.confidenceReasons.join('; ')
                    : update.confidenceReasons,
                },
              ];
            });
          }

          if (update.type === 'presence_rejected') {
            setRejected((prev) => {
              if (prev.some((r) => r.mac === update.mac)) return prev;
              return [
                ...prev,
                {
                  studentId: update.studentId,
                  studentName: update.studentName,
                  studentRollNo: update.studentRollNo,
                  mac: update.mac,
                  ip: update.ip,
                  bssid: update.bssid,
                  rssi: update.rssi,
                  confidenceScore: update.confidenceScore,
                  confidenceLevel: update.confidenceLevel,
                  reasons: Array.isArray(update.confidenceReasons)
                    ? update.confidenceReasons
                    : [update.confidenceReasons].filter(Boolean),
                  seenAt: update.seenAt,
                },
              ];
            });
          }
        });
      },
    });
    client.activate();
    stompClient.current = client;
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await facultyAPI.endSession(activeSession.id);
      if (stompClient.current) stompClient.current.deactivate();
      setActiveSession(null);
      setAttendees([]);
      setRejected([]);
      toast.success('Session ended');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end session');
    }
  };

  const handleManualMark = async () => {
    if (!activeSession) {
      toast.error('No active session');
      return;
    }
    if (!manualPRN.trim()) {
      toast.error('Enter a PRN');
      return;
    }
    try {
      await facultyAPI.manualMarkByPRN(activeSession.id, manualPRN.trim());
      toast.success('Student marked present');
      setManualPRN('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark student');
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await facultyAPI.simulateClassroom({ count: 10, intervalMs: 1200, outsideCount: 2 });
      toast.success('Demo stream started: 8 in the room, 2 in the corridor');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Simulator unavailable — is presence-service running?'
      );
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const room = activeSession?.classroom;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Presence Command Center</h1>
        <p>Room-level attendance proven against the classroom access point</p>
      </div>

      {!activeSession ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
            <h2>No active session</h2>
            <p className="text-muted" style={{ margin: '0.5rem 0 1.5rem' }}>
              Start a session and bind it to a room, then run the demo classroom.
            </p>
            <Link to="/faculty/sessions" className="btn btn-primary">
              Go to Sessions
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="active-session-banner">
            <div className="session-info">
              <div className="pulse-dot"></div>
              <div>
                <h2>{activeSession.courseName}</h2>
                <p>
                  {activeSession.courseCode} • Started{' '}
                  {new Date(activeSession.startTime).toLocaleTimeString()}
                </p>
                {room ? (
                  <p className="room-line">
                    {room.name} • AP <code>{room.bssid}</code> • cutoff {room.minRssiDbm} dBm
                  </p>
                ) : (
                  <p className="room-line warn">
                    Not bound to a room — network presence only, cannot prove room attendance
                  </p>
                )}
              </div>
            </div>
            <div className="banner-actions">
              <button className="btn btn-secondary" onClick={handleSimulate} disabled={simulating}>
                {simulating ? 'Injecting…' : '▶ Run demo classroom'}
              </button>
              <button className="btn btn-danger" onClick={handleEndSession}>
                End Session
              </button>
            </div>
          </div>

          <div className="command-grid">
            <div className="card radar-card">
              <div className="card-header">
                <h2>Network presence radar</h2>
                <span className="text-muted">
                  {devices.length} ARP entries
                  {wireless?.bssid ? ` • scanner on ${wireless.bssid}` : ''}
                </span>
              </div>
              <PresenceRadar attendees={attendees} devices={devices} rejected={rejected} />
            </div>

            <div>
              <div className="stats-grid compact">
                <div className="stat-card stat-live">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <span className="stat-value">{attendees.length}</span>
                    <span className="stat-label">Marked present</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🛡</div>
                  <div className="stat-content">
                    <span className="stat-value">
                      {attendees.filter((a) => a.confidenceLevel === 'HIGH').length}
                    </span>
                    <span className="stat-label">Room-verified</span>
                  </div>
                </div>
                <div className="stat-card stat-warning">
                  <div className="stat-icon">🚫</div>
                  <div className="stat-content">
                    <span className="stat-value">{rejected.length}</span>
                    <span className="stat-label">Seen but refused</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>Manual mark</h2>
                </div>
                <div className="inline-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>PRN</label>
                      <input
                        type="text"
                        placeholder="CS2024D01"
                        value={manualPRN}
                        onChange={(e) => setManualPRN(e.target.value)}
                      />
                    </div>
                    <button className="btn btn-primary" onClick={handleManualMark}>
                      Mark present
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {rejected.length > 0 && (
            <div className="card refused-card">
              <div className="card-header">
                <h2>Seen on the network, not marked</h2>
                <span className="text-muted">
                  Below the confidence cutoff — no attendance was recorded
                </span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Access point</th>
                      <th>Signal</th>
                      <th>Score</th>
                      <th>Why it was refused</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejected.map((r) => (
                      <tr key={r.mac} className="fade-in-row">
                        <td className="student-name">{r.studentName}</td>
                        <td><code>{r.bssid || '—'}</code></td>
                        <td>{r.rssi != null ? `${r.rssi} dBm` : '—'}</td>
                        <td>
                          <ConfidenceBadge level={r.confidenceLevel} score={r.confidenceScore} />
                        </td>
                        <td className="reason-cell">{r.reasons.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h2>
                <span className="pulse-dot-sm"></span> Live feed
              </h2>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>PRN</th>
                    <th>Method</th>
                    <th>Confidence</th>
                    <th>AP / Signal</th>
                    <th>IP / MAC</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.length > 0 ? (
                    attendees.map((a, idx) => (
                      <tr key={a.studentId} className="fade-in-row">
                        <td>{idx + 1}</td>
                        <td className="student-name">{a.studentName}</td>
                        <td><code>{a.studentRollNo || '—'}</code></td>
                        <td>
                          <span
                            className={`badge ${a.status === 'AUTO' ? 'badge-success' : 'badge-info'}`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <ConfidenceBadge level={a.confidenceLevel} score={a.confidenceScore} />
                        </td>
                        <td>
                          <div className="mono-stack">
                            <code>{a.observedBssid || '—'}</code>
                            <span className="text-muted">
                              {a.signalDbm != null ? `${a.signalDbm} dBm` : 'no signal data'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="mono-stack">
                            <code>{a.deviceIp || '—'}</code>
                            <code>{a.deviceMac || '—'}</code>
                          </div>
                        </td>
                        <td>{a.markedAt ? new Date(a.markedAt).toLocaleTimeString() : '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="empty-state">
                        <div className="empty-pulse">
                          <div className="pulse-ring"></div>
                          <span>Waiting for ARP hits — or run the demo classroom.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
