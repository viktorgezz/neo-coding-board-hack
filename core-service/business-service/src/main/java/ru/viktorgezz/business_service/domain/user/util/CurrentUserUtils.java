package ru.viktorgezz.business_service.domain.user.util;

import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.viktorgezz.business_service.domain.user.User;

/**
 * Утилитный класс для получения текущего аутентифицированного пользователя из SecurityContext.
 */
public class CurrentUserUtils {

    private CurrentUserUtils() {
    }

    /**
     * Получает текущего аутентифицированного пользователя из SecurityContext.
     *
     * @return объект {@link User} текущего пользователя
     * @throws RuntimeException если пользователь не аутентифицирован или principal не является User
     */
    public static User getCurrentUser() {
        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            throw new AuthenticationServiceException("User is not authenticated");
        }

        final Object principal = authentication.getPrincipal();

        if (principal == null) {
            throw new AuthenticationServiceException("Authentication principal is null");
        }

        if (!(principal instanceof User)) {
            throw new AuthenticationServiceException("Authentication principal is not an instance of User");
        }

        return (User) principal;
    }
}
