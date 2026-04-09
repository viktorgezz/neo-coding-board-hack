package ru.viktorgezz.business_service.domain.rooms.repo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.PagingAndSortingRepository;
import ru.viktorgezz.business_service.domain.rooms.Room;
import ru.viktorgezz.business_service.domain.rooms.RoomStatus;
import ru.viktorgezz.business_service.domain.user.User;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
    @Query(value = "SELECT r FROM Room r LEFT JOIN FETCH r.candidate JOIN r.interviewers i WHERE i = :interviewer",
           countQuery = "SELECT count(r) FROM Room r JOIN r.interviewers i WHERE i = :interviewer")
    Page<Room> findByInterviewersContaining(@Param("interviewer") User interviewer, Pageable pageable);

    /**
     * Находит все комнаты с указанным статусом.
     *
     * @param status   статус комнаты
     * @param pageable параметры пагинации
     * @return страница комнат
     */
    @Query(value = "SELECT r FROM Room r LEFT JOIN FETCH r.candidate WHERE r.status = :status",
           countQuery = "SELECT count(r) FROM Room r WHERE r.status = :status")
    Page<Room> findByStatus(@Param("status") RoomStatus status, Pageable pageable);

    /**
     * Возвращает все комнаты с подгруженным кандидатом.
     *
     * @param pageable параметры пагинации
     * @return страница комнат
     */
    @Query(value = "SELECT r FROM Room r LEFT JOIN FETCH r.candidate",
           countQuery = "SELECT count(r) FROM Room r")
    Page<Room> findAll(Pageable pageable);
}
