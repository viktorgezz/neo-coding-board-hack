package ru.viktorgezz.business_service.domain.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.viktorgezz.business_service.domain.user.dto.UserResponse;
import ru.viktorgezz.business_service.domain.user.dto.UserUpdateRequest;
import ru.viktorgezz.business_service.domain.user.service.intrf.UserCommandService;
import ru.viktorgezz.business_service.domain.user.service.intrf.UserQueryService;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Пользователи", description = "Управление пользователями системы")
public class UserController {

    private final UserQueryService userQueryService;
    private final UserCommandService userCommandService;

    @Operation(summary = "Получить список пользователей стаффа (HR, INTERVIEWER)")
    @GetMapping("/staff")
    public Page<UserResponse> getStaffMembers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return userQueryService.getStaffMembers(page, size);
    }

    @Operation(summary = "Получить список кандидатов (CANDIDATE)")
    @GetMapping("/candidates")
    public Page<UserResponse> getCandidates(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return userQueryService.getCandidates(page, size);
    }

    @Operation(summary = "Получить информацию о пользователе")
    @GetMapping("/{id}")
    public UserResponse getUserInfo(@PathVariable Long id) {
        return userQueryService.getUserInfo(id);
    }

    @Operation(summary = "Обновить информацию о пользователе")
    @PutMapping("/{id}")
    public UserResponse updateUser(
            @PathVariable Long id,
            @RequestBody @Valid UserUpdateRequest request) {
        return userCommandService.updateUser(id, request);
    }

    @Operation(summary = "Удалить пользователя")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userCommandService.deleteUser(id);
    }
}
