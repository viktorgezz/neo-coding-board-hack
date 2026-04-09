package ru.viktorgezz.business_service.domain.user.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.dto.UserResponse;
import ru.viktorgezz.business_service.domain.user.repo.UserPagingRepo;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;
import ru.viktorgezz.business_service.domain.user.service.intrf.UserQueryService;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.exception.ErrorCode;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserQueryServiceImpl implements UserQueryService {

    private final UserRepo userRepo;
    private final UserPagingRepo userPagingRepo;

    @Override
    public Optional<User> findByUsername(String username) {
        return userRepo.findByUsername(username);
    }

    @Override
    public Page<UserResponse> getStaffMembers(int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "username"));
        return userPagingRepo.findAllByRoleIn(List.of(Role.HR, Role.INTERVIEWER), pageRequest)
                .map(this::mapToResponse);
    }

    @Override
    public Page<UserResponse> getCandidates(int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "candidate.fullName"));
        return userPagingRepo.findAllByRoleWithCandidate(Role.CANDIDATE, pageRequest)
                .map(this::mapToResponse);
    }

    @Override
    public UserResponse getUserInfo(Long id) {
        Role role = userRepo.findRoleById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_ID_NOT_FOUND, id));

        User user;
        if (role == Role.CANDIDATE) {
            user = userRepo.findWithCandidateById(id)
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_ID_NOT_FOUND, id));
        } else {
            user = userRepo.findById(id)
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_ID_NOT_FOUND, id));
        }

        return mapToResponse(user);
    }

    private UserResponse mapToResponse(User user) {
        String displayUsername = user.getUsername();
        if (user.getRole() == Role.CANDIDATE && user.getCandidate() != null) {
            displayUsername = user.getCandidate().getFullName();
        }
        return new UserResponse(user.getId(), displayUsername, user.getRole());
    }
}
