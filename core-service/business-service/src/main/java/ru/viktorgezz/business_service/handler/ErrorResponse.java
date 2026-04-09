package ru.viktorgezz.business_service.handler;

import lombok.Getter;

import java.util.List;

/**
 * DTO ответа об ошибке для REST API.
 */
@Getter
public class ErrorResponse {

    private String message;
    private String code;
    private List<ValidationError> validationErrors;

    public ErrorResponse(String message, String code) {
        this.message = message;
        this.code = code;
    }

    public ErrorResponse(List<ValidationError> validationErrors) {
        this.validationErrors = validationErrors;
    }

    public ErrorResponse() {
    }

    @Override
    public String toString() {
        return "ErrorResponse{" +
                "message='" + message + '\'' +
                ", code='" + code + '\'' +
                ", validationErrors=" + validationErrors +
                '}';
    }
}