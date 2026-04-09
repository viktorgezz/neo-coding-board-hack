package ru.viktorgezz.security.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import ru.viktorgezz.security.RefreshTokenRepo;

import java.util.Date;

/**
 * Сервис для периодической очистки истекших refresh токенов из базы данных.
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class TokenCleanupService {

    private final RefreshTokenRepo refreshTokenRepo;

    @Scheduled(cron = "0 0 3 * * *")
    @Scheduled(cron = "0 30 12 * * *")
    @Transactional
    public void purgeExpiredTokens() {
        try {
            Date now = new Date();
            refreshTokenRepo.deleteExpiredTokens(now);
            log.debug("Purged expired tokens in {}", now);
        } catch (Exception e) {
            log.error("Error purging expired tokens {}", e.getMessage(), e);
        }
    }
}
