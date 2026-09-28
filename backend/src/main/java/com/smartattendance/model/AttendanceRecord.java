package com.smartattendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Represents an attendance record — a student marked present in a session.
 */
@Entity
@Table(name = "attendance_records",
       uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "student_id"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "marked_at", nullable = false)
    private LocalDateTime markedAt;

    /**
     * How the attendance was marked:
     * AUTO     — detected via network presence
     * MANUAL   — faculty manually marked present
     * OVERRIDE — faculty overrode an existing record
     */
    @Column(nullable = false)
    private String status;

    @Column(name = "device_mac")
    private String deviceMac;

    @Column(name = "device_ip")
    private String deviceIp;

    @Column(name = "confidence_score")
    private Integer confidenceScore;

    @Column(name = "confidence_level")
    private String confidenceLevel;

    @Column(name = "confidence_reasons", length = 1000)
    private String confidenceReasons;

    /** Access point the device was associated with when it was seen. */
    @Column(name = "observed_bssid")
    private String observedBssid;

    /** Signal strength in dBm, when the scanner can report per-station values. */
    @Column(name = "signal_dbm")
    private Integer signalDbm;

    @PrePersist
    protected void onCreate() {
        if (this.markedAt == null) {
            this.markedAt = LocalDateTime.now();
        }
    }
}
