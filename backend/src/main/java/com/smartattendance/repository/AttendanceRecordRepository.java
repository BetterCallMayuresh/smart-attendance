package com.smartattendance.repository;

import com.smartattendance.model.AttendanceRecord;
import com.smartattendance.model.Session;
import com.smartattendance.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySession(Session session);
    List<AttendanceRecord> findByStudent(User student);
    Optional<AttendanceRecord> findBySessionAndStudent(Session session, User student);
    boolean existsBySessionAndStudent(Session session, User student);

    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.student = :student " +
           "AND ar.markedAt BETWEEN :start AND :end")
    List<AttendanceRecord> findByStudentAndDateRange(
            @Param("student") User student,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("SELECT ar FROM AttendanceRecord ar JOIN ar.session s " +
           "WHERE s.courseName = :courseName")
    List<AttendanceRecord> findByCourseName(@Param("courseName") String courseName);

    @Query("SELECT ar FROM AttendanceRecord ar JOIN ar.session s " +
           "WHERE s.courseCode = :courseCode AND ar.markedAt BETWEEN :start AND :end")
    List<AttendanceRecord> findByCourseCodeAndDateRange(
            @Param("courseCode") String courseCode,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
