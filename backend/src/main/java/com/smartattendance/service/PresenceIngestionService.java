package com.smartattendance.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Service that connects to the Node.js Presence Service via WebSocket
 * and processes presence events (device connected/disconnected).
 */
@Service
public class PresenceIngestionService {

    @Value("${app.presence.ws-url}")
    private String presenceWsUrl;

    @Autowired
    private AttendanceService attendanceService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private WebSocketClient wsClient;
    private final ScheduledExecutorService reconnectScheduler =
            Executors.newSingleThreadScheduledExecutor();
    private boolean running = true;

    @PostConstruct
    public void init() {
        connectToPresenceService();
    }

    private void connectToPresenceService() {
        try {
            wsClient = new WebSocketClient(new URI(presenceWsUrl)) {
                @Override
                public void onOpen(ServerHandshake handshake) {
                    System.out.println("[PresenceIngestion] Connected to Presence Service at "
                            + presenceWsUrl);
                }

                @Override
                public void onMessage(String message) {
                    handleMessage(message);
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    System.out.println("[PresenceIngestion] Disconnected: " + reason);
                    scheduleReconnect();
                }

                @Override
                public void onError(Exception ex) {
                    System.err.println("[PresenceIngestion] Error: " + ex.getMessage());
                }
            };
            wsClient.connect();
        } catch (Exception e) {
            System.err.println("[PresenceIngestion] Failed to connect: " + e.getMessage());
            scheduleReconnect();
        }
    }

    private void handleMessage(String message) {
        try {
            JsonNode json = objectMapper.readTree(message);
            String type = json.path("type").asText();

            if ("presence_event".equals(type)) {
                String mac = json.path("mac").asText();
                String ip = json.path("ip").asText();
                String status = json.path("status").asText();

                if ("connected".equals(status)) {
                    // Process: try to match MAC to student and mark attendance
                    attendanceService.processPresenceEvent(mac, ip);
                }
                // "disconnected" events are logged but don't un-mark attendance
            } else if ("snapshot".equals(type)) {
                // Full snapshot: process all devices
                JsonNode devices = json.path("devices");
                if (devices.isArray()) {
                    for (JsonNode device : devices) {
                        String mac = device.path("mac").asText();
                        String ip = device.path("ip").asText();
                        attendanceService.processPresenceEvent(mac, ip);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[PresenceIngestion] Error processing message: " + e.getMessage());
        }
    }

    private void scheduleReconnect() {
        if (running) {
            System.out.println("[PresenceIngestion] Reconnecting in 5 seconds...");
            reconnectScheduler.schedule(this::connectToPresenceService, 5, TimeUnit.SECONDS);
        }
    }

    @PreDestroy
    public void shutdown() {
        running = false;
        if (wsClient != null) {
            wsClient.close();
        }
        reconnectScheduler.shutdown();
    }
}
