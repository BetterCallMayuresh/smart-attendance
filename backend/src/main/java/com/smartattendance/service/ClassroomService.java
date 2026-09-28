package com.smartattendance.service;

import com.smartattendance.dto.ClassroomRequest;
import com.smartattendance.model.Classroom;
import com.smartattendance.presence.PresenceConfidence;
import com.smartattendance.repository.ClassroomRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ClassroomService {

    private final ClassroomRepository classroomRepository;

    public ClassroomService(ClassroomRepository classroomRepository) {
        this.classroomRepository = classroomRepository;
    }

    public List<Map<String, Object>> listClassrooms() {
        return classroomRepository.findAll().stream()
                .map(ClassroomService::toMap)
                .collect(Collectors.toList());
    }

    public Classroom create(ClassroomRequest request) {
        String bssid = PresenceConfidence.normalizeBssid(request.getBssid());
        if (classroomRepository.existsByBssid(bssid)) {
            throw new RuntimeException("A classroom is already registered for AP " + bssid);
        }
        return classroomRepository.save(Classroom.builder()
                .name(request.getName())
                .bssid(bssid)
                .ssid(request.getSsid())
                .minRssiDbm(request.getMinRssiDbm())
                .build());
    }

    public void delete(Long id) {
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        classroomRepository.delete(classroom);
    }

    public Classroom requireById(Long id) {
        return classroomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Classroom not found: " + id));
    }

    public static Map<String, Object> toMap(Classroom c) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.getId());
        map.put("name", c.getName());
        map.put("bssid", c.getBssid());
        map.put("ssid", c.getSsid());
        map.put("minRssiDbm", c.effectiveMinRssi());
        return map;
    }
}
