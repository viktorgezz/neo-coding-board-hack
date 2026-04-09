package ru.viktorgezz.business_service.domain.code.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import lombok.RequiredArgsConstructor;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotWsRequest;
import ru.viktorgezz.business_service.domain.code.service.impl.CodeAsyncCommandService;

/**
 * Вебсокет-контроллер для приема изменений кода.
 */
@Controller
@RequiredArgsConstructor
public class CodeWsController {

    private final CodeAsyncCommandService codeAsyncCommandService;

    @MessageMapping("/code/update")
    public void pushCodeUpdate(CodeSnapshotWsRequest request) {
        codeAsyncCommandService.processIncomingSnapshot(request);
    }
}
