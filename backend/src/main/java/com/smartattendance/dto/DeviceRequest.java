package com.smartattendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Data
@NoArgsConstructor @AllArgsConstructor
public class DeviceRequest {
    @NotBlank(message = "MAC address is required")
    @Pattern(regexp = "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$",
             message = "Invalid MAC address format (expected XX:XX:XX:XX:XX:XX)")
    private String macAddress;

    private String deviceName;
}
