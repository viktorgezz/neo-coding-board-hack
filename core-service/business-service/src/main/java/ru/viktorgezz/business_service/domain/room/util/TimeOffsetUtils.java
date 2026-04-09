package ru.viktorgezz.business_service.domain.room.util;

import java.time.Duration;
import java.time.Instant;

/**
 * Утилитный класс для вычисления смещения времени от начала интервью.
 */
public final class TimeOffsetUtils {

    private TimeOffsetUtils() {
    }

    /**
     * Вычисляет смещение времени от начала интервью до указанного момента в формате mm:ss.
     *
     * @param dateStart время начала интервью (Room.dateStart)
     * @param now       текущий момент времени
     * @return строка в формате mm:ss
     */
    public static String calculate(Instant dateStart, Instant now) {
        final Duration duration = Duration.between(dateStart, now);
        final long totalSeconds = duration.getSeconds();
        final long minutes = totalSeconds / 60;
        final long seconds = totalSeconds % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }

    /**
     * Вычисляет смещение времени от начала интервью до текущего момента.
     * Возвращает null, если dateStart == null (интервью ещё не начато).
     *
     * @param dateStart время начала интервью (может быть null)
     * @return строка в формате mm:ss или null
     */
    public static String calculateFromNow(Instant dateStart) {
        if (dateStart == null) {
            return null;
        }
        return calculate(dateStart, Instant.now());
    }
}
