package com.smartattendance.repository;

import com.smartattendance.model.Device;
import com.smartattendance.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByMacAddress(String macAddress);
    List<Device> findByStudent(User student);
    List<Device> findByApproved(boolean approved);
    boolean existsByMacAddress(String macAddress);
    Optional<Device> findByMacAddressAndApproved(String macAddress, boolean approved);
}
