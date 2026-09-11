import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { facultyAPI } from '../api/api';

export default function FacultyDashboard() {
  const [activeSession, setActiveSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [sessionForm, setSessionForm] = useState({ courseName: '', courseCode: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const stompClient = useRef(null);

  useEffect(() => {
    loadActiveSession();
    return () => {
      if (stompClient.current) {
        stompClient.current.deactivate();
      }
    };
  }, []);

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
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        console.log('[WS] Connected to live attendance feed');
        client.subscribe(`/topic/session/${sessionId}`, (msg) => {
          const update = JSON.parse(msg.body);
          if (update.type === 'attendance_marked') {
            setAttendees((prev) => {
              // Avoid duplicates
              const exists = prev.find(
                (a) => a.studentId === update.studentId
              );
              if (exists) return prev;
              return [
                ...prev,
                {
                  studentId: update.studentId,
                  studentName: update.studentName,
                  studentRollNo: update.studentRollNo,
                  status: update.status,
                  markedAt: update.markedAt,
                  deviceMac: update.mac,
                },
              ];
            });
          }
        });
      },
      onDisconnect: () => console.log('[WS] Disconnected'),
    });
    client.activate();
    stompClient.current = client;
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await facultyAPI.startSession(sessionForm);
      const session = res.data.data;
      setActiveSession(session);
      setAttendees([]);
      connectWebSocket(session.id);
      setMessage('Session started! Listening for devices...');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await facultyAPI.endSession(activeSession.id);
      if (stompClient.current) stompClient.current.deactivate();
      setActiveSession(null);
      setAttendees([]);
      setMessage('Session ended successfully');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to end session');
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
        <h1>Faculty Dashboard</h1>
        <p>Manage class sessions and view live attendance</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {!activeSession ? (
        /* Start Session Form */
        <div className="card">
          <div className="card-header">
            <h2>Start New Session</h2>
          </div>
          <form className="session-form" onSubmit={handleStartSession}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="courseName">Course Name</label>
                <input
                  id="courseName"
                  type="text"
                  placeholder="e.g. Computer Networks"
                  value={sessionForm.courseName}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, courseName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="courseCode">Course Code</label>
                <input
                  id="courseCode"
                  type="text"
                  placeholder="e.g. CS301"
                  value={sessionForm.courseCode}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, courseCode: e.target.value })
                  }
                />
              </div>
              <button type="submit" className="btn btn-primary">
                🚀 Start Session
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Active Session View */
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
              </div>
            </div>
            <button className="btn btn-danger" onClick={handleEndSession}>
              ⏹ End Session
            </button>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card stat-live">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <span className="stat-value">{attendees.length}</span>
                <span className="stat-label">Students Present</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🤖</div>
              <div className="stat-content">
                <span className="stat-value">
                  {attendees.filter((a) => a.status === 'AUTO').length}
                </span>
                <span className="stat-label">Auto-Detected</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✋</div>
              <div className="stat-content">
                <span className="stat-value">
                  {attendees.filter((a) => a.status === 'MANUAL').length}
                </span>
                <span className="stat-label">Manual</span>
              </div>
            </div>
          </div>

          {/* Live Attendee List */}
          <div className="card">
            <div className="card-header">
              <h2>
                <span className="pulse-dot-sm"></span> Live Attendance
              </h2>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th>Method</th>
                    <th>Device</th>
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
                            className={`badge ${
                              a.status === 'AUTO' ? 'badge-success' : 'badge-info'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td><code>{a.deviceMac || '—'}</code></td>
                        <td>
                          {a.markedAt
                            ? new Date(a.markedAt).toLocaleTimeString()
                            : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        <div className="empty-pulse">
                          <div className="pulse-ring"></div>
                          <span>Waiting for students to connect...</span>
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
