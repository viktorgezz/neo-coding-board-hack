package ru.viktorgezz.business_service.domain.code.controller;

import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotListResponse;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotResponse;
import ru.viktorgezz.business_service.domain.code.service.intrf.CodeQueryService;

/**
 * REST-контроллер для управления историей кода и коммитами.
 */
@RestController
@RequestMapping("/api/v1/rooms/{idRoom}/code")
@RequiredArgsConstructor
@Tag(name = "Код", description = "История написания кода в комнате")
public class CodeController {

    private final CodeQueryService codeQueryService;

    @Operation(summary = "Получить последний снимок кода")
    @GetMapping("/latest")
    public CodeSnapshotResponse getLatestCode(@PathVariable UUID idRoom) {
        return codeQueryService.getLatestCode(idRoom);
    }

    @Operation(summary = "Получить всю историю снимков кода")
    @GetMapping("/snapshots")
    public CodeSnapshotListResponse getAllCodeSnapshots(@PathVariable UUID idRoom) {
        return codeQueryService.getAllSnapshots(idRoom);
    }

}
