package ru.viktorgezz.business_service.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import ru.viktorgezz.business_service.auth.dto.*;
import ru.viktorgezz.business_service.auth.service.AuthenticationService;

/**
 * REST-контроллер для операций аутентификации пользователей.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Аутентификация", description = "Аутентификация и регистрация пользователей")
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    @Operation(summary = "Вход в систему (логин)")
    @PostMapping("/login")
    public AuthenticationResponse login(
            @RequestBody
            @Valid final AuthenticationRequest authenticationRequest
    ) {
        return authenticationService.login(authenticationRequest);
    }

    @Operation(summary = "Выход из системы (логаут)")
    @PostMapping("/logout")
    public void logout(final String refreshToken) {
        authenticationService.logout(refreshToken);
    }

    @Operation(summary = "Регистрация нового пользователя")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(
            @RequestBody
            @Valid final RegistrationRequest request
    ) {
        authenticationService.register(request);
    }

    @Operation(summary = "Обновление access-токена")
    @PostMapping("/refresh")
    public RefreshResponse refresh(
            @RequestBody
            @Valid final RefreshRequest request
    ) {
        return authenticationService.refreshToken(request);
    }
}
