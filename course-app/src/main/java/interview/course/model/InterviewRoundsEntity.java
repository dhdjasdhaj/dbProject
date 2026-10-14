package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="interview_rounds")
public class InterviewRoundsEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="application_id")
    private Long applicationId;
    @Column(name="round_no")
    private Integer roundNo;
    @Column(name="scheduled_at")
    private java.time.LocalDateTime scheduledAt;
    @Column(name="location", length=200)
    private String location;
    @Column(name="interviewer", length=64)
    private String interviewer;
    @Column(name="status", length=16)
    private String status;
    @Column(name="total_score")
    private Integer totalScore;
    @Column(name="comment", length=1000)
    private String comment;
    @Column(name="completed_at")
    private java.time.LocalDateTime completedAt;
    protected InterviewRoundsEntity() {}
}
