package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="companies")
public class CompaniesEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="code", length=32)
    private String code;
    @Column(name="name", length=120)
    private String name;
    @Column(name="industry", length=64)
    private String industry;
    @Column(name="contact", length=100)
    private String contact;
    @Column(name="description", columnDefinition="TEXT")
    private String description;
    @Column(name="enabled")
    private Boolean enabled;
    @Column(name="created_at")
    private java.time.LocalDateTime createdAt;
    protected CompaniesEntity() {}
}
