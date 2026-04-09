package ru.viktorgezz.business_service.domain.code;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.viktorgezz.business_service.domain.candidate.Candidate;
import ru.viktorgezz.business_service.domain.rooms.Room;
import ru.viktorgezz.business_service.domain.user.User;

import java.time.Instant;
import java.util.UUID;

/**
 * Сущность для хранения снимков кода.
 */
@Entity
@Table(name = "code_snapshots")
@Getter
@Setter
@NoArgsConstructor
public class CodeSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "text_code", nullable = false, columnDefinition = "TEXT")
    private String textCode;

    @Column(nullable = false)
    private String language;

    @Column(name = "time_created", nullable = false)
    private Instant timeCreated;

    @Column(name = "time_offset", nullable = false)
    private String timeOffset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id")
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User interviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    public CodeSnapshot(String textCode, String language, Instant timeCreated, String timeOffset, Candidate candidate, User interviewer, Room room) {
        this.textCode = textCode;
        this.language = language;
        this.timeCreated = timeCreated;
        this.timeOffset = timeOffset;
        this.candidate = candidate;
        this.interviewer = interviewer;
        this.room = room;
    }
}
