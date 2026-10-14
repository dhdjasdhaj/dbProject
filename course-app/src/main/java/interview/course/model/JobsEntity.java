package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="jobs")
public class JobsEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="company_id")
    private Long companyId;
    @Column(name="title", length=120)
    private String title;
    @Column(name="category", length=64)
    private String category;
    @Column(name="city", length=64)
    private String city;
    @Column(name="description", columnDefinition="TEXT")
    private String description;
    @Column(name="planned_count")
    private Integer plannedCount;
    @Column(name="filled_count")
    private Integer filledCount;
    @Column(name="deadline")
    private java.time.LocalDateTime deadline;
    @Column(name="status", length=16)
    private String status;
    @Column(name="created_at")
    private java.time.LocalDateTime createdAt;
    protected JobsEntity() {}
}
