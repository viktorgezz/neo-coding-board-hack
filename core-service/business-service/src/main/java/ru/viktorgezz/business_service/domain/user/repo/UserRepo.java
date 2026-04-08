package ru.viktorgezz.business_service.domain.user.repo;

import org.springframework.data.repository.CrudRepository;
import ru.viktorgezz.business_service.domain.user.User;

import java.util.Optional;

/**
 * Репозиторий для доступа к сущностям {@link User}.
 */
public interface UserRepo extends CrudRepository<User, Long> {

    Optional<User> findByUsername(String username);
}
