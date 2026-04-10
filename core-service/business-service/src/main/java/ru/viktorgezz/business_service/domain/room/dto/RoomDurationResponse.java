package ru.viktorgezz.business_service.domain.room.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Ответ с длительностью собеседования.
 */
public record RoomDurationResponse(
        @Schema(description = "Длительность (например: '45 мин 12 с')", example = "45 мин 12 с")
        String duration
) {
}
