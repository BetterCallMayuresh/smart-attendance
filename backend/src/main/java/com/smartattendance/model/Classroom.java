package com.smartattendance.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A physical classroom identified by the access point that serves it.
 * Binding a session to a classroom is what lets us prove room presence
 * instead of mere campus-network presence.
 */
@Entity
@Table(name = "classrooms")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Classroom {

    /** Devices weaker than this are treated as outside the room. */
    public static final int DEFAULT_MIN_RSSI_DBM = -70;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** MAC address of the room's access point, uppercase colon form. */
    @Column(nullable = false, unique = true)
    private String bssid;

    private String ssid;

    @Column(name = "min_rssi_dbm")
    private Integer minRssiDbm;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public int effectiveMinRssi() {
        return minRssiDbm != null ? minRssiDbm : DEFAULT_MIN_RSSI_DBM;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.minRssiDbm == null) {
            this.minRssiDbm = DEFAULT_MIN_RSSI_DBM;
        }
    }
}
