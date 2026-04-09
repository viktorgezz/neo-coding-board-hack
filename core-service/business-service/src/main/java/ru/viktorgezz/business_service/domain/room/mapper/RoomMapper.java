package ru.viktorgezz.business_service.domain.room.mapper;

import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.dto.RoomSummaryResponse;
import ru.viktorgezz.business_service.domain.room.util.TimeOffsetUtils;

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
                room.getNameVacancy(),
                room.getTitleRoom(),
                nameCandidate,
                room.getStatus().name(),
                room.getDateStart(),
                room.getDateEnd(),
                TimeOffsetUtils.calculateFromNow(room.getDateStart())
        );
    }
}

