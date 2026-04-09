package ru.viktorgezz.business_service.domain.rooms.dto;

import java.time.Instant;

/**
 * Ответ после старта комнаты (переход CREATED → ACTIVE).
 *
 * @param idRoom    идентификатор комнаты
 * @param status    новый статус комнаты
 * @param dateStart время начала интервью (UTC)
 */
public record StartRoomResponse(
        String idRoom,
        String status,
        Instant dateStart
) {
}
