package com.smartattendance.presence;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PresenceConfidenceTest {

    private static final List<String> CAMPUS = List.of(
            "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16");

    private static final String ROOM_AP = "A4:83:E7:C0:FF:EE";
    private static final String OTHER_AP = "A4:83:E7:11:22:33";

    private PresenceConfidence.Signals signals(
            String observedBssid, String expectedBssid, Integer rssi) {
        return new PresenceConfidence.Signals(
                true,
                "192.168.1.42",
                CAMPUS,
                Instant.now().minusSeconds(5),
                Instant.now(),
                false,
                false,
                observedBssid,
                expectedBssid,
                rssi,
                -70);
    }

    @Test
    void deviceOnClassroomApWithStrongSignalIsHigh() {
        PresenceConfidence.Result r = PresenceConfidence.score(signals(ROOM_AP, ROOM_AP, -48));
        assertEquals("HIGH", r.level());
        assertTrue(r.score() >= 75);
        assertTrue(r.reasons().stream().anyMatch(s -> s.contains("classroom access point")));
    }

    @Test
    void networkPresenceWithoutApProofCannotReachHigh() {
        // On campus, approved, freshly seen — but no proof of being in the room.
        PresenceConfidence.Result r = PresenceConfidence.score(signals(null, ROOM_AP, null));
        assertNotEquals("HIGH", r.level());
        assertTrue(r.reasons().stream().anyMatch(s -> s.contains("room presence unverified")));
    }

    @Test
    void deviceOnDifferentApIsRejectedAsLow() {
        PresenceConfidence.Result r = PresenceConfidence.score(signals(OTHER_AP, ROOM_AP, -50));
        assertEquals("LOW", r.level());
        assertTrue(r.score() < 50);
        assertTrue(r.reasons().stream().anyMatch(s -> s.contains("different access point")));
    }

    @Test
    void weakSignalOnCorrectApIsPenalized() {
        PresenceConfidence.Result strong = PresenceConfidence.score(signals(ROOM_AP, ROOM_AP, -45));
        PresenceConfidence.Result weak = PresenceConfidence.score(signals(ROOM_AP, ROOM_AP, -88));
        assertTrue(weak.score() < strong.score());
        assertTrue(weak.reasons().stream().anyMatch(s -> s.contains("weaker than")));
    }

    @Test
    void unboundSessionStillUsesNetworkOnlyScoring() {
        PresenceConfidence.Result r = PresenceConfidence.score(signals(null, null, null));
        assertEquals("HIGH", r.level());
        assertTrue(r.reasons().stream().noneMatch(s -> s.contains("access point")));
    }

    @Test
    void unknownMacOutsideSubnetIsLow() {
        PresenceConfidence.Result r = PresenceConfidence.score(new PresenceConfidence.Signals(
                false,
                "8.8.8.8",
                CAMPUS,
                Instant.now().minusSeconds(120),
                Instant.now(),
                true,
                true,
                null,
                null,
                null,
                -70));
        assertEquals("LOW", r.level());
        assertTrue(r.score() < 50);
    }

    @Test
    void ipChangeAndDuplicateMacPenalize() {
        PresenceConfidence.Result clean = PresenceConfidence.score(new PresenceConfidence.Signals(
                true, "10.0.0.12", CAMPUS, Instant.now(), Instant.now(),
                false, false, null, null, null, -70));
        PresenceConfidence.Result dirty = PresenceConfidence.score(new PresenceConfidence.Signals(
                true, "10.0.0.12", CAMPUS, Instant.now(), Instant.now(),
                true, true, null, null, null, -70));
        assertTrue(dirty.score() < clean.score());
    }

    @Test
    void bssidComparisonIgnoresCaseAndSeparators() {
        PresenceConfidence.Result r = PresenceConfidence.score(
                signals("a4-83-e7-c0-ff-ee", ROOM_AP, -50));
        assertEquals("HIGH", r.level());
    }

    @Test
    void cidrMatchWorks() {
        assertTrue(PresenceConfidence.ipInCidr("192.168.10.5", "192.168.0.0/16"));
        assertFalse(PresenceConfidence.ipInCidr("11.0.0.1", "10.0.0.0/8"));
        assertTrue(PresenceConfidence.ipInAnySubnet("172.16.4.1", CAMPUS));
    }

    @Test
    void manualMarkIsMedium() {
        PresenceConfidence.Result r = PresenceConfidence.manualMark();
        assertEquals("MEDIUM", r.level());
        assertEquals(55, r.score());
    }

    @Test
    void levelBoundaries() {
        assertEquals("HIGH", PresenceConfidence.levelFor(75));
        assertEquals("MEDIUM", PresenceConfidence.levelFor(50));
        assertEquals("LOW", PresenceConfidence.levelFor(49));
    }
}
