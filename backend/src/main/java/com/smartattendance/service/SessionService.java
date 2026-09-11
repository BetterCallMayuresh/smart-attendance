package com.smartattendance.service;

import com.smartattendance.dto.SessionRequest;
import com.smartattendance.model.Session;
import com.smartattendance.model.User;
import com.smartattendance.repository.SessionRepository;
import com.smartattendance.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SessionService {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Start a new session for a course.
     */
    public Session startSession(String facultyEmail, SessionRequest request) {
        User faculty = userRepository.findByEmail(facultyEmail)
                .orElseThrow(() -> new RuntimeException("Faculty not found"));

        // Check if faculty already has an active session
        Optional<Session> existing = sessionRepository.findByFacultyAndActive(faculty, true);
        if (existing.isPresent()) {
            throw new RuntimeException("You already have an active session. End it before starting a new one.");
        }

        Session session = Session.builder()
                .courseName(request.getCourseName())
                .courseCode(request.getCourseCode())
                .faculty(faculty)
                .active(true)
                .build();

        return sessionRepository.save(session);
    }

    /**
     * End an active session.
     */
    public Session endSession(Long sessionId, String facultyEmail) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getFaculty().getEmail().equals(facultyEmail)) {
            throw new RuntimeException("Not authorized to end this session");
        }

        session.setActive(false);
        session.setEndTime(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    /**
     * Get the currently active session for a faculty member.
     */
    public Optional<Session> getActiveSession(String facultyEmail) {
        User faculty = userRepository.findByEmail(facultyEmail)
                .orElseThrow(() -> new RuntimeException("Faculty not found"));
        return sessionRepository.findByFacultyAndActive(faculty, true);
    }

    /**
     * Get all active sessions across all faculty.
     */
    public List<Session> getAllActiveSessions() {
        return sessionRepository.findByActive(true);
    }

    /**
     * Get session history for a faculty member.
     */
    public List<Map<String, Object>> getFacultySessionHistory(String facultyEmail) {
        User faculty = userRepository.findByEmail(facultyEmail)
                .orElseThrow(() -> new RuntimeException("Faculty not found"));

        return sessionRepository.findByFaculty(faculty).stream()
                .map(this::sessionToMap)
                .collect(Collectors.toList());
    }

    public Map<String, Object> sessionToMap(Session s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId());
        map.put("courseName", s.getCourseName());
        map.put("courseCode", s.getCourseCode());
        map.put("facultyName", s.getFaculty().getName());
        map.put("startTime", s.getStartTime());
        map.put("endTime", s.getEndTime());
        map.put("active", s.isActive());
        return map;
    }
}
