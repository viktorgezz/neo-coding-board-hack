package ru.viktorgezz.business_service.domain.note.mapper;

import ru.viktorgezz.business_service.domain.note.Note;
import ru.viktorgezz.business_service.domain.note.dto.NoteResponse;

/**
 * Утилитный класс для маппинга сущности {@link Note} в DTO.
 */
public final class NoteMapper {

    private NoteMapper() {
    }

    /**
     * Маппинг сущности Note в NoteResponse.
     *
     * @param note сущность заметки
     * @return DTO ответа заметки
     */
    public static NoteResponse toResponse(Note note) {
        return new NoteResponse(
                note.getId().toString(),
                note.getTextContent(),
                note.getTimeOffset(),
                note.getTimeCreated(),
                note.getTimeUpdated()
        );
    }
}
