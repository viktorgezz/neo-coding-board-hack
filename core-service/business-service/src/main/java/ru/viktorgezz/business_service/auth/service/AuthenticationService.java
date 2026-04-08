package ru.viktorgezz.business_service.auth.service;


import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.auth.dto.*;

/**
 * Сервис для аутентификации и регистрации пользователей.
 */
public interface AuthenticationService {

    /**
     * Выполняет аутентификацию пользователя и возвращает токены доступа.
     *
     * @param request запрос с учетными данными пользователя.
     * @return ответ с access и refresh токенами.
     */
    AuthenticationResponse login(AuthenticationRequest request);

    /**
     * Регистрирует нового пользователя в системе.
     *
     * @param request запрос с данными для регистрации.
     */
    void register(RegistrationRequest request);

    AuthenticationResponse registerCandidate(RegistrationCandidateRequest request);

    /**
     * Обновляет access токен с использованием refresh токена.
     *
     * @param request запрос с refresh токеном.
     * @return ответ с новым access токеном.
     * @throws ru.viktorgezz.business_service.exception.BusinessException если refresh токен недействителен или истек.
     */
    RefreshResponse refreshToken(RefreshRequest request);

    /**
     * Выполняет выход пользователя из системы, удаляя refresh токен.
     *
     * @param refreshToken refresh токен для удаления.
     */
    void logout(String refreshToken);
}
