package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="menus")
public class MenusEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="parent_id")
    private Long parentId;
    @Column(name="label", length=64)
    private String label;
    @Column(name="path", length=120)
    private String path;
    @Column(name="permission_code", length=48)
    private String permissionCode;
    @Column(name="sort_order")
    private Integer sortOrder;
    @Column(name="portal", length=16)
    private String portal;
    protected MenusEntity() {}
}
