package ru.viktorgezz.security.dto;

public record JwtPayload(
        String username,

        String role,

        Long id,

        long expiration
) {
}
