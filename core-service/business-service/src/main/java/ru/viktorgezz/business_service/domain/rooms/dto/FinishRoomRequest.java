package ru.viktorgezz.business_service.domain.rooms.dto;

import jakarta.validation.constraints.NotNull;
import ru.viktorgezz.business_service.domain.rooms.CodeResolution;

/**
 * Запрос на завершение интервью в комнате.
 * Поле codeResolution используется в endpoint PATCH /rooms/finish/{idRoom}.
 *
 * @param codeResolution результат прохождения (PASSED / REJECTED)
 */
public record FinishRoomRequest(

        @NotNull(message = "Результат прохождения не должен быть пустым")
        CodeResolution codeResolution
) {
}
