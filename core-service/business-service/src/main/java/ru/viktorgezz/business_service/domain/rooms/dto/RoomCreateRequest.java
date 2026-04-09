package ru.viktorgezz.business_service.domain.rooms.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Запрос на создание новой комнаты для интервью.
 *
 * @param titleRoom    название комнаты
 * @param nameVacancy  название вакансии
 */
public record RoomCreateRequest(

        @NotBlank(message = "Название комнаты не должно быть пустым")
        String titleRoom,

        @NotBlank(message = "Название вакансии не должно быть пустым")
        String nameVacancy
) {
}
