package ru.viktorgezz.business_service.testconfig;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = {"ru.viktorgezz.business_service", "ru.viktorgezz.security"})
@EntityScan(basePackages = {"ru.viktorgezz.business_service", "ru.viktorgezz.security"})
public class JpaConfig {
}
