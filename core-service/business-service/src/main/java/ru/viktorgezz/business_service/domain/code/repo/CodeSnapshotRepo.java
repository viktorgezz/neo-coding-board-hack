package ru.viktorgezz.business_service.domain.code.repo;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.viktorgezz.business_service.domain.code.CodeSnapshot;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CodeSnapshotRepo extends JpaRepository<CodeSnapshot, UUID> {

    @EntityGraph(attributePaths = {"room", "candidate", "interviewer"})
    Optional<CodeSnapshot> findTopByRoomIdOrderByTimeCreatedDesc(UUID roomId);

    @EntityGraph(attributePaths = {"room", "candidate", "interviewer"})
    List<CodeSnapshot> findByRoomIdOrderByTimeCreatedAsc(UUID roomId);

}
