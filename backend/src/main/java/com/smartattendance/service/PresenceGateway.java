package com.smartattendance.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class PresenceGateway {

    private final String restUrl;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    public PresenceGateway(@Value("${app.presence.rest-url}") String restUrl) {
        this.restUrl = restUrl.endsWith("/") ? restUrl.substring(0, restUrl.length() - 1) : restUrl;
    }

    public Map<String, Object> currentDevices() {
        return getJson("/presence/current");
    }

    public Map<String, Object> simulate(int count, int intervalMs, int outsideCount) {
        try {
            String body = mapper.writeValueAsString(Map.of(
                    "count", count,
                    "intervalMs", intervalMs,
                    "outsideCount", outsideCount
            ));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(restUrl + "/presence/simulate"))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            return mapper.readValue(response.body(), Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Presence simulator unavailable: " + e.getMessage());
        }
    }

    private Map<String, Object> getJson(String path) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(restUrl + path))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode node = mapper.readTree(response.body());
            return mapper.convertValue(node, Map.class);
        } catch (Exception e) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("success", false);
            fallback.put("devices", java.util.List.of());
            fallback.put("error", e.getMessage());
            return fallback;
        }
    }
}
