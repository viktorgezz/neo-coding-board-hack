package ru.viktorgezz.business_service;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"ru.viktorgezz.business_service", "ru.viktorgezz.security"})
@EnableScheduling
@EnableAsync
public class TestApplication {
}