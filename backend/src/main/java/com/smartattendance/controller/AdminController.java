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
