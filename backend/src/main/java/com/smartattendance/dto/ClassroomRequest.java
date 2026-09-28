package com.smartattendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Data
@NoArgsConstructor @AllArgsConstructor
public class ClassroomRequest {

    @NotBlank(message = "Room name is required")
    private String name;

    @NotBlank(message = "Access point BSSID is required")
    @Pattern(
            regexp = "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$",
            message = "BSSID must look like A4:83:E7:C0:FF:EE")
    private String bssid;

    private String ssid;

    private Integer minRssiDbm;
}
