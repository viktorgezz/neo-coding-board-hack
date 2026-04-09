package ru.viktorgezz.business_service.domain.note.dto;

import java.time.Instant;

/**
 * Ответ с данными заметки интервьюера.
 *
 * @param id          идентификатор заметки
 * @param textContent текст заметки
 * @param timeOffset  время от начала интервью в формате mm:ss
 * @param timeCreated абсолютное время создания записи в БД (UTC)
 * @param timeUpdated время последнего обновления заметки в БД (UTC, может быть null)
 */
public record NoteResponse(
        String id,
        String textContent,
        String timeOffset,
        Instant timeCreated,
        Instant timeUpdated
) {
}
