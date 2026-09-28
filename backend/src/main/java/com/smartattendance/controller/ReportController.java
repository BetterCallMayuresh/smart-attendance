package com.smartattendance.controller;

import com.smartattendance.dto.ApiResponse;
import com.smartattendance.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private AttendanceService attendanceService;

    /**
     * GET /api/reports/attendance?course=CS101&date=2024-01-15
     * Get attendance report filtered by course code and/or date.
     */
    @GetMapping("/attendance")
    public ResponseEntity<?> getAttendanceReport(
            @RequestParam(required = false) String course,
            @RequestParam(required = false) String date) {
        List<Map<String, Object>> report = attendanceService.getReport(course, date);
        return ResponseEntity.ok(ApiResponse.success("Attendance report", report));
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics() {
        return ResponseEntity.ok(ApiResponse.success("Analytics", attendanceService.getAnalytics()));
    }
}
