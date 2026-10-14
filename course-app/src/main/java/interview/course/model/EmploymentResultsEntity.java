package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="employment_results")
public class EmploymentResultsEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="student_id")
    private Long studentId;
    @Column(name="application_id")
    private Long applicationId;
    @Column(name="confirmed_at")
    private java.time.LocalDateTime confirmedAt;
    @Column(name="start_date")
    private java.time.LocalDate startDate;
    @Column(name="remarks", length=1000)
    private String remarks;
    protected EmploymentResultsEntity() {}
}
