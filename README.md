# SmartAttend — Network-Based Attendance System

SmartAttend is an automated, real-time attendance management system that uses local network presence detection (ARP table scanning) combined with WebSocket event streaming to seamlessly verify student attendance during active class sessions without requiring dedicated biometric or RFID hardware.

> **New to this codebase?** Read [`docs/FINAL_PROJECT_ANALYSIS.md`](docs/FINAL_PROJECT_ANALYSIS.md) —
> a complete internals walkthrough covering the detection pipeline, the confidence
> scoring algorithm, the database schema, every API endpoint, the security model, and an
> honest account of the system's limitations. Payload examples live in
> [`docs/api-contract.md`](docs/api-contract.md).
>
> For sharing or submission, the same analysis is available as
> [`FINAL_PROJECT_ANALYSIS.pdf`](docs/FINAL_PROJECT_ANALYSIS.pdf) (16 pages, A4) and
> [`FINAL_PROJECT_ANALYSIS.html`](docs/FINAL_PROJECT_ANALYSIS.html). Regenerate both with
> `python3 docs/build-analysis-doc.py` after editing the Markdown.

---

## 🏛️ System Architecture

```
[ Student Device (Wi-Fi) ]
           │
           ▼
[ Presence Service (Node.js) ]  ───(ws://:3002)───► [ Spring Boot Backend (:8080) ]
  • Scans ARP table (arp -a)                          • Matches device MAC to student
  • Broadcasts connection events                      • Validates active faculty session
                                                      • Persists attendance (AUTO/MANUAL)
                                                               │
                                                               ▼ (STOMP /ws)
                                                    [ React Frontend (:5173) ]
                                                      • Live Faculty Attendee Feed
                                                      • Student Dashboard & MAC Registration
                                                      • Admin Device Approval Queue
                                                      • Attendance Reporting & CSV Export
```

---

## 🧪 Demo accounts (seeded on first empty database)

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | `admin@smartattend.edu` | `Demo@123` |
| Faculty | `faculty@smartattend.edu` | `Demo@123` |
| Student | `student1@smartattend.edu` | `Demo@123` |

Open **Faculty → Presence Command Center**, start a session, then **Run demo classroom** to inject ARP events without lab Wi-Fi.

Swagger UI: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ (`brew install node` on macOS)
- **Java**: JDK 17+ (`brew install openjdk@17` on macOS)
- **Maven**: Optional (bundled Maven Wrapper `./mvnw` is included)
- **MySQL**: Port 3306 (optional; the system automatically falls back to an embedded in-memory H2 database if MySQL is not running)

---

### macOS / Linux

1. **Start all services**:
   ```bash
   ./start-all.sh
   ```
2. **Stop all services**:
   ```bash
   ./stop-all.sh
   ```

### Windows

1. **Start all services**:
   ```bat
   start-all.bat
   ```
2. **Stop all services**:
   ```bat
   stop-all.bat
   ```

---

## 🌐 Service URLs

| Service | Protocol / Port | URL |
| :--- | :--- | :--- |
| **Frontend Web App** | HTTP `:5173` | [http://localhost:5173](http://localhost:5173) |
| **Backend REST API** | HTTP `:8080` | [http://localhost:8080/api](http://localhost:8080/api) |
| **Backend STOMP WebSocket** | SockJS `:8080` | `http://localhost:8080/ws` |
| **H2 Database Console** | HTTP `:8080` | [http://localhost:8080/h2-console](http://localhost:8080/h2-console) (when running with H2) |
| **Presence REST API** | HTTP `:3001` | [http://localhost:3001/presence/health](http://localhost:3001/presence/health) |
| **Presence WebSocket** | WS `:3002` | `ws://localhost:3002` |

---

## 📋 End-to-End Workflow

1. **Register Users**:
   - Register an **Admin** user (`role: ADMIN`).
   - Register a **Faculty** user (`role: FACULTY`).
   - Register a **Student** user (`role: STUDENT`) with their Roll Number.
2. **Device Registration & Approval**:
   - Student logs in $\to$ navigates to **Devices** $\to$ enters their device MAC address (`AA:BB:CC:DD:EE:FF`).
   - Admin logs in $\to$ navigates to **Pending Devices** $\to$ clicks **Approve**.
3. **Class Session & Live Attendance**:
   - Faculty logs in $\to$ starts a session for a course (e.g., `Computer Networks (CS301)`).
   - When the student's device connects to the Wi-Fi network, the Node.js presence scanner detects the MAC in the ARP table and notifies the backend.
   - The backend records attendance (`AUTO`) and broadcasts a WebSocket event to the faculty dashboard.
   - The faculty dashboard updates in real-time.
4. **Reports & Exports**:
   - Faculty/Admin navigates to **Reports** $\to$ filters by Course Code and Date $\to$ exports attendance as CSV.

---

## 📁 Directory Structure

```
CP-Smart-Attendance/
├── backend/                  # Spring Boot 3.3.2 Backend
│   ├── src/main/java/        # Controllers, Services, Repositories, Models, Security
│   ├── src/main/resources/   # application.properties, application-h2.properties
│   ├── mvnw / mvnw.cmd       # Maven wrapper scripts
│   └── pom.xml               # Java dependencies (Spring Boot, JWT, WebSockets, MySQL, H2)
├── frontend/                 # React 19 + Vite Frontend
│   ├── src/pages/            # Login, Register, Student, Faculty, Admin, Reports
│   ├── src/components/       # Navbar, ProtectedRoute
│   ├── src/context/          # AuthContext
│   └── src/api/              # Axios API client
├── presence-service/         # Node.js Network Scanner & WebSocket Server
│   ├── src/index.js          # REST & WebSocket server
│   ├── src/scanner.js        # ARP table parser
│   └── src/config.js         # Configuration settings
├── docs/                     # Documentation & API contract
│   └── api-contract.md       # Detailed REST and WebSocket API endpoints
├── start-all.sh / .bat       # Unified launch scripts
├── stop-all.sh / .bat        # Unified teardown scripts
└── README.md
```
