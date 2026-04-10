package ru.viktorgezz.business_service.domain.user.dto;

/**
 * Элемент списка пользователей для админ-панели (без пароля).
 */
public record AdminUserResponse(
        String id,
        String name,
        String email,
        String role,
        String createdAt
) {}
