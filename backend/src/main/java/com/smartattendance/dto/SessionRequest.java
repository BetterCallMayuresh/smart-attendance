package com.smartattendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor @AllArgsConstructor
public class SessionRequest {
    @NotBlank(message = "Course name is required")
    private String courseName;

    private String courseCode;

    /** Optional room binding; when set, attendance requires proximity to its AP. */
    private Long classroomId;
}
