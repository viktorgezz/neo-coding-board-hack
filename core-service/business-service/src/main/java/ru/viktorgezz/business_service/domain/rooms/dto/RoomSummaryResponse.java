package ru.viktorgezz.business_service.domain.rooms.dto;

import java.time.Instant;

/**
 * Краткая информация о комнате для отображения в списках.
 *
 * @param idRoom        идентификатор комнаты
 * @param nameCandidate имя кандидата (может быть null, если кандидат ещё не присоединился)
 * @param status        статус комнаты (ACTIVE, FINISHED)
 * @param dateStart     время создания (UTC)
 * @param dateEnd       время окончания (UTC, может быть null)
 * @param timeOffset    время от начала интервью в формате mm:ss
 */
public record RoomSummaryResponse(
        String idRoom,
        String nameCandidate,
        String status,
        Instant dateStart,
        Instant dateEnd,
        String timeOffset
) {
}
