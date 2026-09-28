package com.smartattendance.controller;

import com.smartattendance.dto.ApiResponse;
import com.smartattendance.model.User;
import com.smartattendance.repository.UserRepository;
import com.smartattendance.service.DeviceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private DeviceService deviceService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.smartattendance.service.ClassroomService classroomService;

    /**
     * GET /api/admin/classrooms
     * List registered rooms and the access point that serves each one.
     */
    @GetMapping("/classrooms")
    public ResponseEntity<?> listClassrooms() {
        return ResponseEntity.ok(ApiResponse.success("Classrooms", classroomService.listClassrooms()));
    }

    /**
     * POST /api/admin/classrooms
     * Register a room by its access point BSSID.
     */
    @PostMapping("/classrooms")
    public ResponseEntity<?> createClassroom(
            @jakarta.validation.Valid @RequestBody com.smartattendance.dto.ClassroomRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success(
                    "Classroom registered",
                    com.smartattendance.service.ClassroomService.toMap(classroomService.create(request))));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/classrooms/{id}")
    public ResponseEntity<?> deleteClassroom(@PathVariable Long id) {
        try {
            classroomService.delete(id);
            return ResponseEntity.ok(ApiResponse.success("Classroom removed"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/admin/devices/pending
     * List all devices pending approval.
     */
    @GetMapping("/devices/pending")
    public ResponseEntity<?> getPendingDevices() {
        List<Map<String, Object>> pending = deviceService.getPendingDevices();
        return ResponseEntity.ok(ApiResponse.success("Pending devices", pending));
    }

    /**
     * POST /api/admin/devices/{id}/approve
     * Approve a device.
     */
    @PostMapping("/devices/{id}/approve")
    public ResponseEntity<?> approveDevice(@PathVariable Long id) {
        try {
            deviceService.approveDevice(id);
            return ResponseEntity.ok(ApiResponse.success("Device approved"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * POST /api/admin/devices/{id}/reject
     * Reject (delete) a device.
     */
    @PostMapping("/devices/bulk-approve")
    public ResponseEntity<?> bulkApprove(@RequestBody Map<String, List<Long>> body) {
        try {
            List<Long> ids = body.getOrDefault("ids", List.of());
            int count = deviceService.approveDevices(ids);
            return ResponseEntity.ok(ApiResponse.success("Approved " + count + " devices", count));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/devices/{id}/reject")
    public ResponseEntity<?> rejectDevice(@PathVariable Long id) {
        try {
            deviceService.rejectDevice(id);
            return ResponseEntity.ok(ApiResponse.success("Device rejected"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/admin/users
     * List all users.
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(this::userToMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("All users", users));
    }

    private Map<String, Object> userToMap(User u) {
        return Map.of(
                "id", u.getId(),
                "name", u.getName(),
                "email", u.getEmail(),
                "role", u.getRole().name(),
                "studentId", u.getStudentId() != null ? u.getStudentId() : "",
                "createdAt", u.getCreatedAt().toString()
        );
    }
}
