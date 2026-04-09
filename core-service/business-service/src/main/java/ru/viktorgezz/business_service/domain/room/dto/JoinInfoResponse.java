package ru.viktorgezz.business_service.domain.room.dto;

/**
 * Ответ с информацией о комнате для подключения по ссылке.
 *
 * @param idRoom      идентификатор комнаты
 * @param nameVacancy название вакансии
 */
public record JoinInfoResponse(
        String idRoom,
        String nameVacancy,
        String titleRoom
) {
}
