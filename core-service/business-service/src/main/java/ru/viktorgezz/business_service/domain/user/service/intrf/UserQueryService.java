package ru.viktorgezz.business_service.domain.user.service.intrf;

import ru.viktorgezz.business_service.domain.user.User;

import java.util.Optional;

public interface UserQueryService {

    Optional<User> findByUsername(String username);
}
