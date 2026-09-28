import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentAPI } from '../api/api';
import AttendanceHeatmap from '../components/AttendanceHeatmap';
import PercentRing from '../components/PercentRing';
import ConfidenceBadge from '../components/ConfidenceBadge';

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await studentAPI.getDashboard();
      setDashboard(res.data.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const live = dashboard?.liveSession;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Student Dashboard</h1>
        <p>Your presence story across the semester</p>
      </div>

      {live && (
        <div className={`active-session-banner ${live.alreadyMarked ? '' : 'stat-warning'}`}>
          <div className="session-info">
            <div className="pulse-dot"></div>
            <div>
              <h2>{live.alreadyMarked ? 'You are marked present' : 'Class is live'}</h2>
              <p>
                {live.courseName} ({live.courseCode}) — keep your device on classroom Wi-Fi
              </p>
            </div>
          </div>
          <Link to="/student/devices" className="btn btn-secondary">
            Check device
          </Link>
        </div>
      )}

      <div className="command-grid">
        <div className="card ring-card">
          <PercentRing value={dashboard?.attendancePercent || 0} label="Semester presence" />
          <p className="text-muted">
            {dashboard?.totalClasses || 0} of {dashboard?.totalSessions || 0} sessions
          </p>
        </div>
        <div className="card">
          <div className="card-header">
            <h2>12-week heatmap</h2>
            <Link to="/student/devices">Manage devices →</Link>
          </div>
          <div className="card-pad">
            <AttendanceHeatmap days={dashboard?.heatmap || []} />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.totalClasses || 0}</span>
            <span className="stat-label">Classes attended</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📱</div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.devices?.length || 0}</span>
            <span className="stat-label">Devices</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">
              {dashboard?.devices?.filter((d) => d.approved).length || 0}
            </span>
            <span className="stat-label">Approved</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Attendance history</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Code</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.attendanceHistory?.length > 0 ? (
                dashboard.attendanceHistory.map((record) => (
                  <tr key={record.id}>
                    <td>{record.courseName}</td>
                    <td><code>{record.courseCode}</code></td>
                    <td>
                      <span
                        className={`badge ${
                          record.status === 'AUTO'
                            ? 'badge-success'
                            : record.status === 'MANUAL'
                              ? 'badge-info'
                              : 'badge-warning'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <ConfidenceBadge level={record.confidenceLevel} score={record.confidenceScore} />
                    </td>
                    <td>{new Date(record.markedAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No attendance records yet
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
