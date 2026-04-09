package ru.viktorgezz.business_service.auth.dto;

/**
 * Запрос на обновление access-токена по refresh-токену.
 *
 * @param refreshToken действующий refresh-токен
 */
public record RefreshRequest(
        String refreshToken
) {
}
