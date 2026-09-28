import { useEffect, useState } from 'react';
import { adminAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = { name: '', bssid: '', ssid: '', minRssiDbm: -70 };

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await adminAPI.getClassrooms();
      setClassrooms(res.data.data || []);
    } catch (err) {
      toast.error('Could not load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.createClassroom({
        ...form,
        minRssiDbm: Number(form.minRssiDbm),
      });
      toast.success(`${form.name} registered`);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not register classroom');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room) => {
    try {
      await adminAPI.deleteClassroom(room.id);
      toast.success(`${room.name} removed`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove classroom');
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Classrooms &amp; Access Points</h1>
        <p>
          Each room is identified by its access point BSSID. Sessions bound to a room only
          mark students whose devices are associated with that access point.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Register a room</h2>
        </div>
        <form className="session-form" onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Room name</label>
              <input
                id="name"
                type="text"
                placeholder="CNT Lab 401"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="bssid">Access point BSSID</label>
              <input
                id="bssid"
                type="text"
                placeholder="A4:83:E7:C0:FF:EE"
                value={form.bssid}
                onChange={(e) => setForm({ ...form, bssid: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="ssid">SSID</label>
              <input
                id="ssid"
                type="text"
                placeholder="CAMPUS-WIFI"
                value={form.ssid}
                onChange={(e) => setForm({ ...form, ssid: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="minRssiDbm">Signal cutoff (dBm)</label>
              <input
                id="minRssiDbm"
                type="number"
                max="-30"
                min="-95"
                value={form.minRssiDbm}
                onChange={(e) => setForm({ ...form, minRssiDbm: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Register'}
            </button>
          </div>
          <p className="form-hint">
            Find the BSSID with <code>iw dev wlan0 link</code> on Linux or{' '}
            <code>wdutil info</code> on macOS, run from a machine inside the room. Devices
            weaker than the cutoff are treated as outside.
          </p>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Registered rooms</h2>
          <span className="text-muted">{classrooms.length} total</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Room</th>
                <th>BSSID</th>
                <th>SSID</th>
                <th>Signal cutoff</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classrooms.length > 0 ? (
                classrooms.map((room, idx) => (
                  <tr key={room.id}>
                    <td>{idx + 1}</td>
                    <td className="student-name">{room.name}</td>
                    <td><code>{room.bssid}</code></td>
                    <td>{room.ssid || '—'}</td>
                    <td>{room.minRssiDbm} dBm</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(room)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No rooms yet. Register one above to enable room-level attendance.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
