package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="permissions")
public class PermissionsEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="code", length=48)
    private String code;
    @Column(name="name", length=64)
    private String name;
    protected PermissionsEntity() {}
}
