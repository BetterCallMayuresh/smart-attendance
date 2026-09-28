package com.smartattendance.presence;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Scores how trustworthy a network-presence attendance event is.
 *
 * Two modes:
 *  - Room-bound session (classroom AP known): proximity to that AP is required
 *    for HIGH confidence, because being on the campus LAN does not prove
 *    being in the lecture hall.
 *  - Unbound session: falls back to network-only signals.
 *
 * Pure function — no Spring, so it is straightforward to unit-test.
 */
public final class PresenceConfidence {

    public static final int SCAN_WINDOW_SECONDS = 30;

    private PresenceConfidence() {}

    public record Result(int score, String level, List<String> reasons) {}

    /**
     * @param macApproved          MAC belongs to an approved student device
     * @param ip                   IPv4 address seen in the ARP table
     * @param campusCidrs          subnets considered "on campus"
     * @param lastSeen             when this MAC was last observed
     * @param now                  evaluation time
     * @param ipChangedRecently    the same MAC just moved to a different IP
     * @param duplicateMacObserved the same MAC appeared twice on the network
     * @param observedBssid        access point the device is associated with
     * @param expectedBssid        access point registered for this classroom
     * @param rssiDbm              signal strength in dBm (negative; -45 is strong)
     * @param minRssiDbm           weakest signal still considered inside the room
     */
    public record Signals(
            boolean macApproved,
            String ip,
            List<String> campusCidrs,
            Instant lastSeen,
            Instant now,
            boolean ipChangedRecently,
            boolean duplicateMacObserved,
            String observedBssid,
            String expectedBssid,
            Integer rssiDbm,
            int minRssiDbm) {
    }

    public static Result score(Signals s) {
        List<String> reasons = new ArrayList<>();
        boolean roomBound = isPresent(s.expectedBssid());

        // When the room's AP is known, network signals alone cannot reach HIGH.
        int macWeight = roomBound ? 30 : 40;
        int windowWeight = roomBound ? 15 : 20;
        int subnetWeight = roomBound ? 15 : 20;

        int score = 0;

        if (s.macApproved()) {
            score += macWeight;
            reasons.add("MAC is registered and approved");
        } else {
            reasons.add("MAC is unknown or unapproved");
        }

        Instant now = s.now() != null ? s.now() : Instant.now();
        if (s.lastSeen() != null
                && Duration.between(s.lastSeen(), now).getSeconds() <= SCAN_WINDOW_SECONDS) {
            score += windowWeight;
            reasons.add("Seen in current ARP scan window");
        } else {
            reasons.add("Stale or missing ARP recency");
        }

        if (ipInAnySubnet(s.ip(), s.campusCidrs())) {
            score += subnetWeight;
            reasons.add("IP is inside campus subnet");
        } else {
            reasons.add("IP is outside expected campus subnet");
        }

        if (roomBound) {
            score += proximityPoints(s, reasons);
        }

        if (s.ipChangedRecently()) {
            score -= 20;
            reasons.add("Source IP changed recently (possible clone)");
        }

        if (s.duplicateMacObserved()) {
            score -= 25;
            reasons.add("Duplicate MAC observed on the network");
        }

        score = Math.max(0, Math.min(100, score));
        return new Result(score, levelFor(score), List.copyOf(reasons));
    }

    private static int proximityPoints(Signals s, List<String> reasons) {
        String expected = normalizeBssid(s.expectedBssid());

        if (!isPresent(s.observedBssid())) {
            reasons.add("No access point data — room presence unverified");
            return 0;
        }

        String observed = normalizeBssid(s.observedBssid());
        if (!observed.equals(expected)) {
            reasons.add("Associated with a different access point (" + observed
                    + ") — not this classroom");
            return -35;
        }

        int points = 30;
        reasons.add("Associated with the classroom access point " + expected);

        if (s.rssiDbm() != null) {
            if (s.rssiDbm() >= s.minRssiDbm()) {
                points += 10;
                reasons.add("Signal " + s.rssiDbm() + " dBm is within classroom range");
            } else {
                points -= 15;
                reasons.add("Signal " + s.rssiDbm() + " dBm is weaker than "
                        + s.minRssiDbm() + " dBm — likely outside the room");
            }
        }
        return points;
    }

    public static Result manualMark() {
        return new Result(55, "MEDIUM", List.of("Marked by faculty (no live ARP proof)"));
    }

    public static String levelFor(int score) {
        if (score >= 75) return "HIGH";
        if (score >= 50) return "MEDIUM";
        return "LOW";
    }

    public static String normalizeBssid(String mac) {
        if (mac == null) {
            return "";
        }
        return mac.trim().toUpperCase(Locale.ROOT).replace('-', ':');
    }

    private static boolean isPresent(String value) {
        return value != null && !value.isBlank();
    }

    static boolean ipInAnySubnet(String ip, List<String> cidrs) {
        if (ip == null || ip.isBlank() || cidrs == null) {
            return false;
        }
        for (String cidr : cidrs) {
            if (ipInCidr(ip.trim(), cidr.trim())) {
                return true;
            }
        }
        return false;
    }

    static boolean ipInCidr(String ip, String cidr) {
        try {
            String[] parts = cidr.split("/");
            int prefix = parts.length == 2 ? Integer.parseInt(parts[1]) : 32;
            long ipVal = ipv4ToLong(ip);
            long netVal = ipv4ToLong(parts[0]);
            if (prefix <= 0) return true;
            if (prefix >= 32) return ipVal == netVal;
            long mask = (-1L << (32 - prefix)) & 0xFFFFFFFFL;
            return (ipVal & mask) == (netVal & mask);
        } catch (Exception e) {
            return false;
        }
    }

    static long ipv4ToLong(String ip) {
        String[] o = ip.split("\\.");
        if (o.length != 4) {
            throw new IllegalArgumentException("Not IPv4: " + ip);
        }
        long v = 0;
        for (String s : o) {
            int n = Integer.parseInt(s);
            if (n < 0 || n > 255) {
                throw new IllegalArgumentException("Octet out of range");
            }
            v = (v << 8) | n;
        }
        return v;
    }
}
