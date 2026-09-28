package com.smartattendance.repository;

import com.smartattendance.model.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    Optional<Classroom> findByBssid(String bssid);
    boolean existsByBssid(String bssid);
}
