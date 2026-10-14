package interview.guide.modules.auth.web;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.common.result.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Read-only account directory. Access is restricted by /api/admin/** security rules. */
@RestController
@RequiredArgsConstructor
public class AdminUserController {
    private final JdbcTemplate db;
    public record UserSummary(long id, String username, String role, LocalDateTime createdAt) {}
    public record Stats(long total, long users, long administrators) {}
    public record UserPage(List<UserSummary> items, long total, int page, int pageSize, Stats stats) {}

    @GetMapping("/api/admin/users/{id}")
    @Transactional(readOnly = true)
    public Result<UserSummary> detail(@org.springframework.web.bind.annotation.PathVariable long id) {
        if (id <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "用户编号不正确");
        var rows = db.query("SELECT id,username,role,created_at FROM users WHERE id=?",
            (row, index) -> new UserSummary(row.getLong("id"), row.getString("username"),
                row.getString("role"), row.getTimestamp("created_at").toLocalDateTime()), id);
        if (rows.isEmpty()) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        return Result.success(rows.getFirst());
    }

    @GetMapping("/api/admin/users")
    @Transactional(readOnly = true)
    public Result<UserPage> list(@RequestParam(defaultValue = "") String q,
                                @RequestParam(defaultValue = "") String role,
                                @RequestParam(defaultValue = "0") int page) {
        q = q.trim();
        if (q.length() > 64 || page < 0 || page > 100000 ||
            (!role.isEmpty() && !List.of("USER", "ADMIN").contains(role))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "用户筛选参数不正确");
        }
        String where = " WHERE TRUE";
        var params = new ArrayList<Object>();
        if (!q.isEmpty()) {
            where += " AND username ILIKE ? ESCAPE '!'";
            params.add("%" + q.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
        }
        if (!role.isEmpty()) { where += " AND role=?"; params.add(role); }
        long total = db.queryForObject("SELECT COUNT(*) FROM users" + where, Long.class, params.toArray());
        params.add(20);
        params.add(page * 20);
        List<UserSummary> items = db.query("SELECT id,username,role,created_at FROM users" + where +
                " ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
            (row, index) -> new UserSummary(row.getLong("id"), row.getString("username"),
                row.getString("role"), row.getTimestamp("created_at").toLocalDateTime()), params.toArray());
        Stats stats = db.queryForObject("""
            SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE role='USER') AS members,
                   COUNT(*) FILTER (WHERE role='ADMIN') AS admins FROM users
            """, (row, index) -> new Stats(row.getLong("total"), row.getLong("members"), row.getLong("admins")));
        return Result.success(new UserPage(items, total, page, 20, stats));
    }
}
