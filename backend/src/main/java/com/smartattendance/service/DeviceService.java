package com.smartattendance.service;

import com.smartattendance.dto.DeviceRequest;
import com.smartattendance.model.Device;
import com.smartattendance.model.User;
import com.smartattendance.presence.MacVendor;
import com.smartattendance.repository.DeviceRepository;
import com.smartattendance.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DeviceService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Student registers a new device.
     */
    public Device registerDevice(String email, DeviceRequest request) {
        User student = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (deviceRepository.existsByMacAddress(request.getMacAddress().toUpperCase())) {
            throw new RuntimeException("Device with this MAC address is already registered");
        }

        boolean hasApprovedDevice = deviceRepository.findByStudent(student)
                .stream()
                .anyMatch(Device::isApproved);
        if (hasApprovedDevice) {
            throw new RuntimeException("You already have an approved device. Remove it before registering a new one.");
        }

        Device device = Device.builder()
                .macAddress(request.getMacAddress().toUpperCase())
                .deviceName(request.getDeviceName())
                .student(student)
                .approved(false)
                .build();

        return deviceRepository.save(device);
    }

    /**
     * Get all devices for a student.
     */
    public List<Map<String, Object>> getStudentDevices(String email) {
        User student = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return deviceRepository.findByStudent(student).stream()
                .map(this::deviceToMap)
                .collect(Collectors.toList());
    }

    /**
     * Get all pending (unapproved) devices — for admin.
     */
    public List<Map<String, Object>> getPendingDevices() {
        return deviceRepository.findByApproved(false).stream()
                .map(d -> {
                    Map<String, Object> map = deviceToMap(d);
                    map.put("studentName", d.getStudent().getName());
                    map.put("studentEmail", d.getStudent().getEmail());
                    map.put("studentId", d.getStudent().getStudentId());
                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * Approve a device — admin action.
     */
    public Device approveDevice(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));
        device.setApproved(true);
        device.setApprovedAt(LocalDateTime.now());
        return deviceRepository.save(device);
    }

    /**
     * Reject (delete) a device — admin action.
     */
    public void rejectDevice(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));
        deviceRepository.delete(device);
    }

    /**
     * Find the student owning an approved device by MAC address.
     */
    public Optional<User> findStudentByApprovedMac(String mac) {
        return deviceRepository.findByMacAddressAndApproved(mac.toUpperCase(), true)
                .map(Device::getStudent);
    }

    private Map<String, Object> deviceToMap(Device d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("macAddress", d.getMacAddress());
        map.put("deviceName", d.getDeviceName());
        map.put("approved", d.isApproved());
        map.put("createdAt", d.getCreatedAt());
        map.put("approvedAt", d.getApprovedAt());
        map.put("vendor", MacVendor.lookup(d.getMacAddress()));
        return map;
    }

    public int approveDevices(List<Long> ids) {
        int count = 0;
        for (Long id : ids) {
            approveDevice(id);
            count++;
        }
        return count;
    }

    public void removeStudentDevice(Long deviceId, String email) {
        User student = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));
        if (!device.getStudent().getId().equals(student.getId())) {
            throw new RuntimeException("Not authorized to remove this device");
        }
        deviceRepository.delete(device);
    }
}
