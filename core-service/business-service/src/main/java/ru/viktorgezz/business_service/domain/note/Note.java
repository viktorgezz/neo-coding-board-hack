package ru.viktorgezz.business_service.domain.note;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.user.User;

import java.time.Instant;

/**
 * Сущность приватной заметки интервьюера, привязанной к комнате.
 */
@Entity
@Table(name = "notes")
@Getter
@Setter
@NoArgsConstructor
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "text_content", nullable = false, columnDefinition = "TEXT")
    private String textContent;

    @Column(name = "time_offset", nullable = false)
    private String timeOffset;

    @Column(name = "time_created", nullable = false)
    private Instant timeCreated;

    @Column(name = "time_updated")
    private Instant timeUpdated;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interviewer_id", nullable = false)
    private User interviewer;

    public Note(String textContent, String timeOffset, Instant timeCreated, Room room, User interviewer) {
        this.textContent = textContent;
        this.timeOffset = timeOffset;
        this.timeCreated = timeCreated;
        this.room = room;
        this.interviewer = interviewer;
    }
}
