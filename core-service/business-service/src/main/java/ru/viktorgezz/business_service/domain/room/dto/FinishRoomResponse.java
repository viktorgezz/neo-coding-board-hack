package ru.viktorgezz.business_service.domain.room.dto;

import java.time.Instant;

/**
 * Ответ после завершения интервью.
 *
 * @param idRoom  идентификатор комнаты
 * @param timeEnd время завершения (UTC)
 */
public record FinishRoomResponse(
        String idRoom,
        Instant timeEnd
) {
}
