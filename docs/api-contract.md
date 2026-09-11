# Smart Attendance — API Contract

## Base URL
```
http://localhost:8080/api
```

## Authentication
All protected endpoints require a JWT Bearer token:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints (Public)

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "STUDENT",
  "studentId": "CS2024001"
}
```

**Response (200):**
```json
{
  "token": "eyJ...",
  "type": "Bearer",
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "STUDENT"
}
```

### POST /auth/login
**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as register.

---

## Student Endpoints (ROLE_STUDENT)

### GET /student/dashboard
Returns devices and attendance history.

### GET /student/attendance-history
Returns list of attendance records.

### POST /student/device/register
Register a new device MAC address.
```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "deviceName": "My Phone"
}
```

### GET /student/devices
List student's registered devices.

---

## Faculty Endpoints (ROLE_FACULTY)

### POST /faculty/session/start
Start a class session.
```json
{
  "courseName": "Computer Networks",
  "courseCode": "CS301"
}
```

### POST /faculty/session/{id}/end
End an active session.

### GET /faculty/session/active
Get the currently active session with attendees.

### GET /faculty/session/{id}/live
Get live attendance for a session.

### POST /faculty/session/{sessionId}/mark/{studentId}
Manually mark a student present.

### GET /faculty/sessions
Get session history.

---

## Admin Endpoints (ROLE_ADMIN)

### GET /admin/devices/pending
List devices pending approval.

### POST /admin/devices/{id}/approve
Approve a device.

### POST /admin/devices/{id}/reject
Reject (delete) a device.

### GET /admin/users
List all users.

---

## Report Endpoints (ROLE_FACULTY, ROLE_ADMIN)

### GET /reports/attendance?course={code}&date={YYYY-MM-DD}
Get filtered attendance report.

---

## WebSocket Endpoints

### STOMP /ws (SockJS)
Connect with SockJS for live updates.

**Subscribe:** `/topic/session/{sessionId}`

**Event payload:**
```json
{
  "type": "attendance_marked",
  "sessionId": 1,
  "studentId": 5,
  "studentName": "John Doe",
  "studentRollNo": "CS2024001",
  "mac": "AA:BB:CC:DD:EE:FF",
  "status": "AUTO",
  "markedAt": "2024-01-15T10:30:00"
}
```

---

## Presence Service (Node.js)

### REST: GET http://localhost:3001/presence/current
Returns currently detected devices on the network.

### REST: GET http://localhost:3001/presence/health
Health check endpoint.

### WebSocket: ws://localhost:3002
Raw WebSocket for real-time presence events.
