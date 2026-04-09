package ru.viktorgezz.business_service.domain.note.repo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.repository.query.Param;
import ru.viktorgezz.business_service.domain.note.Note;

import java.util.UUID;

/**
 * Репозиторий для пагинированных запросов к сущности {@link Note}.
 */
public interface NotePagingRepo extends PagingAndSortingRepository<Note, Long> {

    /**
     * Находит заметки комнаты с пагинацией, подгружая связанные сущности.
     *
     * @param roomId   идентификатор комнаты
     * @param pageable параметры пагинации
     * @return страница заметок
     */
    @Query(value = "SELECT n FROM Note n JOIN FETCH n.room JOIN FETCH n.interviewer WHERE n.room.id = :roomId",
           countQuery = "SELECT count(n) FROM Note n WHERE n.room.id = :roomId")
    Page<Note> findByRoomId(@Param("roomId") UUID roomId, Pageable pageable);
}
