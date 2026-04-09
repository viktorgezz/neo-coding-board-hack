package ru.viktorgezz.business_service.domain.note.service.intrf;

import ru.viktorgezz.business_service.domain.note.dto.NoteCreateRequest;
import ru.viktorgezz.business_service.domain.note.dto.NoteResponse;
import ru.viktorgezz.business_service.domain.note.dto.NoteUpdateRequest;

import java.util.UUID;

/**
 * Сервис для модификации данных заметок (создание, обновление, удаление).
 */
public interface NoteCommandService {

    /**
     * Создаёт заметку в указанной комнате.
     * Интервьюер определяется из {@link ru.viktorgezz.business_service.domain.user.util.CurrentUserUtils}.
     * timeOffset вычисляется как разница между текущим временем и началом интервью (Room.dateStart).
     *
     * @param idRoom  идентификатор комнаты
     * @param request данные заметки
     * @return созданная заметка
     */
    NoteResponse createNote(UUID idRoom, NoteCreateRequest request);

    /**
     * Обновляет текстовое содержание заметки. timeOffset не изменяется, timeUpdated выставляется.
     *
     * @param idRoom  идентификатор комнаты
     * @param idNote  идентификатор заметки
     * @param request новые данные заметки
     * @return обновлённая заметка
     */
    NoteResponse updateNote(UUID idRoom, Long idNote, NoteUpdateRequest request);

    /**
     * Удаляет заметку.
     *
     * @param idRoom идентификатор комнаты
     * @param idNote идентификатор заметки
     */
    void deleteNote(UUID idRoom, Long idNote);
}
