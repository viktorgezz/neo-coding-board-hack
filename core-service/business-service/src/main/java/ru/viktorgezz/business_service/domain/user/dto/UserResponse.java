package ru.viktorgezz.business_service.domain.user.dto;

import ru.viktorgezz.business_service.domain.user.Role;

public record UserResponse(
        Long id,
        String username,
        Role role
) {
}
