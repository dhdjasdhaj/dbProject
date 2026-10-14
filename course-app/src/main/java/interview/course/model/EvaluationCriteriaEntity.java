package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="evaluation_criteria")
public class EvaluationCriteriaEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="code", length=32)
    private String code;
    @Column(name="name", length=64)
    private String name;
    @Column(name="max_score")
    private Integer maxScore;
    protected EvaluationCriteriaEntity() {}
}
