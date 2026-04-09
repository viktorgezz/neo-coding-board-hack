package ru.viktorgezz.business_service.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistrationCandidateRequest(

        @NotBlank(message = "Имя не должно быть пустым")
        @Size(
                min = 2,
                max = 255,
                message = "Минимальная длина имени должна быть 2, а максимальная 255"
        )
        @JsonProperty("full_name")
        String fullName
) {
}
