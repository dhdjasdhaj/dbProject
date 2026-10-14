package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="audit_logs")
public class AuditLogsEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="actor_id")
    private Long actorId;
    @Column(name="action", length=64)
    private String action;
    @Column(name="resource_type", length=48)
    private String resourceType;
    @Column(name="resource_id")
    private Long resourceId;
    @Column(name="detail", length=2000)
    private String detail;
    @Column(name="created_at")
    private java.time.LocalDateTime createdAt;
    protected AuditLogsEntity() {}
}
