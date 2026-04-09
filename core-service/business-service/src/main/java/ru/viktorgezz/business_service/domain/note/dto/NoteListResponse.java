package ru.viktorgezz.business_service.domain.note.dto;

import java.util.List;

/**
 * Ответ со списком всех заметок комнаты (без пагинации).
 *
 * @param listNotes список заметок
 */
public record NoteListResponse(
        List<NoteResponse> listNotes
) {
}
