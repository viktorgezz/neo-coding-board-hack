package ru.viktorgezz.business_service.domain.user.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.domain.candidate.Candidate;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.dto.UserResponse;
import ru.viktorgezz.business_service.domain.user.dto.UserUpdateRequest;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;
import ru.viktorgezz.business_service.domain.user.service.intrf.UserCommandService;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.exception.ErrorCode;

/**
 * Сервис команд над пользователями. Реализует {@link UserCommandService}.
 */
@Service
@RequiredArgsConstructor
public class UserCommandServiceImpl implements UserCommandService {

    private final UserRepo userRepo;

    @Override
    @Transactional
    public User save(User user) {
        return userRepo.save(user);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        User user = userRepo.findWithCandidateById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_ID_NOT_FOUND, id));

        user.setRole(request.role());

        if (request.role() == Role.CANDIDATE) {
            Candidate candidate = user.getCandidate();
            candidate.setFullName(request.username());
        } else {
            user.setUsername(request.username());
        }

        userRepo.save(user);

        return mapToResponse(user);
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_ID_NOT_FOUND, id));
        userRepo.delete(user);
    }

    private UserResponse mapToResponse(User user) {
        String displayUsername = user.getUsername();
        if (user.getRole() == Role.CANDIDATE && user.getCandidate() != null) {
            displayUsername = user.getCandidate().getFullName();
        }
        return new UserResponse(user.getId(), displayUsername, user.getRole());
    }

}
