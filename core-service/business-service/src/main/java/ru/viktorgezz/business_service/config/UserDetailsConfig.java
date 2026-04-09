package ru.viktorgezz.business_service.config;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;

@Configuration
@RequiredArgsConstructor
public class UserDetailsConfig {

    private final UserRepo userRepo;

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> userRepo
                .findByUsername(username)
                .orElseThrow(EntityNotFoundException::new);
    }

}
