package ru.viktorgezz.business_service.domain.code.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CodeSnapshotResponse {
    private String id;
    private String textCode;
    private String language;
    private Instant timeCreated;
    private String timeOffset;
}
