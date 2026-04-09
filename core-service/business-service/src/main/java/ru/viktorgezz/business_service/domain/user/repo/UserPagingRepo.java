package ru.viktorgezz.business_service.domain.user.repo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.repository.query.Param;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;

import java.util.List;

public interface UserPagingRepo extends PagingAndSortingRepository<User, Long> {

    @Query(value = "SELECT u FROM User u WHERE u.role IN :roles",
           countQuery = "SELECT count(u) FROM User u WHERE u.role IN :roles")
    Page<User> findAllByRoleIn(@Param("roles") List<Role> roles, Pageable pageable);

    @Query(value = "SELECT u FROM User u LEFT JOIN FETCH u.candidate WHERE u.role = :role",
           countQuery = "SELECT count(u) FROM User u WHERE u.role = :role")
    Page<User> findAllByRoleWithCandidate(@Param("role") Role role, Pageable pageable);
}
