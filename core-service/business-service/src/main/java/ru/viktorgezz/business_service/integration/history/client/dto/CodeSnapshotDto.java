package ru.viktorgezz.business_service.integration.history.client.dto;

public record CodeSnapshotDto(
        String timestamp,
        String code,
        String language
) {
}
