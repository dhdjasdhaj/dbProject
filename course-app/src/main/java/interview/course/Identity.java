package interview.course;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import tools.jackson.databind.ObjectMapper;

@Component
public class Identity implements HandlerInterceptor {
    public record Actor(long id,long externalId,String username,String role,Set<String> permissions,String token) {
        public void require(String permission) { if(!permissions.contains(permission)) throw new Api.Failure(403,"无权执行此操作"); }
    }
    private final Db db;
    private final ObjectMapper json;
    private final String base;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).followRedirects(HttpClient.Redirect.NEVER).build();
    public Identity(Db db,ObjectMapper json,@Value("${course.auth-base-url}") String base) { this.db=db;this.json=json;this.base=base; }
    @SuppressWarnings("unchecked")
    public Map<String,Object> upstream(String path,String token) {
        try {
            var request=HttpRequest.newBuilder(URI.create(base+path)).timeout(Duration.ofSeconds(4)).header("Authorization",token).GET().build();
            var response=client.send(request,HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()>=500) throw new Api.Failure(503,"认证服务暂不可用，请稍后重试");
            Map<String,Object> envelope=json.readValue(response.body(),Map.class);
            if(!(envelope.get("code") instanceof Number code)) throw new Api.Failure(503,"认证服务响应异常");
            if(code.intValue()!=200) {
                if(code.intValue()==401) throw new Api.Failure(401,"登录已失效，请重新登录");
                if(code.intValue()==403) throw new Api.Failure(403,"无权访问原站账户目录");
                if(code.intValue()==404) throw new Api.Failure(404,"原站账户不存在");
                throw new Api.Failure(503,"认证服务暂不可用，请稍后重试");
            }
            if(!(envelope.get("data") instanceof Map)) throw new Api.Failure(503,"认证服务响应异常");
            return (Map<String,Object>)envelope.get("data");
        } catch(Api.Failure e) { throw e; }
        catch(InterruptedException e) { Thread.currentThread().interrupt(); throw new Api.Failure(503,"认证请求中断，请稍后重试"); }
        catch(Exception e) { throw new Api.Failure(503,"认证服务暂不可用，请稍后重试"); }
    }
    public long mapAccount(long externalId,String username) {
        db.update("INSERT INTO users(external_user_id,username,role_id) VALUES (?,?,1) ON DUPLICATE KEY UPDATE username=VALUES(username),last_seen_at=CURRENT_TIMESTAMP(3)",externalId,username);
        long id=Db.id(db.one("SELECT id FROM users WHERE external_user_id=?",externalId),"id");
        db.update("INSERT IGNORE INTO students(user_id) VALUES (?)",id);
        return id;
    }
    public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler) {
        if(request.getRequestURI().equals("/api/course/health")) return true;
        String token=request.getHeader("Authorization");
        if(token==null || !token.startsWith("Bearer ") || token.length()>4096) throw new Api.Failure(401,"请先登录");
        var legacy=upstream("/api/auth/me",token);
        if(!(legacy.get("userId") instanceof Number n) || !(legacy.get("username") instanceof String name)
                || !Set.of("USER","ADMIN").contains(String.valueOf(legacy.get("role")))) throw new Api.Failure(503,"认证服务响应异常");
        long id=mapAccount(n.longValue(),name);
        var user=db.one("SELECT u.enabled,r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",id);
        boolean admin="ADMIN".equals(legacy.get("role"));
        if(admin && !"ADMIN".equals(user.get("code"))) db.update("UPDATE users SET role_id=3 WHERE id=?",id);
        else if(!admin && "ADMIN".equals(user.get("code"))) db.update("UPDATE users SET role_id=1 WHERE id=?",id);
        if(!admin && !Db.truth(user.get("enabled"))) throw new Api.Failure(403,"您的就业模块访问已停用，原站其他功能仍可使用");
        String role=admin?"ADMIN":"STAFF".equals(user.get("code"))?"STAFF":"USER";
        Set<String> permissions=new HashSet<>();
        for(var p:db.rows("SELECT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN roles r ON r.id=rp.role_id WHERE r.code=?",role)) permissions.add((String)p.get("code"));
        request.setAttribute("course.actor",new Actor(id,n.longValue(),name,role,Set.copyOf(permissions),token));
        return true;
    }
    public static Actor actor(HttpServletRequest request) { return (Actor)request.getAttribute("course.actor"); }
}
