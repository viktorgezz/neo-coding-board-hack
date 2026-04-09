package ru.viktorgezz.business_service.domain.user.service.impl;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;
import ru.viktorgezz.business_service.domain.user.service.intrf.UserCommandService;

/**
 * Сервис команд над пользователями. Реализует {@link UserCommandService}.
 */
@Service
public class UserCommandServiceImpl implements UserCommandService {

    private final UserRepo userRepo;

    @Autowired
    public UserCommandServiceImpl(UserRepo userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    @Transactional
    public User save(User user) {
        return userRepo.save(user);
    }

}
