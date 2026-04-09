package ru.viktorgezz.business_service.domain.user.repo;

import org.springframework.data.repository.CrudRepository;
import ru.viktorgezz.business_service.domain.user.User;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Репозиторий для доступа к сущностям {@link User}.
 */
public interface UserRepo extends CrudRepository<User, Long> {

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.candidate WHERE u.username = :username")
    Optional<User> findByUsername(@Param("username") String username);
}
