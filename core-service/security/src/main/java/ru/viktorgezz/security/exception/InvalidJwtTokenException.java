package ru.viktorgezz.security.exception;

/**
 * Исключение, выбрасываемое при обнаружении невалидного JWT токена.
 * <p>
 * Используется для обработки ошибок, связанных с некорректным форматом токена,
 * неправильной подписью, неверным типом токена или другими проблемами валидации JWT.
 * </p>
 */
public class InvalidJwtTokenException extends RuntimeException {

    public InvalidJwtTokenException(String message) {
        super(message);
    }
}
