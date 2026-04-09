package ru.viktorgezz.business_service.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Запрос на аутентификацию пользователя (логин).
 *
 * @param name имя пользователя (в JSON допускаются также {@code username}, {@code login})
 * @param password пароль пользователя
 */
public record AuthenticationRequest(

        @NotBlank(message = "Имя не должно быть пустым")
        @Size(
                min = 2,
                max = 255,
                message = "Минимальная длина имени должна быть 2, а максимальная 255"
        )
        @JsonProperty("name")
        @JsonAlias({ "username", "login" })
        String name,

        @NotBlank(message = "Пароль не должен быть пустым")
        String password
) {
}
