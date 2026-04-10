package ru.viktorgezz.business_service.domain.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.dto.AdminUserResponse;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;

/**
 * Список учётных записей сотрудников для роли SUPERUSER (админ-панель).
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepo userRepo;

    @GetMapping
    public Page<AdminUserResponse> listStaffUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"));
        return userRepo.findAllByRoleNot(Role.CANDIDATE, pageable).map(this::toResponse);
    }

    private AdminUserResponse toResponse(User u) {
        String created = u.getCreatedAt() != null ? u.getCreatedAt().toString() : null;
        return new AdminUserResponse(
                String.valueOf(u.getId()),
                u.getUsername(),
                u.getUsername(),
                u.getRole().name(),
                created
        );
    }
}
