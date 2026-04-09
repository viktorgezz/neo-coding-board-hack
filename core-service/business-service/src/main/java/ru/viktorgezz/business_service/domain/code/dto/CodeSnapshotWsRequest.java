package ru.viktorgezz.business_service.domain.code.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CodeSnapshotWsRequest {
    private Long idCandidate;
    private Long idInterviewer;
    private UUID idRoom;
    private String language;
    private String textCode;
}
