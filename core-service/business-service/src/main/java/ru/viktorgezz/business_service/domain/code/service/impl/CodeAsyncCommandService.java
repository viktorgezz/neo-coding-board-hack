package ru.viktorgezz.business_service.domain.code.service.impl;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.util.Pair;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.domain.candidate.Candidate;
import ru.viktorgezz.business_service.domain.code.CodeSnapshot;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotWsRequest;
import ru.viktorgezz.business_service.domain.code.repo.CodeSnapshotRepo;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.domain.room.util.TimeOffsetUtils;
import ru.viktorgezz.business_service.domain.user.User;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CodeAsyncCommandService {

    private final Queue<Pair<CodeSnapshotWsRequest, Instant>> queue = new ConcurrentLinkedQueue<>();
    private final CodeSnapshotRepo codeSnapshotRepo;
    private final RoomRepo roomRepo;
    private final EntityManager entityManager;

    public void processIncomingSnapshot(CodeSnapshotWsRequest request) {
        queue.add(Pair.of(request, Instant.now()));
    }

    @Scheduled(fixedDelay = 2000)
    @Transactional
    public void flushQueue() {
        if (queue.isEmpty()) {
            return;
        }

        List<Pair<CodeSnapshotWsRequest, Instant>> batch = new ArrayList<>();
        while (!queue.isEmpty()) {
            Pair<CodeSnapshotWsRequest, Instant> pair = queue.poll();
            if (pair == null) break;
            batch.add(pair);
        }

        Set<UUID> roomIds = batch.stream()
                .map(p -> p.getFirst().getIdRoom())
                .collect(Collectors.toSet());

        Map<UUID, Instant> roomDateStartMap = roomRepo.findAllById(roomIds).stream()
                .filter(room -> room.getDateStart() != null)
                .collect(Collectors.toMap(
                        Room::getId,
                        Room::getDateStart
                ));

        List<CodeSnapshot> batchToSave = new ArrayList<>();

        for (Pair<CodeSnapshotWsRequest, Instant> pair : batch) {
            CodeSnapshotWsRequest req = pair.getFirst();
            Instant exactTimeCreated = pair.getSecond();

            Instant dateStart = roomDateStartMap.get(req.getIdRoom());
            String timeOffset = dateStart != null
                    ? TimeOffsetUtils.calculate(dateStart, exactTimeCreated)
                    : null;

            // Using EntityManager.getReference to create proxy objects without DB hits
            Candidate candidateProxy = req.getIdCandidate() != null
                    ? entityManager.getReference(Candidate.class, req.getIdCandidate())
                    : null;

            User interviewerProxy = req.getIdInterviewer() != null
                    ? entityManager.getReference(User.class, req.getIdInterviewer())
                    : null;

            Room roomProxy = entityManager.getReference(Room.class, req.getIdRoom());

            CodeSnapshot snapshot = new CodeSnapshot(
                    req.getTextCode(),
                    req.getLanguage(),
                    exactTimeCreated,
                    timeOffset,
                    candidateProxy,
                    interviewerProxy,
                    roomProxy);

            batchToSave.add(snapshot);
        }

        if (!batchToSave.isEmpty()) {
            codeSnapshotRepo.saveAll(batchToSave);
            log.debug("Successfully flushed {} code snapshots to DB", batchToSave.size());
        }
    }
}

