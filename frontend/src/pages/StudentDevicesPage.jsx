import { useState, useEffect } from 'react';
import { studentAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

export default function StudentDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ macAddress: '', deviceName: '' });
  const toast = useToast();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const res = await studentAPI.getDevices();
      setDevices(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    try {
      await studentAPI.registerDevice(deviceForm);
      toast.success('Device registered — waiting for admin approval');
      setDeviceForm({ macAddress: '', deviceName: '' });
      setShowDeviceForm(false);
      loadDevices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register device');
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm('Remove this device?')) return;
    try {
      await studentAPI.removeDevice(deviceId);
      toast.success('Device removed');
      loadDevices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove device');
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
        <h1>My devices</h1>
        <p>Only an approved MAC can auto-mark you on the classroom LAN</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Registered NICs</h2>
          <button className="btn btn-primary" onClick={() => setShowDeviceForm(!showDeviceForm)}>
            {showDeviceForm ? 'Cancel' : '+ Register device'}
          </button>
        </div>

        {showDeviceForm && (
          <form className="inline-form" onSubmit={handleRegisterDevice}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="macAddress">MAC address</label>
                <input
                  id="macAddress"
                  type="text"
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={deviceForm.macAddress}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, macAddress: e.target.value })
                  }
                  required
                  pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
                />
              </div>
              <div className="form-group">
                <label htmlFor="deviceName">Device name</label>
                <input
                  id="deviceName"
                  type="text"
                  placeholder="e.g. My Phone"
                  value={deviceForm.deviceName}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, deviceName: e.target.value })
                  }
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </div>
          </form>
        )}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>MAC</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {devices.length > 0 ? (
                devices.map((device) => (
                  <tr key={device.id}>
                    <td>{device.deviceName || 'Unnamed'}</td>
                    <td><code>{device.macAddress}</code></td>
                    <td>{device.vendor || '—'}</td>
                    <td>
                      <span className={`badge ${device.approved ? 'badge-success' : 'badge-warning'}`}>
                        {device.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>{new Date(device.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveDevice(device.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No devices yet — register the phone you bring to class.
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
