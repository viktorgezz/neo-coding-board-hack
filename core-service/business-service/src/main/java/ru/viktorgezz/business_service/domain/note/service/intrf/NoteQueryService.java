package ru.viktorgezz.business_service.domain.note.service.intrf;

import org.springframework.data.domain.Page;
import ru.viktorgezz.business_service.domain.note.dto.NoteListResponse;
import ru.viktorgezz.business_service.domain.note.dto.NoteResponse;

import java.util.UUID;

/**
 * Сервис для чтения данных заметок.
 */
public interface NoteQueryService {

    /**
     * Получает все заметки комнаты (без пагинации).
     *
     * @param idRoom идентификатор комнаты
     * @return список всех заметок
     */
    NoteListResponse getRoomNotes(UUID idRoom);

    /**
     * Получает заметки комнаты с пагинацией.
     *
     * @param idRoom идентификатор комнаты
     * @param page   номер страницы
     * @param size   размер страницы
     * @return страница заметок
     */
    Page<NoteResponse> getRoomNotesPaged(UUID idRoom, int page, int size);
}
