package interview.course.model;

import jakarta.persistence.*;

@Entity
@Table(name="role_permissions")
public class RolePermissionsEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="id")
    private Long id;
    @Column(name="role_id")
    private Long roleId;
    @Column(name="permission_id")
    private Long permissionId;
    protected RolePermissionsEntity() {}
}
