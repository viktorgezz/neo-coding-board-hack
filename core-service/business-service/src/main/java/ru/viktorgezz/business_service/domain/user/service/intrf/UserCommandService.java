package ru.viktorgezz.business_service.domain.user.service.intrf;

import ru.viktorgezz.business_service.domain.user.User;

import ru.viktorgezz.business_service.domain.user.dto.UserResponse;
import ru.viktorgezz.business_service.domain.user.dto.UserUpdateRequest;

/**
 * Сервис для управления пользователями (создание, обновление, удаление).
 */
public interface UserCommandService {

    User save(User user);
    
    UserResponse updateUser(Long id, UserUpdateRequest request);
    
    void deleteUser(Long id);
}
