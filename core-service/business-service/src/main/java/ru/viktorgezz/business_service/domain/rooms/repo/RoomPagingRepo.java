package ru.viktorgezz.business_service.domain.rooms.repo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.PagingAndSortingRepository;
import ru.viktorgezz.business_service.domain.rooms.Room;
import ru.viktorgezz.business_service.domain.rooms.RoomStatus;
import ru.viktorgezz.business_service.domain.user.User;

import java.util.UUID;

/**
 * Репозиторий для пагинированных запросов к сущности {@link Room}.
 */
public interface RoomPagingRepo extends PagingAndSortingRepository<Room, UUID> {

    /**
     * Находит комнаты, в которых участвует указанный интервьюер.
     *
     * @param interviewer пользователь-интервьюер
     * @param pageable    параметры пагинации
     * @return страница комнат
     */
    Page<Room> findByInterviewersContaining(User interviewer, Pageable pageable);

    /**
     * Находит все комнаты с указанным статусом.
     *
     * @param status   статус комнаты
     * @param pageable параметры пагинации
     * @return страница комнат
     */
    Page<Room> findByStatus(RoomStatus status, Pageable pageable);
}
