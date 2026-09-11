package com.smartattendance.controller;

import com.smartattendance.dto.*;
import com.smartattendance.service.AttendanceService;
import com.smartattendance.service.DeviceService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
public class StudentController {

    @Autowired
    private DeviceService deviceService;

    @Autowired
    private AttendanceService attendanceService;

    /**
     * GET /api/student/dashboard
     * Returns the student's attendance summary and device info.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(Authentication authentication) {
        String email = authentication.getName();
        List<Map<String, Object>> devices = deviceService.getStudentDevices(email);
        List<Map<String, Object>> attendance = attendanceService.getStudentAttendanceHistory(email);

        Map<String, Object> dashboard = Map.of(
                "devices", devices,
                "attendanceHistory", attendance,
                "totalClasses", attendance.size()
        );

        return ResponseEntity.ok(ApiResponse.success("Dashboard loaded", dashboard));
    }

    /**
     * GET /api/student/attendance-history
     * Returns detailed attendance history for the student.
     */
    @GetMapping("/attendance-history")
    public ResponseEntity<?> getAttendanceHistory(Authentication authentication) {
        String email = authentication.getName();
        List<Map<String, Object>> history = attendanceService.getStudentAttendanceHistory(email);
        return ResponseEntity.ok(ApiResponse.success("Attendance history", history));
    }

    /**
     * POST /api/student/device/register
     * Register a new device (MAC address).
     */
    @PostMapping("/device/register")
    public ResponseEntity<?> registerDevice(Authentication authentication,
                                             @Valid @RequestBody DeviceRequest request) {
        try {
            String email = authentication.getName();
            deviceService.registerDevice(email, request);
            return ResponseEntity.ok(ApiResponse.success("Device registered. Pending admin approval."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/student/devices
     * Get all devices registered by this student.
     */
    @GetMapping("/devices")
    public ResponseEntity<?> getDevices(Authentication authentication) {
        String email = authentication.getName();
        List<Map<String, Object>> devices = deviceService.getStudentDevices(email);
        return ResponseEntity.ok(ApiResponse.success("Devices", devices));
    }
}
