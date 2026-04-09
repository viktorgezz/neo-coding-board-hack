package ru.viktorgezz.business_service.domain.rooms.service.intrf;

import ru.viktorgezz.business_service.auth.dto.AuthenticationResponse;
import ru.viktorgezz.business_service.auth.dto.RegistrationCandidateRequest;
import ru.viktorgezz.business_service.domain.rooms.dto.FinishRoomRequest;
import ru.viktorgezz.business_service.domain.rooms.dto.FinishRoomResponse;
import ru.viktorgezz.business_service.domain.rooms.dto.RoomCreateRequest;
import ru.viktorgezz.business_service.domain.rooms.dto.RoomCreateResponse;
import ru.viktorgezz.business_service.domain.rooms.dto.StartRoomResponse;

import java.util.UUID;

/**
 * Сервис для модификации данных комнат (создание, удаление, регистрация, завершение).
 */
public interface RoomCommandService {

    /**
     * Создаёт новую комнату для интервью.
     * Создатель определяется из {@link ru.viktorgezz.business_service.domain.user.util.CurrentUserUtils}.
     *
     * @param request данные для создания комнаты
     * @return ответ с идентификатором комнаты и URL для подключения
     */
    RoomCreateResponse createRoom(RoomCreateRequest request);

    /**
     * Удаляет комнату по идентификатору.
     *
     * @param idRoom идентификатор комнаты
     */
    void deleteRoom(UUID idRoom);

    /**
     * Регистрирует кандидата в комнате.
     * Логика создания кандидата берётся из {@link ru.viktorgezz.business_service.auth.service.AuthenticationService#registerCandidate}.
     *
     * @param idRoom  идентификатор комнаты
     * @param request данные кандидата
     * @return ответ с токенами доступа
     */
    AuthenticationResponse registerCandidate(UUID idRoom, RegistrationCandidateRequest request);

    /**
     * Завершает интервью в комнате.
     *
     * @param idRoom  идентификатор комнаты
     * @param request данные о результате (codeResolution)
     * @return ответ с временем завершения
     */
    FinishRoomResponse finishRoom(UUID idRoom, FinishRoomRequest request);

    /**
     * Переводит комнату из статуса CREATED в ACTIVE и назначает время старта.
     *
     * @param idRoom идентификатор комнаты
     * @return ответ с новым статусом и временем старта
     */
    StartRoomResponse startRoom(UUID idRoom);
}
