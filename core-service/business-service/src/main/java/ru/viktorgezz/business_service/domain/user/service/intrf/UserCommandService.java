package ru.viktorgezz.business_service.domain.user.service.intrf;

import ru.viktorgezz.business_service.domain.user.User;

/**
 * Сервис для управления пользователями (создание, обновление).
 */
public interface UserCommandService {

    User save(User user);
}
