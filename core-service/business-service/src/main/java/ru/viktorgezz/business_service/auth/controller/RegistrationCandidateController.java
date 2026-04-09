package ru.viktorgezz.business_service.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.viktorgezz.business_service.auth.dto.AuthenticationResponse;
import ru.viktorgezz.business_service.auth.dto.RegistrationCandidateRequest;
import ru.viktorgezz.business_service.auth.service.AuthenticationService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/candidate")
public class RegistrationCandidateController {

    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthenticationResponse register(
            @RequestBody
            @Valid final RegistrationCandidateRequest request
    ) {
        return authenticationService.registerCandidate(request);
    }
}
