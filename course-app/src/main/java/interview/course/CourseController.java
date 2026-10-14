package interview.course;

import java.util.*;
import java.nio.charset.StandardCharsets;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/course")
public class CourseController {
    private final CourseService service;
    private final Identity identity;
    private final FileService files;
    private final Db db;
    public CourseController(CourseService service,Identity identity,FileService files,Db db) {this.service=service;this.identity=identity;this.files=files;this.db=db;}
    @GetMapping("/health") public Api.Result<Map<String,Object>> health() {
        db.count("SELECT COUNT(*) FROM roles");return Api.Result.ok(Map.of("status","UP","module","employment","version","1.0.0"));
    }
    @GetMapping("/me") public Object me(HttpServletRequest r){return Api.Result.ok(service.me(Identity.actor(r)));}
    @GetMapping("/menus") public Object menus(HttpServletRequest r){return Api.Result.ok(service.menus(Identity.actor(r)));}
    @GetMapping("/dashboard") public Object dashboard(HttpServletRequest r){return Api.Result.ok(service.dashboard(Identity.actor(r)));}
    @GetMapping("/options/companies") public Object companyOptions(HttpServletRequest r) {
        Identity.actor(r).require("jobs.manage");
        return Api.Result.ok(db.rows("SELECT id,name FROM companies WHERE enabled=1 ORDER BY name,id"));
    }
    @GetMapping("/options/applications") public Object applicationOptions(HttpServletRequest r) {
        Identity.actor(r).require("employment.manage");
        return Api.Result.ok(db.rows("SELECT v.id,v.full_name,v.job_title,v.company_name FROM v_application_detail v WHERE v.status='INTERVIEWING' AND EXISTS(SELECT 1 FROM interview_rounds ir WHERE ir.application_id=v.id AND ir.status='COMPLETED') AND NOT EXISTS(SELECT 1 FROM employment_results er WHERE er.student_id=v.student_id) ORDER BY v.id DESC"));
    }
    @PutMapping("/students/me") public Object ownProfile(HttpServletRequest r,@Valid @RequestBody Api.Student f){return Api.Result.ok(service.saveProfile(Identity.actor(r),null,f));}
    @PutMapping("/students/{id}") public Object profile(HttpServletRequest r,@PathVariable long id,@Valid @RequestBody Api.Student f){return Api.Result.ok(service.saveProfile(Identity.actor(r),id,f));}
    @GetMapping({"/students","/companies","/jobs","/applications","/interviews","/employment-results","/files"})
    public Object list(HttpServletRequest r,@RequestParam Map<String,String> filters){
        String resource=r.getRequestURI().substring("/api/course/".length());
        return Api.Result.ok(service.list(Identity.actor(r),resource,filters));
    }
    @PostMapping("/companies") public Object company(HttpServletRequest r,@Valid @RequestBody Api.Company f){return Api.Result.ok(service.company(Identity.actor(r),null,f));}
    @PutMapping("/companies/{id}") public Object company(HttpServletRequest r,@PathVariable long id,@Valid @RequestBody Api.Company f){return Api.Result.ok(service.company(Identity.actor(r),id,f));}
    @PostMapping("/jobs") public Object job(HttpServletRequest r,@Valid @RequestBody Api.Job f){return Api.Result.ok(service.job(Identity.actor(r),null,f));}
    @PutMapping("/jobs/{id}") public Object job(HttpServletRequest r,@PathVariable long id,@Valid @RequestBody Api.Job f){return Api.Result.ok(service.job(Identity.actor(r),id,f));}
    @PostMapping("/applications") public Object apply(HttpServletRequest r,@Valid @RequestBody Api.Application f){return Api.Result.ok(service.apply(Identity.actor(r),f));}
    @PostMapping("/applications/{id}/{action:withdraw|review|reject}")
    public Object transition(HttpServletRequest r,@PathVariable long id,@PathVariable String action,@Valid @RequestBody(required=false) Api.Note f){return Api.Result.ok(service.transition(Identity.actor(r),id,action,f==null?null:f.note()));}
    @PostMapping("/interviews") public Object interview(HttpServletRequest r,@Valid @RequestBody Api.Interview f){return Api.Result.ok(service.schedule(Identity.actor(r),f));}
    @PostMapping("/interviews/{id}/cancel") public Object cancel(HttpServletRequest r,@PathVariable long id){return Api.Result.ok(service.cancel(Identity.actor(r),id));}
    @PostMapping("/interviews/{id}/scores") public Object scores(HttpServletRequest r,@PathVariable long id,@Valid @RequestBody Api.Scores f){return Api.Result.ok(service.score(Identity.actor(r),id,f));}
    @GetMapping("/interviews/{id}/scores") public Object scores(HttpServletRequest r,@PathVariable long id){
        var a=Identity.actor(r);var owner=db.one("SELECT s.user_id FROM interview_rounds ir JOIN applications ap ON ap.id=ir.application_id JOIN students s ON s.id=ap.student_id WHERE ir.id=?",id);
        if(!a.permissions().contains("interviews.manage")){a.require("apply");if(Db.id(owner,"userId")!=a.id()) throw new Api.Failure(403,"无权查看评分");}
        return Api.Result.ok(db.rows("SELECT sc.*,c.name FROM interview_scores sc JOIN evaluation_criteria c ON c.id=sc.criterion_id WHERE interview_id=? ORDER BY c.id",id));
    }
    @PostMapping("/employment-results") public Object hire(HttpServletRequest r,@Valid @RequestBody Api.Employment f){return Api.Result.ok(service.hire(Identity.actor(r),f));}
    @GetMapping("/reports/coverage") public Object coverage(HttpServletRequest r,@RequestParam Map<String,String> f){return Api.Result.ok(service.coverage(Identity.actor(r),f));}
    @GetMapping("/reports/{kind:jobs|students|funnel}") public Object report(HttpServletRequest r,@PathVariable String kind,@RequestParam Map<String,String> f){return Api.Result.ok(service.report(Identity.actor(r),kind,f));}
    @GetMapping("/reports/{kind:jobs|students|funnel}/export")
    public ResponseEntity<byte[]> export(HttpServletRequest r,@PathVariable String kind,@RequestParam Map<String,String> f){
        var filters=new HashMap<>(f);filters.put("size","100");filters.put("page","0");
        var first=service.report(Identity.actor(r),kind,filters);
        if(first.total()>10000) throw new Api.Failure(400,"单次导出最多 10000 条，请缩小筛选范围");
        var rows=new ArrayList<>(first.items());
        for(int p=1;rows.size()<first.total();p++){filters.put("page",String.valueOf(p));var batch=service.report(Identity.actor(r),kind,filters).items();if(batch.isEmpty())break;rows.addAll(batch);}
        StringBuilder csv=new StringBuilder("\uFEFF");
        if(!rows.isEmpty()) {
            csv.append(String.join(",",rows.getFirst().keySet())).append("\r\n");
            for(var row:rows){var fields=new ArrayList<String>();for(Object v:row.values()) fields.add(csvCell(v));csv.append(String.join(",",fields)).append("\r\n");}
        }
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=employment-"+kind+".csv")
            .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }
    static String csvCell(Object value){
        String v=value==null?"":String.valueOf(value);
        String trimmed=v.stripLeading();
        if(!trimmed.isEmpty()&&"=+-@".indexOf(trimmed.charAt(0))>=0)v="'"+v;
        return "\""+v.replace("\"","\"\"")+"\"";
    }
    @PostMapping("/files") public Object upload(HttpServletRequest r,@RequestParam MultipartFile file){return Api.Result.ok(files.upload(Identity.actor(r),file));}
    @GetMapping("/files/{id}/download") public ResponseEntity<byte[]> download(HttpServletRequest r,@PathVariable long id){
        var f=files.download(Identity.actor(r),id);
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(f.name(),StandardCharsets.UTF_8).build().toString())
            .header("X-Content-Type-Options","nosniff").header(HttpHeaders.CACHE_CONTROL,"no-store").contentType(MediaType.parseMediaType(f.type())).body(f.bytes());
    }
    @GetMapping("/admin/users") @SuppressWarnings("unchecked")
    public Object accounts(HttpServletRequest r,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="") String q){
        var a=Identity.actor(r);a.require("admin");if(page<0||page>100000||q.length()>64)throw new Api.Failure(400,"筛选条件无效");
        var source=new LinkedHashMap<>(identity.upstream("/api/admin/users?page="+page+"&q="+java.net.URLEncoder.encode(q,StandardCharsets.UTF_8),a.token()));
        var items=new ArrayList<Map<String,Object>>();
        for(var original:(List<Map<String,Object>>)source.get("items")) {
            var item=new LinkedHashMap<>(original);long external=((Number)item.get("id")).longValue();
            var mapped=db.rows("SELECT u.enabled,r.code AS module_role FROM users u JOIN roles r ON r.id=u.role_id WHERE external_user_id=?",external);
            boolean admin="ADMIN".equals(item.get("role"));
            item.put("moduleRole",admin?"ADMIN":mapped.isEmpty()?"USER":mapped.getFirst().get("moduleRole"));
            item.put("enabled",admin||mapped.isEmpty()||Db.truth(mapped.getFirst().get("enabled")));items.add(item);
        }
        source.put("items",items);source.put("size",20);return Api.Result.ok(source);
    }
    @PutMapping("/admin/users/{externalId}") public Object account(HttpServletRequest r,@PathVariable long externalId,@Valid @RequestBody Api.Account f){return Api.Result.ok(service.account(Identity.actor(r),externalId,f,identity));}
    @GetMapping("/admin/permissions") public Object grants(HttpServletRequest r){return Api.Result.ok(service.grants(Identity.actor(r)));}
    @PutMapping("/admin/permissions/{role}") public Object grants(HttpServletRequest r,@PathVariable String role,@Valid @RequestBody Api.Grants f){return Api.Result.ok(service.grants(Identity.actor(r),role,f));}
    @GetMapping("/admin/audit") public Object audit(HttpServletRequest r,@RequestParam Map<String,String> f){return Api.Result.ok(service.list(Identity.actor(r),"audit",f));}
}
