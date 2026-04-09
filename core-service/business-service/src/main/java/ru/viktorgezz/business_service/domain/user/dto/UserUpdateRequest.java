package ru.viktorgezz.business_service.domain.user.dto;

import ru.viktorgezz.business_service.domain.user.Role;

public record UserUpdateRequest(
        String username,
        Role role
) {
}
