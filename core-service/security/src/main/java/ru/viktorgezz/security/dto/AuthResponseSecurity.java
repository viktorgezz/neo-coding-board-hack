package ru.viktorgezz.security.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AuthResponseSecurity(
        @JsonProperty("access_token")
        String accessToken,

        @JsonProperty("refresh_token")
        String refreshToken,

        @JsonProperty("token_type")
        String tokenType
) {
}
