package com.smartattendance.config;

import com.smartattendance.model.*;
import com.smartattendance.repository.ClassroomRepository;
import com.smartattendance.repository.DeviceRepository;
import com.smartattendance.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Ensures demo logins exist without wiping existing users.
 * Password for demo accounts: Demo@123
 */
@Component
public class DemoDataSeeder implements CommandLineRunner {

    public static final String DEMO_PASSWORD = "Demo@123";

    /** Access point the demo simulator reports for in-room devices. */
    public static final String DEMO_ROOM_BSSID = "A4:83:E7:C0:FF:EE";

    /** A neighbouring AP, used to show that corridor devices are refused. */
    public static final String DEMO_CORRIDOR_BSSID = "A4:83:E7:11:22:33";

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final ClassroomRepository classroomRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataSeeder(
            UserRepository userRepository,
            DeviceRepository deviceRepository,
            ClassroomRepository classroomRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.deviceRepository = deviceRepository;
        this.classroomRepository = classroomRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Demo roster; the simulator streams one MAC per student. */
    private static final String[] DEMO_STUDENTS = {
            "Aarav Shah", "Diya Patil", "Rohan Deshmukh", "Ananya Iyer", "Kabir Joshi",
            "Sana Khan", "Yash Kulkarni", "Ira Nair", "Vivaan Gupta", "Myra Singh"
    };

    @Override
    public void run(String... args) {
        String hash = passwordEncoder.encode(DEMO_PASSWORD);

        ensureUser("Campus Admin", "admin@smartattend.edu", hash, Role.ADMIN, null);
        ensureUser("Dr. Meera Kulkarni", "faculty@smartattend.edu", hash, Role.FACULTY, null);

        for (int i = 0; i < DEMO_STUDENTS.length; i++) {
            int index = i + 1;
            User student = ensureUser(
                    DEMO_STUDENTS[i],
                    "student" + index + "@smartattend.edu",
                    hash,
                    Role.STUDENT,
                    "CS2024D" + String.format("%02d", index));
            ensureApprovedDevice(student, demoMac(index), index % 2 == 0 ? "Android" : "iPhone");
        }

        ensureClassroom("CNT Lab 401", DEMO_ROOM_BSSID, "CAMPUS-WIFI", -70);
        ensureClassroom("Lecture Hall 2 (adjacent)", DEMO_CORRIDOR_BSSID, "CAMPUS-WIFI", -70);

        System.out.println("[Seed] Demo logins available (existing users were not deleted):");
        System.out.println("[Seed]   admin@smartattend.edu / " + DEMO_PASSWORD);
        System.out.println("[Seed]   faculty@smartattend.edu / " + DEMO_PASSWORD);
        System.out.println("[Seed]   student1@smartattend.edu / " + DEMO_PASSWORD);
        System.out.println("[Seed] Classroom AP " + DEMO_ROOM_BSSID + " -> CNT Lab 401");
    }

    private void ensureApprovedDevice(User student, String mac, String deviceName) {
        if (student == null || deviceRepository.findByMacAddress(mac).isPresent()) {
            return;
        }
        deviceRepository.save(Device.builder()
                .macAddress(mac)
                .deviceName(deviceName)
                .student(student)
                .approved(true)
                .approvedAt(LocalDateTime.now())
                .build());
    }

    private void ensureClassroom(String name, String bssid, String ssid, int minRssi) {
        if (classroomRepository.existsByBssid(bssid)) {
            return;
        }
        classroomRepository.save(Classroom.builder()
                .name(name)
                .bssid(bssid)
                .ssid(ssid)
                .minRssiDbm(minRssi)
                .build());
    }

    private User ensureUser(String name, String email, String hash, Role role, String studentId) {
        return userRepository.findByEmail(email).orElseGet(() ->
                userRepository.save(User.builder()
                        .name(name)
                        .email(email)
                        .password(hash)
                        .role(role)
                        .studentId(studentId)
                        .build()));
    }

    public static String demoMac(int index) {
        return String.format("AA:BB:CC:11:22:%02X", index);
    }
}
