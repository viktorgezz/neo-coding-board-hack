package ru.viktorgezz.business_service.domain.code.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CodeSnapshotListResponse {
    private List<CodeSnapshotResponse> content;
}
