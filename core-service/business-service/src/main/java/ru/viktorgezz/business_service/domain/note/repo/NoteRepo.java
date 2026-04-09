package ru.viktorgezz.business_service.domain.note.repo;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.CrudRepository;
import ru.viktorgezz.business_service.domain.note.Note;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Репозиторий для основных CRUD-операций над сущностью {@link Note}.
 */
public interface NoteRepo extends CrudRepository<Note, Long> {

    /**
     * Находит заметку по идентификатору и идентификатору комнаты.
     *
     * @param id     идентификатор заметки
     * @param roomId идентификатор комнаты
     * @return заметка, если найдена
     */
    @EntityGraph(attributePaths = {"room", "interviewer"})
    Optional<Note> findByIdAndRoomId(Long id, UUID roomId);

    /**
     * Возвращает все заметки комнаты, отсортированные по времени создания.
     *
     * @param roomId идентификатор комнаты
     * @return список заметок
     */
    @EntityGraph(attributePaths = {"room", "interviewer"})
    List<Note> findByRoomIdOrderByTimeCreatedAsc(UUID roomId);

}
