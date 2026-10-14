package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="interview_scores")
public class InterviewScoresEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="interview_id")
    private Long interviewId;
    @Column(name="criterion_id")
    private Long criterionId;
    @Column(name="score")
    private Integer score;
    @Column(name="max_score")
    private Integer maxScore;
    protected InterviewScoresEntity() {}
}
