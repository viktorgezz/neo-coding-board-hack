package ru.viktorgezz.business_service.domain.user.service.intrf;

import ru.viktorgezz.business_service.domain.user.User;

import org.springframework.data.domain.Page;
import ru.viktorgezz.business_service.domain.user.dto.UserResponse;

import java.util.Optional;

public interface UserQueryService {

    Optional<User> findByUsername(String username);

    Page<UserResponse> getStaffMembers(int page, int size);
    
    Page<UserResponse> getCandidates(int page, int size);
    
    UserResponse getUserInfo(Long id);
}
