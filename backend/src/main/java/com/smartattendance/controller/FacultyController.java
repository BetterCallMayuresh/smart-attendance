package com.smartattendance.controller;

import com.smartattendance.dto.*;
import com.smartattendance.model.AttendanceRecord;
import com.smartattendance.model.Session;
import com.smartattendance.service.AttendanceService;
import com.smartattendance.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/faculty")
public class FacultyController {

    @Autowired
    private SessionService sessionService;

    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private com.smartattendance.service.PresenceGateway presenceGateway;

    @Autowired
    private com.smartattendance.service.ClassroomService classroomService;

    /**
     * GET /api/faculty/classrooms
     * Rooms a session can be bound to, with their access point BSSIDs.
     */
    @GetMapping("/classrooms")
    public ResponseEntity<?> classrooms() {
        return ResponseEntity.ok(ApiResponse.success("Classrooms", classroomService.listClassrooms()));
    }

    /**
     * POST /api/faculty/session/start
     * Start a new class session.
     */
    @PostMapping("/session/start")
    public ResponseEntity<?> startSession(Authentication authentication,
                                           @Valid @RequestBody SessionRequest request) {
        try {
            String email = authentication.getName();
            Session session = sessionService.startSession(email, request);
            return ResponseEntity.ok(ApiResponse.success("Session started",
                    sessionService.sessionToMap(session)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * POST /api/faculty/session/{id}/end
     * End an active session.
     */
    @PostMapping("/session/{id}/end")
    public ResponseEntity<?> endSession(@PathVariable Long id,
                                         Authentication authentication) {
        try {
            String email = authentication.getName();
            Session session = sessionService.endSession(id, email);
            return ResponseEntity.ok(ApiResponse.success("Session ended",
                    sessionService.sessionToMap(session)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/faculty/session/active
     * Get the currently active session.
     */
    @GetMapping("/session/active")
    public ResponseEntity<?> getActiveSession(Authentication authentication) {
        String email = authentication.getName();
        Optional<Session> session = sessionService.getActiveSession(email);

        if (session.isPresent()) {
            Map<String, Object> data = sessionService.sessionToMap(session.get());
            List<Map<String, Object>> attendance =
                    attendanceService.getSessionAttendance(session.get().getId());
            data.put("attendees", attendance);
            return ResponseEntity.ok(ApiResponse.success("Active session", data));
        }

        return ResponseEntity.ok(ApiResponse.success("No active session", null));
    }

    /**
     * GET /api/faculty/session/{id}/live
     * Get live attendance data for a session.
     */
    @GetMapping("/session/{id}/live")
    public ResponseEntity<?> getSessionLive(@PathVariable Long id) {
        List<Map<String, Object>> attendance = attendanceService.getSessionAttendance(id);
        return ResponseEntity.ok(ApiResponse.success("Live attendance", attendance));
    }

    /**
     * POST /api/faculty/session/{sessionId}/mark/{studentId}
     * Manually mark a student present.
     */
    @PostMapping("/session/{sessionId}/mark/{studentId}")
    public ResponseEntity<?> manualMark(@PathVariable Long sessionId,
                                         @PathVariable Long studentId,
                                         Authentication authentication) {
        try {
            String email = authentication.getName();
            attendanceService.manualMark(sessionId, studentId, email);
            return ResponseEntity.ok(ApiResponse.success("Student marked present"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * POST /api/faculty/session/{sessionId}/mark-by-prn
     * Manually mark a student present by PRN.
     */
    @PostMapping("/session/{sessionId}/mark-by-prn")
    public ResponseEntity<?> manualMarkByPRN(@PathVariable Long sessionId,
                                             @RequestBody Map<String, String> body,
                                             Authentication authentication) {
        try {
            String prn = body.get("prn");
            AttendanceRecord record = attendanceService.manualMarkByPRN(
                    sessionId, prn, authentication.getName());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("studentName", record.getStudent().getName());
            result.put("status", record.getStatus());
            return ResponseEntity.ok(ApiResponse.success("Attendance marked", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/faculty/sessions
     * Get session history for the faculty.
     */
    @GetMapping("/presence/live")
    public ResponseEntity<?> livePresence() {
        return ResponseEntity.ok(ApiResponse.success("Live presence", presenceGateway.currentDevices()));
    }

    @PostMapping("/presence/simulate")
    public ResponseEntity<?> simulateClassroom(@RequestBody(required = false) Map<String, Integer> body) {
        try {
            int count = body != null && body.get("count") != null ? body.get("count") : 10;
            int intervalMs = body != null && body.get("intervalMs") != null ? body.get("intervalMs") : 1500;
            int outsideCount = body != null && body.get("outsideCount") != null ? body.get("outsideCount") : 2;
            return ResponseEntity.ok(ApiResponse.success(
                    "Demo classroom started",
                    presenceGateway.simulate(count, intervalMs, outsideCount)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/sessions")
    public ResponseEntity<?> getSessionHistory(Authentication authentication) {
        String email = authentication.getName();
        List<Map<String, Object>> sessions = sessionService.getFacultySessionHistory(email);
        return ResponseEntity.ok(ApiResponse.success("Session history", sessions));
    }
}
