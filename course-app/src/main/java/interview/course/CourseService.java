package interview.course;

import static interview.course.Db.id;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** JDBC keeps joins explicit for the course; Hibernate validates all mapped tables at startup. */
@Service
public class CourseService {
    private final Db db;
    public CourseService(Db db) { this.db=db; }
    static void check(boolean ok,String message) { if(!ok) throw new Api.Failure(409,message); }
    static Timestamp time(OffsetDateTime t) { return Timestamp.from(t.toInstant()); }
    void audit(Identity.Actor a,String action,String type,long key,String detail) {
        db.update("INSERT INTO audit_logs(actor_id,action,resource_type,resource_id,detail) VALUES (?,?,?,?,?)",a.id(),action,type,key,detail);
    }
    public Map<String,Object> me(Identity.Actor a) {
        Map<String,Object> value=new LinkedHashMap<>();
        value.put("userId",a.id());value.put("externalUserId",a.externalId());value.put("username",a.username());
        value.put("role",a.role());value.put("permissions",a.permissions());
        value.put("portal","USER".equals(a.role())?"student":"teacher");
        value.put("profile",db.one("SELECT * FROM students WHERE user_id=?",a.id()));
        return value;
    }
    public List<Map<String,Object>> menus(Identity.Actor a) {
        return db.rows("SELECT m.* FROM menus m JOIN permissions p ON p.code=m.permission_code JOIN role_permissions rp ON rp.permission_id=p.id JOIN roles r ON r.id=rp.role_id WHERE r.code=? AND m.portal=? ORDER BY m.sort_order,m.id",a.role(),"USER".equals(a.role())?"STUDENT":"TEACHER");
    }
    public Map<String,Object> dashboard(Identity.Actor a) {
        a.require("dashboard");
        var own=db.one("SELECT COUNT(*) AS applications,COALESCE(SUM(ap.status='INTERVIEWING'),0) AS interviewing,COALESCE(SUM(ap.status='ACCEPTED'),0) AS hired FROM applications ap JOIN students s ON s.id=ap.student_id WHERE s.user_id=?",a.id());
        Map<String,Object> value=new LinkedHashMap<>(own);
        value.put("openJobs",db.count("SELECT COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id WHERE j.status='OPEN' AND j.deadline>UTC_TIMESTAMP(3) AND j.filled_count<j.planned_count AND c.enabled=1"));
        if(a.permissions().contains("students.manage")) value.put("studentCount",db.count("SELECT COUNT(*) FROM students s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id WHERE s.profile_state='COMPLETE' AND r.code='USER'"));
        if(a.permissions().contains("applications.manage")) value.put("pendingReview",db.count("SELECT COUNT(*) FROM applications WHERE status IN ('SUBMITTED','REVIEWING')"));
        if(a.permissions().contains("interviews.manage")) value.put("scheduledInterviews",db.count("SELECT COUNT(*) FROM interview_rounds WHERE status='SCHEDULED'"));
        if(a.permissions().contains("reports")) {
            value.put("totalApplications",db.count("SELECT COUNT(*) FROM applications"));
            value.put("totalHired",db.count("SELECT COUNT(*) FROM employment_results"));
        }
        return value;
    }
    @Transactional
    public Map<String,Object> saveProfile(Identity.Actor a,Long studentId,Api.Student form) {
        long key;
        if(studentId==null) { a.require("profile"); key=id(db.one("SELECT id FROM students WHERE user_id=? FOR UPDATE",a.id()),"id"); }
        else { a.require("students.manage"); key=id(db.one("SELECT id FROM students WHERE id=? FOR UPDATE",studentId),"id"); }
        db.update("UPDATE students SET student_no=?,full_name=?,college=?,major=?,graduation_year=?,contact=?,profile_state='COMPLETE',updated_at=UTC_TIMESTAMP(3) WHERE id=?",
            form.studentNo().trim(),form.fullName().trim(),form.college().trim(),form.major().trim(),form.graduationYear(),form.contact(),key);
        audit(a,"PROFILE_UPDATE","student",key,"完善学生档案"); return db.one("SELECT * FROM students WHERE id=?",key);
    }
    @Transactional
    public Map<String,Object> company(Identity.Actor a,Long key,Api.Company f) {
        a.require("companies.manage");
        if(key==null) key=db.insert("INSERT INTO companies(code,name,industry,contact,description,enabled) VALUES (?,?,?,?,?,?)",f.code().trim(),f.name().trim(),f.industry(),f.contact(),f.description(),f.enabled());
        else {
            db.one("SELECT id FROM companies WHERE id=? FOR UPDATE",key);
            db.update("UPDATE companies SET code=?,name=?,industry=?,contact=?,description=?,enabled=? WHERE id=?",f.code().trim(),f.name().trim(),f.industry(),f.contact(),f.description(),f.enabled(),key);
        }
        audit(a,"COMPANY_SAVE","company",key,"维护企业资料");return db.one("SELECT * FROM companies WHERE id=?",key);
    }
    @Transactional
    public Map<String,Object> job(Identity.Actor a,Long key,Api.Job f) {
        a.require("jobs.manage");
        if(key!=null) {
            var old=db.one("SELECT * FROM jobs WHERE id=? FOR UPDATE",key);
            check(f.plannedCount()>=id(old,"filledCount"),"招聘名额不能小于已录用人数");
            check(id(old,"companyId")==f.companyId(),"岗位所属企业创建后不能变更");
        }
        var company=db.one("SELECT * FROM companies WHERE id=? FOR UPDATE",f.companyId());
        if("OPEN".equals(f.status())) {
            check(Db.truth(company.get("enabled")),"企业已停用，不能开放岗位");
            check(f.deadline().toInstant().isAfter(Instant.now()),"开放岗位的截止时间必须晚于当前时间");
        }
        if(key==null) key=db.insert("INSERT INTO jobs(company_id,title,category,city,description,planned_count,deadline,status) VALUES (?,?,?,?,?,?,?,?)",
            f.companyId(),f.title().trim(),f.category(),f.city(),f.description(),f.plannedCount(),time(f.deadline()),f.status());
        else db.update("UPDATE jobs SET title=?,category=?,city=?,description=?,planned_count=?,deadline=?,status=? WHERE id=?",f.title().trim(),f.category(),f.city(),f.description(),f.plannedCount(),time(f.deadline()),f.status(),key);
        audit(a,"JOB_SAVE","job",key,"维护招聘岗位");return db.one("SELECT * FROM jobs WHERE id=?",key);
    }
    Map<String,Object> studentLock(long studentId) { return db.one("SELECT * FROM students WHERE id=? FOR UPDATE",studentId); }
    void notHired(long studentId) { check(db.rows("SELECT id FROM employment_results WHERE student_id=? FOR UPDATE",studentId).isEmpty(),"该学生已登记最终录用"); }
    static void active(Map<String,Object> application) {
        check(Set.of("SUBMITTED","REVIEWING","INTERVIEWING").contains(application.get("status")),"申请已终结，不能执行此操作");
    }
    @Transactional
    public Map<String,Object> apply(Identity.Actor a,Api.Application form) {
        a.require("apply");
        var student=db.one("SELECT * FROM students WHERE user_id=? FOR UPDATE",a.id());
        long sid=id(student,"id");
        check("COMPLETE".equals(student.get("profileState")),"请先完善个人档案"); notHired(sid);
        var job=db.one("SELECT j.*,c.enabled AS company_enabled FROM jobs j JOIN companies c ON c.id=j.company_id WHERE j.id=? FOR UPDATE",form.jobId());
        check("OPEN".equals(job.get("status")) && Db.truth(job.get("companyEnabled")),"岗位或企业已关闭");
        check(Instant.parse((String)job.get("deadline")).isAfter(Instant.now()),"岗位已截止");
        check(id(job,"filledCount")<id(job,"plannedCount"),"岗位名额已满");
        if(form.resumeFileId()!=null) {
            var file=db.one("SELECT owner_id FROM resume_files WHERE id=?",form.resumeFileId());
            if(id(file,"ownerId")!=a.id()) throw new Api.Failure(403,"只能使用自己的简历附件");
        }
        long key=db.insert("INSERT INTO applications(student_id,job_id,resume_file_id,note) VALUES (?,?,?,?)",sid,form.jobId(),form.resumeFileId(),form.note());
        audit(a,"APPLY","application",key,"提交岗位申请");return db.one("SELECT * FROM v_application_detail WHERE id=?",key);
    }
    /** All application mutations lock student before application, including hiring and scoring. */
    Map<String,Object> applicationLock(long key) {
        var preliminary=db.one("SELECT student_id FROM applications WHERE id=?",key);
        studentLock(id(preliminary,"studentId"));
        return db.one("SELECT * FROM applications WHERE id=? FOR UPDATE",key);
    }
    @Transactional
    public Map<String,Object> transition(Identity.Actor a,long key,String action,String note) {
        var app=applicationLock(key);active(app);
        String status;
        if("withdraw".equals(action)) {
            a.require("apply");
            if(id(db.one("SELECT user_id FROM students WHERE id=?",id(app,"studentId")),"userId")!=a.id()) throw new Api.Failure(403,"只能撤回自己的申请");
            status="WITHDRAWN";
        } else {
            a.require("applications.manage");
            if("review".equals(action)) { check("SUBMITTED".equals(app.get("status")),"只有新提交的申请可以开始审核"); status="REVIEWING"; }
            else if("reject".equals(action)) status="REJECTED";
            else throw new Api.Failure(404,"未知申请操作");
        }
        db.update("UPDATE applications SET status=?,note=COALESCE(?,note),updated_at=UTC_TIMESTAMP(3) WHERE id=?",status,note,key);
        if(Set.of("WITHDRAWN","REJECTED").contains(status)) db.update("UPDATE interview_rounds SET status='CANCELLED' WHERE application_id=? AND status='SCHEDULED'",key);
        audit(a,action.toUpperCase(Locale.ROOT),"application",key,status);return db.one("SELECT * FROM v_application_detail WHERE id=?",key);
    }
    @Transactional
    public Map<String,Object> schedule(Identity.Actor a,Api.Interview f) {
        a.require("interviews.manage");var app=applicationLock(f.applicationId());active(app);notHired(id(app,"studentId"));
        check(!"SUBMITTED".equals(app.get("status")),"请先开始审核再安排面试");
        check(f.scheduledAt().toInstant().isAfter(Instant.now()),"面试时间必须晚于当前时间");
        long next=db.count("SELECT COALESCE(MAX(round_no),0)+1 FROM interview_rounds WHERE application_id=?",f.applicationId());
        long key=db.insert("INSERT INTO interview_rounds(application_id,round_no,scheduled_at,location,interviewer) VALUES (?,?,?,?,?)",f.applicationId(),next,time(f.scheduledAt()),f.location(),f.interviewer());
        db.update("UPDATE applications SET status='INTERVIEWING',updated_at=UTC_TIMESTAMP(3) WHERE id=?",f.applicationId());
        audit(a,"SCHEDULE","interview",key,"安排第 "+next+" 轮面试");return db.one("SELECT * FROM interview_rounds WHERE id=?",key);
    }
    @Transactional
    public Map<String,Object> cancel(Identity.Actor a,long key) {
        a.require("interviews.manage");long ap=id(db.one("SELECT application_id FROM interview_rounds WHERE id=?",key),"applicationId");
        var app=applicationLock(ap);active(app);
        check(db.update("UPDATE interview_rounds SET status='CANCELLED' WHERE id=? AND status='SCHEDULED'",key)==1,"只有待进行面试可以取消");
        audit(a,"CANCEL","interview",key,"取消面试");return db.one("SELECT * FROM interview_rounds WHERE id=?",key);
    }
    @Transactional
    public Map<String,Object> score(Identity.Actor a,long key,Api.Scores f) {
        a.require("interviews.manage"); long ap=id(db.one("SELECT application_id FROM interview_rounds WHERE id=?",key),"applicationId");
        var app=applicationLock(ap);active(app);notHired(id(app,"studentId"));
        var round=db.one("SELECT * FROM interview_rounds WHERE id=? FOR UPDATE",key);
        check("SCHEDULED".equals(round.get("status")),"面试已完成或取消，不能重复评分");
        int[] scores={f.communication(),f.professional(),f.fit()};
        var criteria=db.rows("SELECT * FROM evaluation_criteria ORDER BY id");
        check(criteria.size()==3,"评分项目配置异常");
        int total=0;
        for(int i=0;i<3;i++) {
            int max=((Number)criteria.get(i).get("maxScore")).intValue();
            check(scores[i]>=0 && scores[i]<=max,"评分超出项目上限");
            db.update("INSERT INTO interview_scores(interview_id,criterion_id,score,max_score) VALUES (?,?,?,?)",key,id(criteria.get(i),"id"),scores[i],max);total+=scores[i];
        }
        db.update("UPDATE interview_rounds SET total_score=?,comment=?,status='COMPLETED',completed_at=UTC_TIMESTAMP(3) WHERE id=?",total,f.comment(),key);
        audit(a,"SCORE","interview",key,"总分 "+total);return db.one("SELECT * FROM interview_rounds WHERE id=?",key);
    }
    @Transactional
    public Map<String,Object> hire(Identity.Actor a,Api.Employment f) {
        a.require("employment.manage");var app=applicationLock(f.applicationId());
        var existing=db.rows("SELECT * FROM employment_results WHERE application_id=? FOR UPDATE",f.applicationId());
        if(!existing.isEmpty()) return existing.getFirst();
        active(app);long sid=id(app,"studentId");notHired(sid);
        check(db.count("SELECT COUNT(*) FROM interview_rounds WHERE application_id=? AND status='COMPLETED'",f.applicationId())>0,"请先完成至少一轮面试评分");
        check(db.update("UPDATE jobs SET filled_count=filled_count+1 WHERE id=? AND filled_count<planned_count AND status<>'ARCHIVED'",id(app,"jobId"))==1,"岗位名额已满或岗位已归档");
        long key=db.insert("INSERT INTO employment_results(student_id,application_id,start_date,remarks) VALUES (?,?,?,?)",sid,f.applicationId(),f.startDate(),f.remarks());
        db.update("UPDATE applications SET status='ACCEPTED',updated_at=UTC_TIMESTAMP(3) WHERE id=?",f.applicationId());
        db.update("UPDATE interview_rounds SET status='CANCELLED' WHERE status='SCHEDULED' AND application_id IN (SELECT id FROM applications WHERE student_id=?)",sid);
        audit(a,"HIRE","employment",key,"登记最终录用");return db.one("SELECT * FROM employment_results WHERE id=?",key);
    }
    public Api.Page list(Identity.Actor a,String resource,Map<String,String> filters) {
        String from;String search;List<Object> args=new ArrayList<>();StringBuilder where=new StringBuilder(" WHERE 1=1");
        switch(resource) {
            case "students" -> { a.require("students.manage");from="students x JOIN users u ON u.id=x.user_id JOIN roles r ON r.id=u.role_id";search="CONCAT_WS(' ',x.student_no,x.full_name,x.college,x.major,u.username)";where.append(" AND r.code='USER'");exact(filters,"profileState","x.profile_state",where,args); }
            case "companies" -> { a.require("companies.manage");from="companies x";search="CONCAT_WS(' ',x.code,x.name,x.industry)"; }
            case "jobs" -> { a.require("jobs.read");from="jobs x JOIN companies c ON c.id=x.company_id";search="CONCAT_WS(' ',x.title,x.city,x.category,c.name)";
                if(!a.permissions().contains("jobs.manage")) where.append(" AND x.status='OPEN' AND x.deadline>UTC_TIMESTAMP(3) AND x.filled_count<x.planned_count AND c.enabled=1"); }
            case "applications" -> { from="v_application_detail x";search="CONCAT_WS(' ',x.full_name,x.student_no,x.job_title,x.company_name)"; scope(a,"applications.manage",where,args,"x.user_id"); }
            case "interviews" -> { from="interview_rounds x JOIN v_application_detail v ON v.id=x.application_id";search="CONCAT_WS(' ',v.full_name,v.job_title,v.company_name,x.interviewer)"; scope(a,"interviews.manage",where,args,"v.user_id"); }
            case "employment-results" -> { from="employment_results x JOIN v_application_detail v ON v.id=x.application_id";search="CONCAT_WS(' ',v.full_name,v.job_title,v.company_name)"; scope(a,"employment.manage",where,args,"v.user_id"); }
            case "files" -> { a.require("apply");from="resume_files x";search="x.original_name";where.append(" AND x.owner_id=?");args.add(a.id()); }
            case "audit" -> { a.require("admin");from="audit_logs x JOIN users u ON u.id=x.actor_id";search="CONCAT_WS(' ',x.action,x.detail,u.username)"; }
            default -> throw new Api.Failure(404,"未知查询资源");
        }
        filterText(filters,where,args,search);
        if(Set.of("jobs","applications","interviews").contains(resource)) exact(filters,"status","x.status",where,args);
        if("jobs".equals(resource)) { numeric(filters,"companyId","x.company_id",where,args);exact(filters,"city","x.city",where,args); }
        if(Set.of("students","applications").contains(resource)) { exact(filters,"college","x.college",where,args);numeric(filters,"graduationYear","x.graduation_year",where,args); }
        String columns=switch(resource) {
            case "students" -> "x.*,u.username,u.enabled";
            case "jobs" -> "x.*,c.name AS company_name";
            case "interviews","employment-results" -> "x.*,v.full_name,v.student_no,v.job_title,v.company_name,v.resume_file_id";
            case "audit" -> "x.*,u.username";
            default -> "x.*";
        };
        return page("SELECT "+columns+" FROM "+from+where,args,filters,Set.of("id"));
    }
    static void scope(Identity.Actor a,String permission,StringBuilder where,List<Object> args,String ownerColumn) {
        if(!a.permissions().contains(permission)) { a.require("apply"); where.append(" AND ").append(ownerColumn).append("=?");args.add(a.id()); }
    }
    static void filterText(Map<String,String> f,StringBuilder w,List<Object> args,String expression) {
        String q=f.getOrDefault("q","").trim();if(q.length()>100) throw new Api.Failure(400,"搜索词过长");
        if(!q.isBlank()) { w.append(" AND ").append(expression).append(" LIKE ? ESCAPE '!'");args.add("%"+q.replace("!","!!").replace("%","!%").replace("_","!_")+"%"); }
    }
    static void exact(Map<String,String> f,String key,String column,StringBuilder w,List<Object> args) {
        String v=f.get(key);if(v!=null && !v.isBlank()) { if(v.length()>100) throw new Api.Failure(400,"筛选条件过长");w.append(" AND ").append(column).append("=?");args.add(v); }
    }
    static void numeric(Map<String,String> f,String key,String column,StringBuilder w,List<Object> args) {
        String v=f.get(key);if(v!=null && !v.isBlank()) { try {long value=Long.parseLong(v);if(value<=0) throw new NumberFormatException();w.append(" AND ").append(column).append("=?");args.add(value); }catch(NumberFormatException e) {throw new Api.Failure(400,"筛选编号不正确");} }
    }
    Api.Page page(String sql,List<Object> args,Map<String,String> filters,Set<String> sorts) {
        int p,size;
        try { p=Integer.parseInt(filters.getOrDefault("page","0"));size=Integer.parseInt(filters.getOrDefault("size","20")); }
        catch(NumberFormatException e) {throw new Api.Failure(400,"分页参数不正确");}
        if(p<0 || p>100000 || size<1 || size>100) throw new Api.Failure(400,"分页参数不正确");
        String sort=filters.getOrDefault("sort","id"),direction=filters.getOrDefault("direction","desc");
        if(!sorts.contains(sort)||!Set.of("asc","desc").contains(direction)) throw new Api.Failure(400,"排序字段不支持");
        long total=db.count("SELECT COUNT(*) FROM ("+sql+") counted",args.toArray());
        List<Object> paged=new ArrayList<>(args);paged.add(size);paged.add((long)p*size);
        return new Api.Page(db.rows("SELECT * FROM ("+sql+") listed ORDER BY "+sort+" "+direction+", id "+direction+" LIMIT ? OFFSET ?",paged.toArray()),total,p,size);
    }
    public Api.Page report(Identity.Actor a,String kind,Map<String,String> filters) {
        a.require("reports");List<Object> args=new ArrayList<>();StringBuilder w=new StringBuilder(" WHERE 1=1");String sql;Set<String> sorts;
        switch(kind) {
            case "jobs" -> {
                filterText(filters,w,args,"CONCAT_WS(' ',x.title,x.company_name,x.city)");exact(filters,"status","x.status",w,args);numeric(filters,"companyId","x.company_id",w,args);
                sql="SELECT x.* FROM v_job_recruitment_summary x"+w;sorts=Set.of("id","application_count","interview_count","hired_count","remaining_count");
            }
            case "students" -> {
                filterText(filters,w,args,"CONCAT_WS(' ',x.full_name,x.student_no,x.company_name)");exact(filters,"college","x.college",w,args);exact(filters,"major","x.major",w,args);numeric(filters,"graduationYear","x.graduation_year",w,args);
                sql="SELECT x.* FROM v_student_hiring_summary x"+w;sorts=Set.of("id","application_count","graduation_year");
            }
            case "funnel" -> {
                range(filters,w,args,"a.submitted_at");
                sql="SELECT 1 AS id,COUNT(*) AS submitted,COALESCE(SUM(EXISTS(SELECT 1 FROM audit_logs al WHERE al.resource_type='application' AND al.resource_id=a.id AND al.action='REVIEW')),0) AS reviewed,COUNT(DISTINCT ir.application_id) AS interviewed,COUNT(DISTINCT er.application_id) AS hired FROM applications a LEFT JOIN (SELECT DISTINCT application_id FROM interview_rounds WHERE status='COMPLETED') ir ON ir.application_id=a.id LEFT JOIN employment_results er ON er.application_id=a.id"+w;
                sorts=Set.of("id");
            }
            default -> throw new Api.Failure(404,"未知报表");
        }
        return page(sql,args,filters,sorts);
    }
    public Map<String,Object> coverage(Identity.Actor a,Map<String,String> f) {
        a.require("reports");var args=new ArrayList<Object>();var w=new StringBuilder(" WHERE x.profile_state='COMPLETE' AND x.enabled=1");
        exact(f,"college","x.college",w,args);exact(f,"major","x.major",w,args);numeric(f,"graduationYear","x.graduation_year",w,args);
        return db.one("SELECT COUNT(*) AS eligible,COUNT(x.employment_id) AS hired,COALESCE(ROUND(100.0*COUNT(x.employment_id)/NULLIF(COUNT(*),0),2),0) AS percentage FROM v_student_hiring_summary x"+w,args.toArray());
    }
    static void range(Map<String,String> f,StringBuilder w,List<Object> args,String column) {
        try {
            Instant start=f.containsKey("start")&&!f.get("start").isBlank()?OffsetDateTime.parse(f.get("start")).toInstant():null;
            Instant end=f.containsKey("end")&&!f.get("end").isBlank()?OffsetDateTime.parse(f.get("end")).toInstant():null;
            if(start!=null && end!=null && !start.isBefore(end)) throw new Api.Failure(400,"结束时间必须晚于开始时间");
            if(start!=null){w.append(" AND ").append(column).append(">=?");args.add(Timestamp.from(start));}
            if(end!=null){w.append(" AND ").append(column).append("<?");args.add(Timestamp.from(end));}
        } catch(java.time.format.DateTimeParseException e){throw new Api.Failure(400,"时间筛选需携带时区");}
    }
    @Transactional
    public Map<String,Object> account(Identity.Actor actor,long externalId,Api.Account f,Identity identity) {
        actor.require("admin");var source=identity.upstream("/api/admin/users/"+externalId,actor.token());
        check(!"ADMIN".equals(source.get("role")),"原站管理员的模块管理权限不能停用或降级");
        long uid=identity.mapAccount(externalId,(String)source.get("username"));
        db.update("UPDATE users SET role_id=(SELECT id FROM roles WHERE code=?),enabled=? WHERE id=?",f.role(),f.enabled(),uid);
        audit(actor,"ACCOUNT_UPDATE","user",uid,"模块角色 "+f.role()+"，启用 "+f.enabled());return db.one("SELECT id,external_user_id,username,enabled FROM users WHERE id=?",uid);
    }
    public List<Map<String,Object>> grants(Identity.Actor a) {
        a.require("admin");return db.rows("SELECT r.code AS role,p.code,p.name FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id ORDER BY r.id,p.id");
    }
    @Transactional
    public List<Map<String,Object>> grants(Identity.Actor a,String role,Api.Grants form) {
        a.require("admin");check(Set.of("USER","STAFF").contains(role),"管理员权限不能修改");
        Set<String> allowed="USER".equals(role)?Set.of("dashboard","profile","jobs.read","apply"):
            Set.of("dashboard","jobs.read","students.manage","companies.manage","jobs.manage","applications.manage","interviews.manage","employment.manage","reports");
        Set<String> requested=new HashSet<>(form.permissions());
        check(allowed.containsAll(requested),"不能向该角色分配越界权限");
        check(requested.contains("dashboard"),"工作台权限必须保留");
        long rid=id(db.one("SELECT id FROM roles WHERE code=?",role),"id");
        db.update("DELETE FROM role_permissions WHERE role_id=?",rid);
        for(String p:requested) db.update("INSERT INTO role_permissions(role_id,permission_id) SELECT ?,id FROM permissions WHERE code=?",rid,p);
        audit(a,"PERMISSION_UPDATE","role",rid,String.join(",",requested));return grants(a);
    }
}
