package ru.viktorgezz.business_service.domain.room.dto;

/**
 * Ответ после создания комнаты.
 *
 * @param idRoom идентификатор созданной комнаты
 * @param url    ссылка для подключения к комнате
 */
public record RoomCreateResponse(
        String idRoom,
        String url
) {
}
