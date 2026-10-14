package interview.guide.modules.community;

import interview.guide.common.exception.BusinessException;
import interview.guide.infrastructure.security.SecurityUtils;
import interview.guide.modules.auth.model.UserAccountEntity;
import interview.guide.modules.auth.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import java.util.*;
import java.nio.charset.StandardCharsets;

@Service
@org.springframework.core.annotation.Order(0)
@RequiredArgsConstructor
public class CommunityService implements ApplicationRunner {
    private final JdbcTemplate db;
    private final S3Client storage;
    private final UserAccountRepository users;
    private final PasswordEncoder passwords;
    private static final String BUCKET = "community-templates";
    @Value("${APP_ADMIN_USERNAME:}") private String adminUsername;
    @Value("${APP_ADMIN_PASSWORD:}") private String adminPassword;

    @Override public void run(ApplicationArguments args) {
        db.execute("""
            CREATE TABLE IF NOT EXISTS community_posts (
              id BIGSERIAL PRIMARY KEY, author_id BIGINT NOT NULL REFERENCES users(id),
              channel VARCHAR(24) NOT NULL, title VARCHAR(120) NOT NULL, content TEXT NOT NULL,
              status VARCHAR(16) NOT NULL, pinned BOOLEAN NOT NULL DEFAULT FALSE,
              file_key VARCHAR(200), file_name VARCHAR(180), file_size BIGINT,
              downloads BIGINT NOT NULL DEFAULT 0, moderation_note VARCHAR(500) NOT NULL DEFAULT '',
              moderator_id BIGINT REFERENCES users(id), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)
            """);
        db.execute("""
            CREATE TABLE IF NOT EXISTS community_comments (
              id BIGSERIAL PRIMARY KEY, post_id BIGINT NOT NULL REFERENCES community_posts(id),
              author_id BIGINT NOT NULL REFERENCES users(id), content VARCHAR(2000) NOT NULL,
              rating INTEGER CHECK (rating BETWEEN 1 AND 5), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)
            """);
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS community_one_rating ON community_comments(post_id, author_id) WHERE rating IS NOT NULL");
        db.execute("CREATE INDEX IF NOT EXISTS community_feed ON community_posts(status, channel, created_at DESC)");
        db.execute("""
            CREATE TABLE IF NOT EXISTS community_reports (
              id BIGSERIAL PRIMARY KEY, post_id BIGINT NOT NULL REFERENCES community_posts(id),
              author_id BIGINT NOT NULL REFERENCES users(id), reason VARCHAR(500) NOT NULL,
              resolved BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(post_id, author_id))
            """);
        db.execute("ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS topic VARCHAR(28) NOT NULL DEFAULT '面试复盘'");
        db.execute("ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS cover_image VARCHAR(240)");
        db.execute("ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS source_title VARCHAR(160)");
        db.execute("ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS source_url VARCHAR(500)");
        db.execute("ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS seed_key VARCHAR(80)");
        db.execute("ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_example BOOLEAN NOT NULL DEFAULT FALSE");
        db.execute("ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS is_example BOOLEAN NOT NULL DEFAULT FALSE");
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS community_seed_key ON community_posts(seed_key)");
        db.execute("CREATE INDEX IF NOT EXISTS community_comment_post ON community_comments(post_id)");
        db.execute("CREATE TABLE IF NOT EXISTS community_seed_versions(version VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
        // Retain historical posts and attachments while retiring the old channel.
        db.update("UPDATE community_posts SET channel='DISCUSSION',topic='简历表达' WHERE channel='TEMPLATES'");
        try { storage.headBucket(b -> b.bucket(BUCKET)); }
        catch (S3Exception e) { if(e.statusCode()!=404) throw e; storage.createBucket(b -> b.bucket(BUCKET)); }
        // This bucket has no public policy. All attachments pass the authenticated visibility check.
        if (!adminUsername.isBlank() && !adminPassword.isBlank()) {
            var existing = users.findByUsername(adminUsername);
            if (existing.isEmpty()) {
                if(adminUsername.length()<3 || adminUsername.length()>64 || adminPassword.length()<12 || adminPassword.getBytes(StandardCharsets.UTF_8).length>72)
                    throw new IllegalStateException("Administrator username or password length is invalid");
                var account = new UserAccountEntity(); account.setUsername(adminUsername);
                account.setPasswordHash(passwords.encode(adminPassword)); account.setRole("ADMIN"); users.save(account);
            } else if (!"ADMIN".equals(existing.get().getRole())) {
                throw new IllegalStateException("Bootstrap administrator name already belongs to a regular user; choose another name");
            }
        }
    }
    public boolean isAdmin() { return users.findById(SecurityUtils.requireUserId()).map(u -> "ADMIN".equals(u.getRole())).orElse(false); }
    public void requireAdmin() { if(!isAdmin()) throw new BusinessException(403,"需要管理员权限"); }
    private String text(String s, int min, int max, String label) {
        String v = s == null ? "" : s.trim();
        if(v.length()<min || v.length()>max) throw new BusinessException(400,label+"长度应为 "+min+"～"+max+" 字符"); return v;
    }
    private void channel(String v) { if(!Set.of("DISCUSSION","ANNOUNCEMENTS").contains(v)) throw new BusinessException(400,"频道不存在"); }
    private void topic(String v) { if(!Set.of("简历表达","面试复盘","技术交流","成长计划","求职沟通").contains(v)) throw new BusinessException(400,"话题不存在"); }
    private Map<String,Object> raw(long id) {
        var rows=db.queryForList("SELECT * FROM community_posts WHERE id=? AND status<>'DELETED'",id);
        if(rows.isEmpty()) throw new BusinessException(404,"帖子不存在"); return rows.get(0);
    }
    private void visible(Map<String,Object> p) {
        if(!"PUBLISHED".equals(p.get("status")) && ((Number)p.get("author_id")).longValue()!=SecurityUtils.requireUserId() && !isAdmin())
            throw new BusinessException(403,"该帖子尚未公开或已被下架");
    }
    private static final String SELECT = """
      SELECT p.id, p.author_id AS "authorId", CASE WHEN p.is_example THEN '社区编辑部' ELSE u.username END AS author, p.channel,
      p.topic, p.cover_image AS "coverImage",p.source_title AS "sourceTitle",p.source_url AS "sourceUrl",p.is_example AS "isExample", p.title, p.content, p.status, p.pinned,
      p.file_name AS "fileName", p.file_size AS "fileSize", p.downloads, p.moderation_note AS "moderationNote",
      p.created_at::text AS "createdAt", p.updated_at::text AS "updatedAt",
      (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) AS "commentCount",
      (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.is_example) AS "exampleCommentCount",
      (SELECT ROUND(AVG(c.rating),1) FROM community_comments c WHERE c.post_id=p.id) AS rating
      FROM community_posts p JOIN users u ON u.id=p.author_id
      """;
    public Map<String,Object> list(String ch,String q,String topic,boolean mine,int page) {
        long uid=SecurityUtils.requireUserId(); if(!ch.isBlank()) channel(ch);
        page=Math.max(0,Math.min(page,100000)); String where=" WHERE "+(mine?"p.author_id=? AND p.status<>'DELETED'":"p.status='PUBLISHED'");
        List<Object> params=new ArrayList<>(); if(mine) params.add(uid);
        if(!ch.isBlank()){where+=" AND p.channel=?";params.add(ch);}
        if(!topic.isBlank()){topic(topic);where+=" AND p.topic=?";params.add(topic);}
        if(!q.isBlank()){ where+=" AND (POSITION(LOWER(?) IN LOWER(p.title))>0 OR POSITION(LOWER(?) IN LOWER(p.content))>0)";params.add(text(q,1,100,"搜索词"));params.add(q.trim()); }
        long total=db.queryForObject("SELECT COUNT(*) FROM community_posts p"+where,Long.class,params.toArray());
        params.add(12);params.add(page*12);
        var items=db.queryForList(SELECT+where+" ORDER BY p.pinned DESC,p.created_at DESC,p.id DESC LIMIT ? OFFSET ?",params.toArray());
        return Map.of("items",items,"total",total,"page",page,"pageSize",12,"topicCounts",
            db.queryForList("SELECT topic,COUNT(*) AS count FROM community_posts WHERE channel='DISCUSSION' AND status='PUBLISHED' GROUP BY topic ORDER BY topic"));
    }
    public List<Map<String,Object>> gallery() { return db.queryForList(SELECT+" WHERE p.channel='DISCUSSION' AND p.status='PUBLISHED' AND p.is_example ORDER BY p.id LIMIT 40"); }
    public Map<String,Object> detail(long id) {
        visible(raw(id)); var p=db.queryForMap(SELECT+" WHERE p.id=?",id);
        p.put("comments", db.queryForList("""
          SELECT c.id,c.author_id AS "authorId",CASE WHEN c.is_example THEN '示例讨论' ELSE u.username END AS author,c.content,c.rating,c.is_example AS "isExample",c.created_at::text AS "createdAt"
          FROM community_comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=? ORDER BY c.created_at,c.id LIMIT 500
          """,id)); return p;
    }
    @Transactional public long create(String ch,String title,String content,String topic,MultipartFile file) throws Exception {
        channel(ch); topic(topic); title=text(title,3,120,"标题");content=text(content,10,10000,"正文");
        boolean admin=isAdmin();if(ch.equals("ANNOUNCEMENTS")&&!admin) throw new BusinessException(403,"只有管理员可以发布公告");
        String key=null,name=null; Long size=null;
        if(file!=null&&!file.isEmpty()) {
            String original=file.getOriginalFilename(); name=original==null?"template":original.replace('\\','/');name=name.substring(name.lastIndexOf('/')+1);
            if(name.length()>180||name.chars().anyMatch(c->c<32)||file.getSize()>10*1024*1024) throw new BusinessException(400,"文件名过长或文件超过 10MB");
            String ext=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
            byte[] bytes=file.getBytes();
            boolean valid=switch(ext){
                case "pdf" -> bytes.length>=5 && new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-");
                case "docx" -> validDocx(bytes);
                case "doc" -> bytes.length>=8 && bytes[0]==(byte)0xd0 && bytes[1]==(byte)0xcf && bytes[2]==0x11 && bytes[3]==(byte)0xe0;
                case "txt" -> validText(bytes);
                default -> false;
            };
            if(!valid) throw new BusinessException(400,"仅支持有效的 PDF / DOC / DOCX / UTF-8 TXT 附件");
            key="templates/"+UUID.randomUUID()+"."+ext;size=file.getSize();
            storage.putObject(PutObjectRequest.builder().bucket(BUCKET).key(key).contentType("application/octet-stream").build(),RequestBody.fromBytes(bytes));
        }
        try {
            return db.queryForObject("""
              INSERT INTO community_posts(author_id,channel,title,content,status,file_key,file_name,file_size,topic)
              VALUES(?,?,?,?,?,?,?,?,?) RETURNING id
              """,Long.class,SecurityUtils.requireUserId(),ch,title,content,"PUBLISHED",key,name,size,topic);
        } catch(RuntimeException e) { if(key!=null) storage.deleteObject(DeleteObjectRequest.builder().bucket(BUCKET).key(key).build());throw e; }
    }
    private boolean validText(byte[] b) {
        try { String s=StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(b)).toString(); return s.indexOf('\0')<0 && !s.isBlank(); }
        catch(Exception e){return false;}
    }
    private boolean validDocx(byte[] bytes) {
        try(var zip=new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(bytes))) {
            boolean types=false,document=false;int entries=0;long expanded=0;java.util.zip.ZipEntry e;
            byte[] buffer=new byte[8192];
            while((e=zip.getNextEntry())!=null){if(++entries>2000)return false;types|=e.getName().equals("[Content_Types].xml");document|=e.getName().equals("word/document.xml");int n;while((n=zip.read(buffer))!=-1){expanded+=n;if(expanded>50*1024*1024)return false;}}
            return types&&document;
        }catch(Exception e){return false;}
    }
    @Transactional public void comment(long id,String content,Integer rating) {
        var post=raw(id); if(!"PUBLISHED".equals(post.get("status")))throw new BusinessException(400,"只有公开帖子可以评论");
        content=text(content,2,2000,"评论");if(rating!=null&&(rating<1||rating>5))throw new BusinessException(400,"评分应为 1～5 星");
        if(rating!=null&&db.queryForObject("SELECT COUNT(*) FROM community_comments WHERE post_id=? AND author_id=? AND rating IS NOT NULL",Long.class,id,SecurityUtils.requireUserId())>0)throw new BusinessException(400,"你已评价过此讨论，可继续发表修改建议");
        try {db.update("INSERT INTO community_comments(post_id,author_id,content,rating) VALUES(?,?,?,?)",id,SecurityUtils.requireUserId(),content,rating);}
        catch(org.springframework.dao.DuplicateKeyException e){throw new BusinessException(400,"你已评价过此讨论");}
    }
    @Transactional public void deletePost(long id) {
        var p=raw(id);if(((Number)p.get("author_id")).longValue()!=SecurityUtils.requireUserId()&&!isAdmin())throw new BusinessException(403,"只能删除自己的帖子");
        db.update("UPDATE community_posts SET status='DELETED',pinned=FALSE,updated_at=CURRENT_TIMESTAMP WHERE id=?",id);
    }
    public void deleteComment(long id) {
        var c=db.queryForList("SELECT author_id FROM community_comments WHERE id=?",id);if(c.isEmpty())throw new BusinessException(404,"评论不存在");
        if(((Number)c.get(0).get("author_id")).longValue()!=SecurityUtils.requireUserId()&&!isAdmin())throw new BusinessException(403,"只能删除自己的评论");
        db.update("DELETE FROM community_comments WHERE id=?",id);
    }
    public record Download(String name,byte[] bytes) {}
    public Download download(long id) {
        var p=raw(id);visible(p);if(p.get("file_key")==null)throw new BusinessException(404,"该帖子没有附件");
        var bytes=storage.getObjectAsBytes(GetObjectRequest.builder().bucket(BUCKET).key((String)p.get("file_key")).build()).asByteArray();
        db.update("UPDATE community_posts SET downloads=downloads+1 WHERE id=?",id);
        return new Download((String)p.get("file_name"),bytes);
    }
    public void report(long id,String reason) {
        visible(raw(id));reason=text(reason,5,500,"举报理由");
        try {db.update("INSERT INTO community_reports(post_id,author_id,reason) VALUES(?,?,?)",id,SecurityUtils.requireUserId(),reason);}
        catch(org.springframework.dao.DuplicateKeyException e){throw new BusinessException(400,"你已经举报过此帖子");}
    }
    public Map<String,Object> adminList(String status,int page) {
        requireAdmin(); if(!Set.of("PENDING","PUBLISHED","REJECTED","HIDDEN").contains(status))throw new BusinessException(400,"状态无效");
        page=Math.max(0,Math.min(100000,page));
        return Map.of("items",db.queryForList(SELECT+" WHERE p.status=? ORDER BY p.created_at DESC,p.id DESC LIMIT 20 OFFSET ?",status,page*20),"total",db.queryForObject("SELECT COUNT(*) FROM community_posts WHERE status=?",Long.class,status),"page",page);
    }
    public void moderate(long id,String action,String note) {
        requireAdmin();var p=raw(id);note=text(note,0,500,"管理备注");
        switch(action) {
            case "APPROVE", "REJECT", "HIDE" -> {
                if(action.equals("APPROVE")&&!Set.of("PENDING","REJECTED","HIDDEN").contains(p.get("status")))throw new BusinessException(400,"该状态无需审核");
                if(action.equals("REJECT")&&!"PENDING".equals(p.get("status")))throw new BusinessException(400,"只能驳回待审核帖子");
                if(action.equals("HIDE")&&!"PUBLISHED".equals(p.get("status")))throw new BusinessException(400,"只能下架公开帖子");
                if(!action.equals("APPROVE")&&note.isBlank())throw new BusinessException(400,"请输入驳回或下架原因");
                String next=action.equals("APPROVE")?"PUBLISHED":action.equals("REJECT")?"REJECTED":"HIDDEN";
                db.update("UPDATE community_posts SET status=?,pinned=FALSE,moderation_note=?,moderator_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",next,note,SecurityUtils.requireUserId(),id);
            }
            case "PIN", "UNPIN" -> {
                if(!"PUBLISHED".equals(p.get("status")))throw new BusinessException(400,"只能置顶公开帖子");
                db.update("UPDATE community_posts SET pinned=?,moderator_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",action.equals("PIN"),SecurityUtils.requireUserId(),id);
            }
            default -> throw new BusinessException(400,"操作无效");
        }
    }
    public List<Map<String,Object>> reports() {requireAdmin();return db.queryForList("""
        SELECT r.id,r.post_id AS "postId",p.title,u.username AS author,r.reason,r.resolved,r.created_at::text AS "createdAt"
        FROM community_reports r JOIN community_posts p ON p.id=r.post_id JOIN users u ON u.id=r.author_id
        WHERE NOT r.resolved ORDER BY r.created_at LIMIT 200
        """);}
    public void resolve(long id) {requireAdmin();if(db.update("UPDATE community_reports SET resolved=TRUE WHERE id=?",id)==0)throw new BusinessException(404,"举报不存在");}
}
