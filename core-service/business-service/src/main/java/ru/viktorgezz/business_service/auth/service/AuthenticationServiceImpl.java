package ru.viktorgezz.business_service.auth.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.auth.dto.*;
import ru.viktorgezz.business_service.domain.candidate.Candidate;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.service.intrf.UserCommandService;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.exception.ErrorCode;
import ru.viktorgezz.security.dto.AuthResponseSecurity;
import ru.viktorgezz.security.exception.InvalidJwtTokenException;
import ru.viktorgezz.security.exception.TokenExpiredException;
import ru.viktorgezz.security.service.JwtService;

import java.util.UUID;

/**
 * Сервис аутентификации пользователей. Реализует {@link AuthenticationService}.
 */
@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationServiceImpl.class);

    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserCommandService userCommandService;

    @Override
    public AuthenticationResponse login(AuthenticationRequest authRq) {
        final Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        authRq.name(),
                        authRq.password()));

        final User user = (User) authentication.getPrincipal();
        final String accessToken = jwtService.generateAccessToken(user);
        final String refreshToken = jwtService.generateRefreshToken(user);
        final String tokenType = "Bearer";

        return new AuthenticationResponse(
                accessToken,
                refreshToken,
                tokenType
        );
    }

    @Override
    @Transactional
    public void register(RegistrationRequest request) {
        checkPasswords(request.password());
        final User user = new User(
                request.username(),
                passwordEncoder.encode(request.password()),
                Role.valueOf(request.role().toString()),
                true,
                false,
                false
        );
        userCommandService.save(user);
        log.debug("Registering user: {}", user.getUsername());
    }

    @Transactional
    @Override
    public AuthenticationResponse registerCandidate(RegistrationCandidateRequest request) {
        final String fullName = request.fullName();
        final String username = UUID.randomUUID().toString();

        User user = new User(
                username,
                passwordEncoder.encode(UUID.randomUUID().toString()),
                Role.CANDIDATE,
                true,
                false,
                false
        );
        Candidate candidate = new Candidate(fullName, user);
        user.setCandidate(candidate);

        user = userCommandService.save(user);

        AuthResponseSecurity authResponseSecurity = jwtService.generateTokensForUser(username, Role.CANDIDATE.toString(), user.getId());
        log.debug("Registering user: {}, {}", candidate.getFullName(), user.getUsername());
        return new AuthenticationResponse(
                authResponseSecurity.accessToken(),
                authResponseSecurity.refreshToken(),
                authResponseSecurity.tokenType()
        );
    }

    @Override
    public RefreshResponse refreshToken(RefreshRequest request) {
        try {
            final String accessNewToken = jwtService.refreshToken(request.refreshToken());
            final String tokenType = "Bearer";

            return new RefreshResponse(
                    accessNewToken,
                    tokenType
            );
        } catch (InvalidJwtTokenException | TokenExpiredException e) {
            log.debug("Refresh token expired/invalid: {}", e.getMessage());
            throw new BusinessException(ErrorCode.TOKEN_REFRESH_EXPIRED);
        }
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        jwtService.dropRefreshToken(refreshToken);
    }

    private void checkPasswords(String password) {
        if (password == null) {
            throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);
        }
    }
}
