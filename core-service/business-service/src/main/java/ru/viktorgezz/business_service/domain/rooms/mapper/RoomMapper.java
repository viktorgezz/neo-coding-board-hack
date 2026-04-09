package ru.viktorgezz.business_service.domain.rooms.mapper;

import ru.viktorgezz.business_service.domain.rooms.Room;
import ru.viktorgezz.business_service.domain.rooms.dto.RoomSummaryResponse;

import java.time.Duration;
import java.time.Instant;

/**
 * Утилитный класс для маппинга сущности {@link Room} в DTO.
 */
public final class RoomMapper {

    private RoomMapper() {
    }

    /**
     * Маппинг сущности Room в RoomSummaryResponse.
     *
     * @param room сущность комнаты
     * @return DTO краткой информации о комнате
     */
    public static RoomSummaryResponse toSummary(Room room) {
        final String nameCandidate = room.getCandidate() != null
                ? room.getCandidate().getFullName()
                : null;

        return new RoomSummaryResponse(
                room.getId().toString(),
                nameCandidate,
                room.getStatus().name(),
                room.getDateStart(),
                room.getDateEnd(),
                calculateTimeOffset(room.getDateStart())
        );
    }

    /**
     * Вычисляет смещение времени от начала интервью до текущего момента в формате mm:ss.
     * Возвращает null, если интервью ещё не начато (статус CREATED).
     *
     * @param dateStart время начала интервью (может быть null)
     * @return строка в формате mm:ss или null
     */
    private static String calculateTimeOffset(Instant dateStart) {
        if (dateStart == null) {
            return null;
        }
        final Duration duration = Duration.between(dateStart, Instant.now());
        final long totalSeconds = duration.getSeconds();
        final long minutes = totalSeconds / 60;
        final long seconds = totalSeconds % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }
}
