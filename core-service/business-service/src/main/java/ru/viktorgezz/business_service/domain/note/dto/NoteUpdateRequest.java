package ru.viktorgezz.business_service.domain.note.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Запрос на обновление текста заметки.
 *
 * @param textContent новое содержание заметки
 */
public record NoteUpdateRequest(

        @NotBlank(message = "Содержание заметки не должно быть пустым")
        String textContent
) {
}
