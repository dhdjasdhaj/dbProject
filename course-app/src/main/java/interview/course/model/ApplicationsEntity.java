package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="applications")
public class ApplicationsEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="student_id")
    private Long studentId;
    @Column(name="job_id")
    private Long jobId;
    @Column(name="resume_file_id")
    private Long resumeFileId;
    @Column(name="status", length=20)
    private String status;
    @Column(name="note", length=1000)
    private String note;
    @Column(name="submitted_at")
    private java.time.LocalDateTime submittedAt;
    @Column(name="updated_at")
    private java.time.LocalDateTime updatedAt;
    protected ApplicationsEntity() {}
}
