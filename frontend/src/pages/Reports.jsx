import { useState } from 'react';
import { reportAPI } from '../api/api';

export default function Reports() {
  const [filters, setFilters] = useState({ course: '', date: '' });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await reportAPI.getAttendance(filters);
      setRecords(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Student Name',
      'Roll No',
      'Course',
      'Code',
      'Status',
      'Date/Time',
      'Faculty',
    ];
    const rows = records.map((r) => [
      r.studentName,
      r.studentRollNo || '',
      r.courseName,
      r.courseCode || '',
      r.status,
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

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Attendance Reports</h1>
        <p>Filter and export attendance data</p>
      </div>

      {/* Filter Form */}
      <div className="card">
        <div className="card-header">
          <h2>🔍 Filter</h2>
        </div>
        <form className="filter-form" onSubmit={handleSearch}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="filterCourse">Course Code</label>
              <input
                id="filterCourse"
                type="text"
                placeholder="e.g. CS301"
                value={filters.course}
                onChange={(e) =>
                  setFilters({ ...filters, course: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="filterDate">Date</label>
              <input
                id="filterDate"
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            {records.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={exportToCSV}
              >
                📥 Export CSV
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results */}
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
                  <th>Roll No</th>
                  <th>Course</th>
                  <th>Code</th>
                  <th>Method</th>
                  <th>Date & Time</th>
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
                      <td><code>{r.courseCode || '—'}</code></td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === 'AUTO'
                              ? 'badge-success'
                              : r.status === 'MANUAL'
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>{new Date(r.markedAt).toLocaleString()}</td>
                      <td>{r.facultyName || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-state">
                      No records found for this filter
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
