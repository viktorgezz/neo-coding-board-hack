package ru.viktorgezz.business_service.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Ответ на обновление токена.
 *
 * @param accessToken выданный access-токен
 * @param tokenType тип токена (обычно "Bearer")
 */
public record RefreshResponse(
        @JsonProperty("access_token")
        String accessToken,

        @JsonProperty("token_type")
        String tokenType
) {
}
