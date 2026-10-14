package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="students")
public class StudentsEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="user_id")
    private Long userId;
    @Column(name="student_no", length=32)
    private String studentNo;
    @Column(name="full_name", length=64)
    private String fullName;
    @Column(name="college", length=100)
    private String college;
    @Column(name="major", length=100)
    private String major;
    @Column(name="graduation_year")
    private Integer graduationYear;
    @Column(name="contact", length=100)
    private String contact;
    @Column(name="profile_state", length=16)
    private String profileState;
    @Column(name="updated_at")
    private java.time.LocalDateTime updatedAt;
    protected StudentsEntity() {}
}
