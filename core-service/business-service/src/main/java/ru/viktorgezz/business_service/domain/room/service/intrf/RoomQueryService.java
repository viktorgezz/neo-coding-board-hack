package ru.viktorgezz.business_service.domain.room.service.intrf;

import org.springframework.data.domain.Page;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.dto.JoinInfoResponse;
import ru.viktorgezz.business_service.domain.room.dto.RoomSummaryResponse;

import java.util.UUID;

/**
 * Сервис для чтения данных о комнатах.
 */
public interface RoomQueryService {

    /**
     * Получает список комнат текущего интервьюера с пагинацией.
     *
     * @param page номер страницы
     * @param size размер страницы
     * @return страница с краткой информацией о комнатах
     */
    Page<RoomSummaryResponse> getRoomsByCurrentInterviewer(int page, int size);

    /**
     * Получает список всех комнат с пагинацией и опциональным фильтром по статусу.
     *
     * @param page   номер страницы
     * @param size   размер страницы
     * @param status фильтр по статусу (может быть null)
     * @return страница с краткой информацией о комнатах
     */
    Page<RoomSummaryResponse> getAllRooms(int page, int size, RoomStatus status);

    /**
     * Получает информацию о комнате для подключения по ссылке.
     *
     * @param idRoom идентификатор комнаты
     * @return информация о комнате
     */
    JoinInfoResponse getJoinInfo(UUID idRoom);
}
