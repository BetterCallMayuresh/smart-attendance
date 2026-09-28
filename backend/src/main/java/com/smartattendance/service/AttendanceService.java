package com.smartattendance.service;

import com.smartattendance.model.*;
import com.smartattendance.presence.MacVendor;
import com.smartattendance.presence.PresenceConfidence;
import com.smartattendance.presence.PresenceSightingStore;
import com.smartattendance.repository.AttendanceRecordRepository;
import com.smartattendance.repository.SessionRepository;
import com.smartattendance.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRecordRepository attendanceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private DeviceService deviceService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private PresenceSightingStore sightingStore;

    @Value("${app.presence.campus-subnets:10.0.0.0/8,172.16.0.0/12,192.168.0.0/16}")
    private String campusSubnets;

    /** Attendance is refused below this score, so weak evidence never becomes a mark. */
    @Value("${app.presence.min-confidence:50}")
    private int minConfidence;

    public void processPresenceEvent(String mac, String ip) {
        processPresenceEvent(mac, ip, null, null);
    }

    /**
     * Handle a MAC seen on the network.
     *
     * @param bssid access point the device is associated with, if the scanner knows it
     * @param rssi  signal strength in dBm, if per-station data is available
     */
    @Transactional
    public void processPresenceEvent(String mac, String ip, String bssid, Integer rssi) {
        PresenceSightingStore.Sighting previous = sightingStore.record(mac, ip);
        boolean ipChangedRecently = previous != null
                && previous.ip() != null
                && ip != null
                && !previous.ip().equals(ip)
                && previous.seenAt().isAfter(Instant.now().minusSeconds(120));

        Optional<User> studentOpt = deviceService.findStudentByApprovedMac(mac);
        if (studentOpt.isEmpty()) {
            return;
        }

        User student = studentOpt.get();
        List<String> cidrs = campusCidrs();

        List<Session> activeSessions = sessionService.getAllActiveSessions();
        activeSessions.sort(Comparator.comparing(
                Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        for (Session session : activeSessions) {
            if (attendanceRepository.existsBySessionAndStudent(session, student)) {
                continue;
            }

            LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);
            boolean markedRecentlyInOtherSession = attendanceRepository
                    .findByStudentAndDateRange(student, tenMinutesAgo, LocalDateTime.now())
                    .stream()
                    .anyMatch(r -> !r.getSession().getId().equals(session.getId()));

            if (markedRecentlyInOtherSession) {
                continue;
            }

            Classroom room = session.getClassroom();
            PresenceConfidence.Result confidence = PresenceConfidence.score(
                    new PresenceConfidence.Signals(
                            true,
                            ip,
                            cidrs,
                            Instant.now(),
                            Instant.now(),
                            ipChangedRecently,
                            false,
                            bssid,
                            room != null ? room.getBssid() : null,
                            rssi,
                            room != null ? room.effectiveMinRssi() : Classroom.DEFAULT_MIN_RSSI_DBM));

            if (confidence.score() < minConfidence) {
                System.out.println("[Attendance] REFUSED " + student.getName()
                        + " (" + mac + ") score=" + confidence.score()
                        + " reasons=" + confidence.reasons());
                broadcastRejection(session.getId(), student, mac, ip, bssid, rssi, confidence);
                break;
            }

            AttendanceRecord record = AttendanceRecord.builder()
                    .session(session)
                    .student(student)
                    .status("AUTO")
                    .deviceMac(mac)
                    .deviceIp(ip)
                    .observedBssid(bssid)
                    .signalDbm(rssi)
                    .confidenceScore(confidence.score())
                    .confidenceLevel(confidence.level())
                    .confidenceReasons(String.join("; ", confidence.reasons()))
                    .build();

            attendanceRepository.save(record);

            System.out.println("[Attendance] AUTO marked: " + student.getName()
                    + " in session " + session.getCourseName()
                    + " via MAC " + mac
                    + " confidence=" + confidence.level() + "(" + confidence.score() + ")");

            broadcastAttendance(session.getId(), student, record, mac, ip, "AUTO", confidence);
            break;
        }
    }

    private List<String> campusCidrs() {
        return Arrays.stream(campusSubnets.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    public AttendanceRecord manualMark(Long sessionId, Long studentId, String facultyEmail) {
        Session session = requireActiveOwnedSession(sessionId, facultyEmail);
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        return saveManual(session, student);
    }

    @Transactional
    public AttendanceRecord manualMarkByPRN(Long sessionId, String prn, String facultyEmail) {
        Session session = requireActiveOwnedSession(sessionId, facultyEmail);
        User student = userRepository.findByStudentId(prn)
                .orElseThrow(() -> new RuntimeException("Student not found with PRN: " + prn));

        Optional<AttendanceRecord> existing =
                attendanceRepository.findBySessionAndStudent(session, student);
        if (existing.isPresent()) {
            throw new RuntimeException("Student already marked present");
        }
        return saveManual(session, student);
    }

    private AttendanceRecord saveManual(Session session, User student) {
        PresenceConfidence.Result confidence = PresenceConfidence.manualMark();
        Optional<AttendanceRecord> existing =
                attendanceRepository.findBySessionAndStudent(session, student);
        if (existing.isPresent()) {
            AttendanceRecord record = existing.get();
            record.setStatus("OVERRIDE");
            record.setMarkedAt(LocalDateTime.now());
            record.setConfidenceScore(confidence.score());
            record.setConfidenceLevel(confidence.level());
            record.setConfidenceReasons(String.join("; ", confidence.reasons()));
            AttendanceRecord saved = attendanceRepository.save(record);
            broadcastAttendance(session.getId(), student, saved, saved.getDeviceMac(),
                    saved.getDeviceIp(), "OVERRIDE", confidence);
            return saved;
        }

        AttendanceRecord record = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .status("MANUAL")
                .confidenceScore(confidence.score())
                .confidenceLevel(confidence.level())
                .confidenceReasons(String.join("; ", confidence.reasons()))
                .build();

        AttendanceRecord saved = attendanceRepository.save(record);
        broadcastAttendance(session.getId(), student, saved, null, null, "MANUAL", confidence);
        return saved;
    }

    private Session requireActiveOwnedSession(Long sessionId, String facultyEmail) {
        Session session = sessionService.getAllActiveSessions().stream()
                .filter(s -> s.getId().equals(sessionId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Active session not found"));

        if (!session.getFaculty().getEmail().equals(facultyEmail)) {
            throw new RuntimeException("Not authorized for this session");
        }
        return session;
    }

    private void broadcastAttendance(
            Long sessionId,
            User student,
            AttendanceRecord record,
            String mac,
            String ip,
            String status,
            PresenceConfidence.Result confidence) {
        Map<String, Object> update = new LinkedHashMap<>();
        update.put("type", "attendance_marked");
        update.put("sessionId", sessionId);
        update.put("studentId", student.getId());
        update.put("studentName", student.getName());
        update.put("studentRollNo", student.getStudentId());
        update.put("mac", mac);
        update.put("ip", ip);
        update.put("bssid", record.getObservedBssid());
        update.put("rssi", record.getSignalDbm());
        update.put("status", status);
        update.put("markedAt", record.getMarkedAt() != null
                ? record.getMarkedAt().toString()
                : LocalDateTime.now().toString());
        update.put("confidenceScore", confidence.score());
        update.put("confidenceLevel", confidence.level());
        update.put("confidenceReasons", confidence.reasons());
        update.put("vendor", MacVendor.lookup(mac));
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, update);
    }

    private void broadcastRejection(
            Long sessionId,
            User student,
            String mac,
            String ip,
            String bssid,
            Integer rssi,
            PresenceConfidence.Result confidence) {
        Map<String, Object> update = new LinkedHashMap<>();
        update.put("type", "presence_rejected");
        update.put("sessionId", sessionId);
        update.put("studentId", student.getId());
        update.put("studentName", student.getName());
        update.put("studentRollNo", student.getStudentId());
        update.put("mac", mac);
        update.put("ip", ip);
        update.put("bssid", bssid);
        update.put("rssi", rssi);
        update.put("confidenceScore", confidence.score());
        update.put("confidenceLevel", confidence.level());
        update.put("confidenceReasons", confidence.reasons());
        update.put("vendor", MacVendor.lookup(mac));
        update.put("seenAt", LocalDateTime.now().toString());
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, update);
    }

    public List<Map<String, Object>> getSessionAttendance(Long sessionId) {
        return attendanceRepository.findAll().stream()
                .filter(r -> r.getSession().getId().equals(sessionId))
                .map(this::recordToMap)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getStudentAttendanceHistory(String email) {
        User student = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        return attendanceRepository.findByStudent(student).stream()
                .map(r -> {
                    Map<String, Object> map = recordToMap(r);
                    map.put("courseName", r.getSession().getCourseName());
                    map.put("courseCode", r.getSession().getCourseCode());
                    return map;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getStudentDashboard(String email) {
        User student = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        List<Map<String, Object>> devices = deviceService.getStudentDevices(email);
        List<Map<String, Object>> attendance = getStudentAttendanceHistory(email);
        long totalSessions = Math.max(1, sessionRepository.count());
        int attended = attendance.size();
        double percent = Math.min(100.0, (attended * 100.0) / totalSessions);

        Map<String, Integer> byDay = new TreeMap<>();
        LocalDate start = LocalDate.now().minusDays(83);
        for (int i = 0; i < 84; i++) {
            byDay.put(start.plusDays(i).toString(), 0);
        }
        for (Map<String, Object> row : attendance) {
            Object marked = row.get("markedAt");
            if (marked != null) {
                String day = marked.toString().substring(0, 10);
                byDay.computeIfPresent(day, (k, v) -> v + 1);
            }
        }
        List<Map<String, Object>> heatmap = byDay.entrySet().stream()
                .map(e -> {
                    Map<String, Object> cell = new LinkedHashMap<>();
                    cell.put("date", e.getKey());
                    cell.put("count", e.getValue());
                    return cell;
                })
                .collect(Collectors.toList());

        Optional<Session> live = sessionService.getAllActiveSessions().stream().findFirst();
        Map<String, Object> liveSession = live.map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("courseName", s.getCourseName());
            m.put("courseCode", s.getCourseCode());
            m.put("startTime", s.getStartTime());
            m.put("classroom", s.getClassroom() != null
                    ? ClassroomService.toMap(s.getClassroom())
                    : null);
            m.put("alreadyMarked", attendanceRepository.existsBySessionAndStudent(s, student));
            return m;
        }).orElse(null);

        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("devices", devices);
        dashboard.put("attendanceHistory", attendance);
        dashboard.put("totalClasses", attended);
        dashboard.put("totalSessions", sessionRepository.count());
        dashboard.put("attendancePercent", Math.round(percent));
        dashboard.put("heatmap", heatmap);
        dashboard.put("liveSession", liveSession);
        return dashboard;
    }

    public List<Map<String, Object>> getReport(String courseCode, String dateStr) {
        LocalDate date = (dateStr != null && !dateStr.isEmpty())
                ? LocalDate.parse(dateStr)
                : null;

        List<AttendanceRecord> records;

        if (courseCode != null && !courseCode.isEmpty() && date != null) {
            records = attendanceRepository.findByCourseCodeAndDateRange(
                    courseCode,
                    date.atStartOfDay(),
                    date.atTime(LocalTime.MAX));
        } else if (courseCode != null && !courseCode.isEmpty()) {
            records = attendanceRepository.findAll().stream()
                    .filter(r -> courseCode.equals(r.getSession().getCourseCode()))
                    .collect(Collectors.toList());
        } else {
            records = attendanceRepository.findAll();
        }

        return records.stream()
                .map(r -> {
                    Map<String, Object> map = recordToMap(r);
                    map.put("courseName", r.getSession().getCourseName());
                    map.put("courseCode", r.getSession().getCourseCode());
                    map.put("facultyName", r.getSession().getFaculty().getName());
                    return map;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getAnalytics() {
        List<AttendanceRecord> records = attendanceRepository.findAll();
        List<Session> sessions = sessionRepository.findAll();
        long totalSessions = Math.max(1, sessions.size());

        Map<String, Long> daily = new TreeMap<>();
        Map<String, Long> byCourse = new LinkedHashMap<>();
        Map<String, Long> methods = new LinkedHashMap<>();
        methods.put("AUTO", 0L);
        methods.put("MANUAL", 0L);
        methods.put("OVERRIDE", 0L);

        double confSum = 0;
        int confCount = 0;

        for (AttendanceRecord r : records) {
            String day = r.getMarkedAt() != null ? r.getMarkedAt().toLocalDate().toString() : "unknown";
            daily.merge(day, 1L, Long::sum);
            String course = r.getSession().getCourseCode() != null
                    ? r.getSession().getCourseCode()
                    : r.getSession().getCourseName();
            byCourse.merge(course, 1L, Long::sum);
            methods.merge(r.getStatus(), 1L, Long::sum);
            if (r.getConfidenceScore() != null) {
                confSum += r.getConfidenceScore();
                confCount++;
            }
        }

        Map<User, Long> attendedByStudent = records.stream()
                .collect(Collectors.groupingBy(AttendanceRecord::getStudent, Collectors.counting()));

        List<Map<String, Object>> defaulters = userRepository.findByRole(Role.STUDENT).stream()
                .map(s -> {
                    long attended = attendedByStudent.getOrDefault(s, 0L);
                    double pct = (attended * 100.0) / totalSessions;
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("studentId", s.getId());
                    row.put("studentName", s.getName());
                    row.put("studentRollNo", s.getStudentId());
                    row.put("attended", attended);
                    row.put("totalSessions", sessions.size());
                    row.put("percent", Math.round(pct));
                    return row;
                })
                .filter(row -> ((Number) row.get("percent")).longValue() < 75)
                .sorted(Comparator.comparingLong(row -> ((Number) row.get("percent")).longValue()))
                .collect(Collectors.toList());

        List<Map<String, Object>> dailySeries = daily.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> courseSeries = byCourse.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("course", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("totalRecords", records.size());
        analytics.put("totalSessions", sessions.size());
        analytics.put("totalStudents", userRepository.findByRole(Role.STUDENT).size());
        analytics.put("averageConfidence", confCount == 0 ? 0 : Math.round(confSum / confCount));
        analytics.put("daily", dailySeries);
        analytics.put("byCourse", courseSeries);
        analytics.put("methods", methods);
        analytics.put("defaulters", defaulters);
        analytics.put("generatedAt", LocalDateTime.now().toString());
        return analytics;
    }

    public Map<String, Object> recordToMap(AttendanceRecord r) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", r.getId());
        map.put("sessionId", r.getSession().getId());
        map.put("studentId", r.getStudent().getId());
        map.put("studentName", r.getStudent().getName());
        map.put("studentRollNo", r.getStudent().getStudentId());
        map.put("status", r.getStatus());
        map.put("deviceMac", r.getDeviceMac());
        map.put("deviceIp", r.getDeviceIp());
        map.put("observedBssid", r.getObservedBssid());
        map.put("signalDbm", r.getSignalDbm());
        map.put("confidenceScore", r.getConfidenceScore());
        map.put("confidenceLevel", r.getConfidenceLevel());
        map.put("confidenceReasons", r.getConfidenceReasons());
        map.put("vendor", MacVendor.lookup(r.getDeviceMac()));
        map.put("markedAt", r.getMarkedAt());
        return map;
    }
}
