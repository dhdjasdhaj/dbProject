package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="roles")
public class RolesEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="code", length=16)
    private String code;
    @Column(name="name", length=64)
    private String name;
    protected RolesEntity() {}
}
