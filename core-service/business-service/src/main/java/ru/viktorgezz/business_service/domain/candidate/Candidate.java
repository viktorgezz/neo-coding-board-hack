package ru.viktorgezz.business_service.domain.candidate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.viktorgezz.business_service.domain.user.User;

@Entity
@Table(name = "candidates")
@Getter
@Setter
@NoArgsConstructor
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @OneToOne
    @JoinColumn(name = "id_user")
    private User user;

    public Candidate(String fullName, User user) {
        this.fullName = fullName;
        this.user = user;
    }
}
