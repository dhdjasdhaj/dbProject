package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="users")
public class UsersEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="external_user_id")
    private Long externalUserId;
    @Column(name="username", length=64)
    private String username;
    @Column(name="role_id")
    private Long roleId;
    @Column(name="enabled")
    private Boolean enabled;
    @Column(name="last_seen_at")
    private java.time.LocalDateTime lastSeenAt;
    @Column(name="created_at")
    private java.time.LocalDateTime createdAt;
    protected UsersEntity() {}
}
