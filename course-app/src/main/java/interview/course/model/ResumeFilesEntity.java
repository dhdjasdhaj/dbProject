package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="resume_files")
public class ResumeFilesEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="owner_id")
    private Long ownerId;
    @Column(name="object_key", length=200)
    private String objectKey;
    @Column(name="original_name", length=200)
    private String originalName;
    @Column(name="content_type", length=120)
    private String contentType;
    @Column(name="file_size")
    private Long fileSize;
    @Column(name="created_at")
    private java.time.LocalDateTime createdAt;
    protected ResumeFilesEntity() {}
}
