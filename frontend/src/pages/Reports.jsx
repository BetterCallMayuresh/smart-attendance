import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

export default function Reports() {
  const [filters, setFilters] = useState({ course: '', date: '' });
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await reportAPI.getAnalytics();
        setAnalytics(res.data.data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await reportAPI.getAttendance(filters);
      setRecords(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (records.length === 0) return;
    const headers = ['Student Name', 'PRN', 'Course', 'Code', 'Status', 'Confidence', 'Date/Time', 'Faculty'];
    const rows = records.map((r) => [
      r.studentName,
      r.studentRollNo || '',
      r.courseName,
      r.courseCode || '',
      r.status,
      r.confidenceLevel || '',
      r.markedAt,
      r.facultyName || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `attendance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SmartAttend — Attendance report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [['Student', 'PRN', 'Course', 'Status', 'Conf.', 'When']],
      body: records.map((r) => [
        r.studentName,
        r.studentRollNo || '',
        r.courseCode || r.courseName,
        r.status,
        r.confidenceLevel || '',
        r.markedAt ? new Date(r.markedAt).toLocaleString() : '',
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`attendance_${Date.now()}.pdf`);
  };

  const methodData = analytics
    ? Object.entries(analytics.methods || {}).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Attendance intelligence</h1>
        <p>Trends, defaulters under 75%, and exports</p>
      </div>

      {analytics && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-value">{analytics.totalRecords}</span>
                <span className="stat-label">Marks</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-value">{analytics.totalSessions}</span>
                <span className="stat-label">Sessions</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-value">{analytics.averageConfidence}</span>
                <span className="stat-label">Avg confidence</span>
              </div>
            </div>
            <div className="stat-card stat-warning">
              <div className="stat-content">
                <span className="stat-value">{analytics.defaulters?.length || 0}</span>
                <span className="stat-label">Below 75%</span>
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="card">
              <div className="card-header"><h2>Daily marks</h2></div>
              <div className="chart-pad">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={analytics.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="date" hide />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>By course</h2></div>
              <div className="chart-pad">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={analytics.byCourse || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="course" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Marking method</h2></div>
              <div className="chart-pad">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                      {methodData.map((entry, i) => (
                        <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>At-risk students (&lt; 75%)</h2></div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>PRN</th>
                    <th>Attended</th>
                    <th>Sessions</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.defaulters || []).length ? (
                    analytics.defaulters.map((d) => (
                      <tr key={d.studentId}>
                        <td>{d.studentName}</td>
                        <td><code>{d.studentRollNo}</code></td>
                        <td>{d.attended}</td>
                        <td>{d.totalSessions}</td>
                        <td>{d.percent}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">Nobody below the threshold</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Filter & export</h2>
        </div>
        <form className="filter-form" onSubmit={handleSearch}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="filterCourse">Course code</label>
              <input
                id="filterCourse"
                type="text"
                placeholder="e.g. CS301"
                value={filters.course}
                onChange={(e) => setFilters({ ...filters, course: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="filterDate">Date</label>
              <input
                id="filterDate"
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            {records.length > 0 && (
              <>
                <button type="button" className="btn btn-secondary" onClick={exportToCSV}>
                  CSV
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportPdf}>
                  PDF
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {searched && (
        <div className="card">
          <div className="card-header">
            <h2>Results ({records.length})</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>PRN</th>
                  <th>Course</th>
                  <th>Method</th>
                  <th>Confidence</th>
                  <th>When</th>
                  <th>Faculty</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map((r, idx) => (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td>{r.studentName}</td>
                      <td><code>{r.studentRollNo || '—'}</code></td>
                      <td>{r.courseName}</td>
                      <td>
                        <span className={`badge ${r.status === 'AUTO' ? 'badge-success' : 'badge-info'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.confidenceLevel || '—'}</td>
                      <td>{new Date(r.markedAt).toLocaleString()}</td>
                      <td>{r.facultyName || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-state">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
