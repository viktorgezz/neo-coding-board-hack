package ru.viktorgezz.business_service.domain.room;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.viktorgezz.business_service.domain.candidate.Candidate;
import ru.viktorgezz.business_service.domain.user.User;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Сущность комнаты для проведения интервью.
 */
@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "title_room", nullable = false)
    private String titleRoom;

    @Column(name = "name_vacancy", nullable = false)
    private String nameVacancy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status;

    @Column(name = "date_created", nullable = false)
    private Instant dateCreated;

    @Column(name = "date_start")
    private Instant dateStart;

    @Column(name = "date_end")
    private Instant dateEnd;

    @ManyToMany
    @JoinTable(
            name = "room_interviewers",
            joinColumns = @JoinColumn(name = "room_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> interviewers = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id")
    private Candidate candidate;

    public Room(String titleRoom, String nameVacancy, RoomStatus status, Instant dateCreated) {
        this.titleRoom = titleRoom;
        this.nameVacancy = nameVacancy;
        this.status = status;
        this.dateCreated = dateCreated;
    }
}
