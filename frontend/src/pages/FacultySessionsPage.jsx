import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { facultyAPI } from '../api/api';

export default function FacultySessionsPage() {
  const [activeSession, setActiveSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    courseName: '',
    courseCode: '',
    classroomId: '',
  });
  const [classrooms, setClassrooms] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSessionsData();
  }, []);

  const loadSessionsData = async () => {
    try {
      const [activeRes, historyRes, roomsRes] = await Promise.all([
        facultyAPI.getActiveSession().catch(() => ({ data: { data: null } })),
        facultyAPI.getSessions().catch(() => ({ data: { data: [] } })),
        facultyAPI.getClassrooms().catch(() => ({ data: { data: [] } })),
      ]);
      setActiveSession(activeRes.data.data);
      setSessionHistory(historyRes.data.data || []);
      const rooms = roomsRes.data.data || [];
      setClassrooms(rooms);
      if (rooms.length > 0) {
        setSessionForm((prev) => ({ ...prev, classroomId: String(rooms[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load session data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      await facultyAPI.startSession({
        ...sessionForm,
        classroomId: sessionForm.classroomId ? Number(sessionForm.classroomId) : null,
      });
      navigate('/faculty');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to start session');
      setSubmitting(false);
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
        <h1>Class Sessions</h1>
        <p>Start new attendance sessions and review session records</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {activeSession ? (
        /* Session Already Active */
        <div className="card">
          <div className="empty-state" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div className="pulse-dot" style={{ margin: '0 auto 1rem', width: '16px', height: '16px' }}></div>
            <h2>A session is already running</h2>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', margin: '0.5rem 0 1.5rem' }}>
              Active course: <strong style={{ color: 'var(--text-primary, #f1f5f9)' }}>{activeSession.courseName}</strong> ({activeSession.courseCode || 'No Code'})
            </p>
            <Link to="/faculty" className="btn btn-primary">
              View Live Attendance
            </Link>
          </div>
        </div>
      ) : (
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
              <div className="form-group">
                <label htmlFor="classroomId">Classroom</label>
                <select
                  id="classroomId"
                  value={sessionForm.classroomId}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, classroomId: e.target.value })
                  }
                >
                  <option value="">Not bound to a room</option>
                  {classrooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} — {room.bssid}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Starting...' : '🚀 Start Session'}
              </button>
            </div>
            <p className="form-hint">
              Binding a room makes attendance require proximity to that access point.
              Without it, any device on the campus network can be marked present.
            </p>
          </form>
        </div>
      )}

      {/* Session History Table */}
      {sessionHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Session History</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Course Name</th>
                  <th>Code</th>
                  <th>Room / AP</th>
                  <th>Status</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                </tr>
              </thead>
              <tbody>
                {sessionHistory.map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td>{idx + 1}</td>
                    <td className="student-name">{s.courseName}</td>
                    <td><code>{s.courseCode || '—'}</code></td>
                    <td>
                      {s.classroom ? (
                        <div className="mono-stack">
                          <span>{s.classroom.name}</span>
                          <code>{s.classroom.bssid}</code>
                        </div>
                      ) : (
                        <span className="text-muted">Unbound</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${s.active ? 'badge-success' : 'badge-info'}`}>
                        {s.active ? 'ACTIVE' : 'COMPLETED'}
                      </span>
                    </td>
                    <td>{s.startTime ? new Date(s.startTime).toLocaleString() : '—'}</td>
                    <td>{s.endTime ? new Date(s.endTime).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
