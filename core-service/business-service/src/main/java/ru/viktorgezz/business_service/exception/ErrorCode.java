package ru.viktorgezz.business_service.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * Перечень кодов и шаблонов сообщений ошибок бизнес-логики.
 */
@RequiredArgsConstructor
@Getter
public enum ErrorCode {

    USER_NOT_FOUND("User not found", "User with username: %s - not found", HttpStatus.NOT_FOUND),
    PASSWORD_MISMATCH("PASSWORD_MISMATCH", "Current password and new password are not the same", HttpStatus.BAD_REQUEST),
    BAD_CREDENTIALS("BAD_CREDENTIALS", "Username and / or password is incorrect", HttpStatus.UNAUTHORIZED),
    TOKEN_REFRESH_EXPIRED("UNAUTHORIZED", "JWT token is expired", HttpStatus.UNAUTHORIZED),
    ROOM_NOT_FOUND("ROOM_NOT_FOUND", "Room with id: %s - not found", HttpStatus.NOT_FOUND),
    ROOM_ALREADY_FINISHED("ROOM_ALREADY_FINISHED", "Room with id: %s is already finished", HttpStatus.BAD_REQUEST),
    CANDIDATE_ALREADY_REGISTERED("CANDIDATE_ALREADY_REGISTERED", "Candidate is already registered in room: %s", HttpStatus.CONFLICT),
    ROOM_NOT_IN_CREATED_STATUS("ROOM_NOT_IN_CREATED_STATUS", "Room with id: %s is not in CREATED status", HttpStatus.BAD_REQUEST),
    ROOM_NOT_ACTIVE("ROOM_NOT_ACTIVE", "Room with id: %s is not in ACTIVE status", HttpStatus.BAD_REQUEST),
    NOTE_NOT_FOUND("NOTE_NOT_FOUND", "Note with id: %s not found in room: %s", HttpStatus.NOT_FOUND),
    INTERNAL_EXCEPTION("INTERNAL_EXCEPTION", "Internal error", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String defaultMessage;
    private final HttpStatus status;
}
