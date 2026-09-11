package com.smartattendance.repository;

import com.smartattendance.model.Session;
import com.smartattendance.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {
    List<Session> findByFaculty(User faculty);
    List<Session> findByActive(boolean active);
    Optional<Session> findByFacultyAndActive(User faculty, boolean active);
    List<Session> findByCourseName(String courseName);
    List<Session> findByCourseCode(String courseCode);
}
