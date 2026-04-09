package ru.viktorgezz.business_service.domain.note.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Запрос на создание заметки интервьюера.
 *
 * @param textContent содержание заметки
 */
public record NoteCreateRequest(

        @NotBlank(message = "Содержание заметки не должно быть пустым")
        String textContent
) {
}
