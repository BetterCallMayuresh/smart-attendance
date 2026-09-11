package com.smartattendance.service;

import com.smartattendance.model.*;
import com.smartattendance.repository.AttendanceRecordRepository;
import com.smartattendance.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

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
    private SessionService sessionService;

    @Autowired
    private DeviceService deviceService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Process a presence event: MAC detected on network.
     * Match MAC → approved device → student → active session → create attendance record.
     */
    public void processPresenceEvent(String mac, String ip) {
        // Find the student who owns this approved device
        Optional<User> studentOpt = deviceService.findStudentByApprovedMac(mac);
        if (studentOpt.isEmpty()) {
            return; // Unknown or unapproved device, ignore
        }

        User student = studentOpt.get();

        // Find all active sessions, sorted by most recent startTime first
        List<Session> activeSessions = sessionService.getAllActiveSessions();
        activeSessions.sort(Comparator.comparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        for (Session session : activeSessions) {
            // Check if already marked for this session
            if (attendanceRepository.existsBySessionAndStudent(session, student)) {
                continue; // Already marked
            }

            // Guard: Prevent a student from being marked in multiple simultaneous sessions when their MAC is detected.
            // Skips this session if an attendance record for this student already exists in any other session within the last 10 minutes.
            LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);
            boolean markedRecentlyInOtherSession = attendanceRepository
                    .findByStudentAndDateRange(student, tenMinutesAgo, LocalDateTime.now())
                    .stream()
                    .anyMatch(r -> !r.getSession().getId().equals(session.getId()));

            if (markedRecentlyInOtherSession) {
                continue;
            }

            // Create attendance record
            AttendanceRecord record = AttendanceRecord.builder()
                    .session(session)
                    .student(student)
                    .status("AUTO")
                    .deviceMac(mac)
                    .build();

            attendanceRepository.save(record);

            System.out.println("[Attendance] AUTO marked: " + student.getName()
                    + " in session " + session.getCourseName()
                    + " via MAC " + mac);

            // Push live update via WebSocket to faculty dashboards
            Map<String, Object> update = new LinkedHashMap<>();
            update.put("type", "attendance_marked");
            update.put("sessionId", session.getId());
            update.put("studentId", student.getId());
            update.put("studentName", student.getName());
            update.put("studentRollNo", student.getStudentId());
            update.put("mac", mac);
            update.put("status", "AUTO");
            update.put("markedAt", record.getMarkedAt().toString());

            messagingTemplate.convertAndSend(
                    "/topic/session/" + session.getId(), update);

            // In the absence of an explicit enrollment table, fall back to marking only the single most recently started active session
            break;
        }
    }

    /**
     * Faculty manually marks a student present.
     */
    public AttendanceRecord manualMark(Long sessionId, Long studentId, String facultyEmail) {
        Session session = sessionService.getAllActiveSessions().stream()
                .filter(s -> s.getId().equals(sessionId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Active session not found"));

        if (!session.getFaculty().getEmail().equals(facultyEmail)) {
            throw new RuntimeException("Not authorized for this session");
        }

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Check if already marked
        Optional<AttendanceRecord> existing =
                attendanceRepository.findBySessionAndStudent(session, student);
        if (existing.isPresent()) {
            // Override
            AttendanceRecord record = existing.get();
            record.setStatus("OVERRIDE");
            record.setMarkedAt(LocalDateTime.now());
            return attendanceRepository.save(record);
        }

        AttendanceRecord record = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .status("MANUAL")
                .build();

        AttendanceRecord saved = attendanceRepository.save(record);

        // Push update
        Map<String, Object> update = new LinkedHashMap<>();
        update.put("type", "attendance_marked");
        update.put("sessionId", session.getId());
        update.put("studentId", student.getId());
        update.put("studentName", student.getName());
        update.put("status", "MANUAL");
        update.put("markedAt", saved.getMarkedAt().toString());

        messagingTemplate.convertAndSend("/topic/session/" + session.getId(), update);

        return saved;
    }

    /**
     * Get attendance records for a specific session.
     */
    public List<Map<String, Object>> getSessionAttendance(Long sessionId) {
        Session session = sessionService.getAllActiveSessions().stream()
                .filter(s -> s.getId().equals(sessionId))
                .findFirst()
                .or(() -> {
                    // Check non-active sessions too
                    return Optional.empty();
                })
                .orElse(null);

        // If not found in active, fetch from DB
        List<AttendanceRecord> records;
        if (session != null) {
            records = attendanceRepository.findBySession(session);
        } else {
            // Fallback: just query by session id from all records
            records = attendanceRepository.findAll().stream()
                    .filter(r -> r.getSession().getId().equals(sessionId))
                    .collect(Collectors.toList());
        }

        return records.stream().map(this::recordToMap).collect(Collectors.toList());
    }

    /**
     * Get attendance history for a student.
     */
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

    /**
     * Get attendance reports filtered by course and/or date range.
     */
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

    private Map<String, Object> recordToMap(AttendanceRecord r) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", r.getId());
        map.put("sessionId", r.getSession().getId());
        map.put("studentId", r.getStudent().getId());
        map.put("studentName", r.getStudent().getName());
        map.put("studentRollNo", r.getStudent().getStudentId());
        map.put("status", r.getStatus());
        map.put("deviceMac", r.getDeviceMac());
        map.put("markedAt", r.getMarkedAt());
        return map;
    }
}
