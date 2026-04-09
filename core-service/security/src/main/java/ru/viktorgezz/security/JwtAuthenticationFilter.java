package ru.viktorgezz.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import ru.viktorgezz.security.exception.InvalidJwtTokenException;
import ru.viktorgezz.security.exception.TokenExpiredException;
import ru.viktorgezz.security.service.JwtService;

import java.io.IOException;

/**
 * Фильтр для аутентификации по JWT.
 * <p>
 * Порядок извлечения токена:
 * 1) Заголовок {@code Authorization: Bearer <token>}
 * 2) Cookie {@code accessToken}
 * 3) Попытка обновления по Cookie {@code refreshToken} с установкой нового access-токена в cookie
 * <p>
 * При успешной валидации формирует {@link UsernamePasswordAuthenticationToken}
 * и записывает его в {@link SecurityContextHolder}.
 */
@Slf4j
@RequiredArgsConstructor
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        try {
            String tokenAccess = getAccessToken(request);

            if (tokenAccess == null || SecurityContextHolder.getContext().getAuthentication() != null) {
                filterChain.doFilter(request, response);
                return;
            }

            final String username = jwtService.extractUsername(tokenAccess);

            if (username != null) {
                final UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtService.validateToken(tokenAccess, userDetails.getUsername())) {
                    final UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("User '{}' authenticated successfully.", username);
                }
            }
        } catch (TokenExpiredException | InvalidJwtTokenException e) {
            log.debug("{}", e.getMessage());
        } catch (Exception e) {
            log.error("{}", e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }

    private String getAccessToken(HttpServletRequest request) {
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
