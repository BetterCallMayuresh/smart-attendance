package com.smartattendance.presence;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory ARP sightings used for recency + IP-clone detection. */
@Component
public class PresenceSightingStore {

    public record Sighting(String mac, String ip, Instant seenAt) {}

    private final Map<String, Sighting> lastByMac = new ConcurrentHashMap<>();

    public Sighting record(String mac, String ip) {
        if (mac == null) {
            return null;
        }
        String key = mac.toUpperCase();
        Sighting previous = lastByMac.get(key);
        Sighting next = new Sighting(key, ip, Instant.now());
        lastByMac.put(key, next);
        return previous;
    }

    public Sighting get(String mac) {
        if (mac == null) {
            return null;
        }
        return lastByMac.get(mac.toUpperCase());
    }
}
