package ru.viktorgezz.security.exception;

/**
 * Исключение, выбрасываемое при обнаружении истекшего JWT токена.
 * <p>
 * Используется для обработки ошибок, связанных с истечением срока действия
 * access или refresh токена. Токен считается истекшим, если его время жизни
 * превысило установленный лимит или токен был отозван (для refresh токенов).
 * </p>
 */
public class TokenExpiredException extends RuntimeException {

    public TokenExpiredException(String message) {
        super(message);
    }
}
