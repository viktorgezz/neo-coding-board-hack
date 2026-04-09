package ru.viktorgezz.security.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.security.JwtProperties;
import ru.viktorgezz.security.RefreshToken;
import ru.viktorgezz.security.RefreshTokenRepo;
import ru.viktorgezz.security.UserDetailsCustom;
import ru.viktorgezz.security.dto.AuthResponseSecurity;
import ru.viktorgezz.security.dto.JwtPayload;
import ru.viktorgezz.security.exception.InvalidJwtTokenException;
import ru.viktorgezz.security.exception.TokenExpiredException;
import ru.viktorgezz.security.util.KeyUtils;

import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.Date;
import java.util.Map;

/**
 * Сервис работы с JWT-токенами. Реализует {@link JwtService}.
 */
@Slf4j
@Service
public class JwtServiceImpl implements JwtService {

    private static final String TOKEN_TYPE = "token_type";
    private static final String ROLE = "role";
    private static final String ID = "id";

    private final PrivateKey privateKey;
    private final PublicKey publicKey;

    private final long accessTokenExpirationEmployees;
    private final long accessTokenExpirationUsers;

    private final long refreshTokenExpirationEmployees;
    private final long refreshTokenExpirationUsers;

    private final RefreshTokenRepo refreshTokenRepo;
    private final UserDetailsService userDetailsService;
    private final JwtServiceImpl self;

    @Autowired
    public JwtServiceImpl(
            RefreshTokenRepo refreshTokenRepo,
            JwtProperties jwtProperties,
            UserDetailsService userDetailsService,
            @Lazy JwtServiceImpl self
    ) throws Exception {
        this.refreshTokenRepo = refreshTokenRepo;
        this.userDetailsService = userDetailsService;
        this.self = self;
        this.privateKey = KeyUtils.loadPrivateKey("keys/private_key.pem");
        this.publicKey = KeyUtils.loadPublicKey("keys/public_key.pem");
        this.accessTokenExpirationEmployees = jwtProperties.getEmployees().getAccessExpirationMs();
        this.accessTokenExpirationUsers = jwtProperties.getEmployees().getAccessExpirationMs();
        this.refreshTokenExpirationEmployees = jwtProperties.getUsers().getRefreshExpirationMs();
        this.refreshTokenExpirationUsers = jwtProperties.getUsers().getRefreshExpirationMs();
    }

    @Override
    public AuthResponseSecurity generateTokensForUser(String username, String role, Long id) {
        final String access = generateAccessToken(new JwtPayload(username, role, id, accessTokenExpirationUsers));
        final String refresh = self.generateRefreshToken(username, refreshTokenExpirationUsers);
        final String tokenType = "Bearer";

        return new AuthResponseSecurity(
                access,
                refresh,
                tokenType
        );
    }

    @Override
    public String generateAccessToken(final UserDetailsCustom userDetailsCustom) {
        final String role = userDetailsCustom.getRoleWithoutPrefix();
        final String username = userDetailsCustom.getUsername();
        final Long id = userDetailsCustom.getId();

        log.debug("Generate acc-token for {} with role: {}", username, role);
        final Map<String, Object> claims = Map.of(
                TOKEN_TYPE, "ACCESS_TOKEN",
                ROLE, role,
                ID, id
        );
        return buildToken(username, claims, accessTokenExpirationEmployees);
    }

    private String generateAccessToken(
            final String username,
            final String role,
            final Long id
    ) {
        final Map<String, Object> claims = Map.of(
                TOKEN_TYPE, "ACCESS_TOKEN",
                ROLE, role,
                ID, id
        );

        return buildToken(username, claims, accessTokenExpirationEmployees);
    }

    private String generateAccessToken(
            JwtPayload jwtPayload
    ) {
        final Map<String, Object> claims = Map.of(
                TOKEN_TYPE, "ACCESS_TOKEN",
                ROLE, jwtPayload.role(),
                ID, jwtPayload.id()
        );

        return buildToken(jwtPayload.username(), claims, jwtPayload.expiration());
    }

    @Transactional
    @Override
    public String generateRefreshToken(final UserDetails userDetails) {
        final String username = userDetails.getUsername();

        final Map<String, Object> claims = Map.of(TOKEN_TYPE, "REFRESH_TOKEN");
        final String refreshToken = buildToken(username, claims, refreshTokenExpirationEmployees);
        RefreshToken token = new RefreshToken(
                username,
                refreshToken,
                new Date(System.currentTimeMillis() + refreshTokenExpirationEmployees));

        refreshTokenRepo.save(token);
        return refreshToken;
    }

    @Transactional
    public String generateRefreshToken(String username, long expiration) {

        final Map<String, Object> claims = Map.of(TOKEN_TYPE, "REFRESH_TOKEN");
        final String refreshToken = buildToken(username, claims, expiration);
        RefreshToken token = new RefreshToken(
                username,
                refreshToken,
                new Date(System.currentTimeMillis() + expiration));

        refreshTokenRepo.save(token);
        return refreshToken;
    }

    @Override
    public boolean validateToken(final String token, final String usernameExpected) {
        final String username = extractUsername(token);
        return username.equals(usernameExpected) && !isTokenExpired(token);
    }

    @Override
    public String extractUsername(String token) {
        return extractClaimsStrict(token).getSubject();
    }

    @Override
    public String refreshToken(final String refreshToken) {
        final Claims claims = extractClaimsAllowExpired(refreshToken);
        final String username = claims.getSubject();
        final UserDetailsCustom userDetailsCustom = (UserDetailsCustom) userDetailsService.loadUserByUsername(username);
        final String role = userDetailsCustom.getRoleWithoutPrefix();
        final Long id = userDetailsCustom.getId();

        if (!"REFRESH_TOKEN".equals(claims.get(TOKEN_TYPE))) {
            throw new InvalidJwtTokenException("Invalid refresh token");
        } else if (isExpired(claims) || isRefreshTokenWithdrown(refreshToken, username)) {
            throw new TokenExpiredException("Refresh token expired");
        }

        return generateAccessToken(username, role, id);
    }

    @Transactional
    @Override
    public void dropRefreshToken(final String refreshToken) {
        refreshTokenRepo.deleteByToken(refreshToken);
    }

    private String buildToken(
            String username,
            Map<String, Object> claims,
            long expiration) {
        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(privateKey)
                .compact();
    }

    private boolean isTokenExpired(String token) {
        return isExpired(extractClaimsStrict(token));
    }

    private boolean isExpired(Claims claims) {
        return claims.getExpiration().before(new Date(System.currentTimeMillis()));
    }

    private Claims extractClaimsAllowExpired(String token) {
        try {
            return extractClaims(token);
        } catch (final ExpiredJwtException e) {
            return e.getClaims();
        } catch (final JwtException e) {
            throw new InvalidJwtTokenException(e.getMessage());
        }
    }

    private Claims extractClaimsStrict(String token) {
        try {
            return extractClaims(token);
        } catch (final ExpiredJwtException e) {
            throw new TokenExpiredException("Invalid access token");
        } catch (final JwtException e) {
            throw new InvalidJwtTokenException(e.getMessage());
        }
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private boolean isRefreshTokenWithdrown(String refreshToken, String username) {
        if (refreshToken == null) {
            return true;
        }

        boolean tokenExists = refreshTokenRepo
                .findRefreshTokensByUsername(username)
                .stream()
                .map(RefreshToken::getToken)
                .toList()
                .contains(refreshToken);

        return !tokenExists;
    }
}
