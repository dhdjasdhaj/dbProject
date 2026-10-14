package interview.course;

import java.net.URI;
import java.util.*;
import java.util.zip.ZipFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

@Service
public class FileService {
    private final Db db;
    private final CourseService service;
    private final S3Client storage;
    private final String bucket;
    public FileService(Db db,CourseService service,@Value("${course.storage-endpoint}") String endpoint,
        @Value("${course.storage-access-key}") String access,@Value("${course.storage-secret-key}") String secret,
        @Value("${course.storage-bucket}") String bucket) {
        this.db=db;this.service=service;this.bucket=bucket;
        storage=S3Client.builder().endpointOverride(URI.create(endpoint)).region(Region.US_EAST_1)
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(access,secret)))
            .forcePathStyle(true).build();
    }
    static String validate(String name,byte[] content) {
        if(content.length==0 || content.length>10485760) throw new Api.Failure(400,"附件必须为 1 字节到 10MB");
        String lower=name.toLowerCase(Locale.ROOT);
        if(lower.endsWith(".pdf") && content.length>=5 && new String(content,0,5,StandardCharsets.US_ASCII).equals("%PDF-")) return "application/pdf";
        if(lower.endsWith(".docx")) {
            Path temporary=null;
            try {
                // Read the central directory: some legitimate Word archives use descriptors
                // that streaming ZipInputStream cannot interpret. Never extract archive paths.
                temporary=Files.createTempFile("employment-docx-", ".zip");Files.write(temporary,content);
                try(var zip=new ZipFile(temporary.toFile())) {
                boolean types=false,doc=false;int entries=0;long expanded=0;java.util.zip.ZipEntry entry;
                byte[] buffer=new byte[8192];
                var iterator=zip.entries();
                while(iterator.hasMoreElements()) {
                    entry=iterator.nextElement();
                    if(++entries>2000) throw new IllegalArgumentException();
                    if(entry.getName().equals("[Content_Types].xml")) types=true;
                    if(entry.getName().equals("word/document.xml")) doc=true;
                    if(entry.getName().toLowerCase(Locale.ROOT).endsWith("vbaproject.bin")) throw new IllegalArgumentException();
                    try(var stream=zip.getInputStream(entry)) {
                        int read;while((read=stream.read(buffer))!=-1) {expanded+=read;if(expanded>104857600) throw new IllegalArgumentException();}
                    }
                }
                if(types&&doc) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                }
            } catch(Exception e) { throw new Api.Failure(400,"DOCX 文件内容无效或解压体积过大"); }
            finally { if(temporary!=null) try{Files.deleteIfExists(temporary);}catch(Exception ignored){} }
        }
        throw new Api.Failure(400,"仅支持有效的 PDF、DOCX 文件");
    }
    @Transactional
    public Map<String,Object> upload(Identity.Actor a,MultipartFile file) {
        a.require("apply");String name=Optional.ofNullable(file.getOriginalFilename()).orElse("resume.pdf").replace('\\','/');
        name=name.substring(name.lastIndexOf('/')+1).replaceAll("[\\p{Cntrl}]","");
        if(name.isBlank()||name.length()>180) throw new Api.Failure(400,"文件名不正确或过长");
        byte[] bytes;
        try{bytes=file.getBytes();}catch(Exception e){throw new Api.Failure(400,"读取附件失败");}
        String mime=validate(name,bytes),key="resumes/"+a.id()+"/"+UUID.randomUUID();
        boolean uploaded=false;
        try {
            try { storage.headBucket(r->r.bucket(bucket)); }
            catch(S3Exception e) {if(e.statusCode()!=404)throw e;storage.createBucket(r->r.bucket(bucket));}
            storage.putObject(r->r.bucket(bucket).key(key).contentType(mime),RequestBody.fromBytes(bytes));uploaded=true;
            long id=db.insert("INSERT INTO resume_files(owner_id,object_key,original_name,content_type,file_size) VALUES (?,?,?,?,?)",a.id(),key,name,mime,bytes.length);
            service.audit(a,"FILE_UPLOAD","file",id,"上传简历附件");
            return db.one("SELECT id,original_name,file_size,created_at FROM resume_files WHERE id=?",id);
        } catch(Exception e) {
            if(uploaded) try{storage.deleteObject(r->r.bucket(bucket).key(key));}catch(Exception ignored){}
            if(e instanceof Api.Failure f) throw f;
            throw new Api.Failure(503,"附件存储暂不可用，您仍可不带附件投递");
        }
    }
    public record Download(String name,String type,byte[] bytes) {}
    public Download download(Identity.Actor a,long id) {
        var file=db.one("SELECT * FROM resume_files WHERE id=?",id);
        if(Db.id(file,"ownerId")!=a.id()) {
            if(!a.permissions().contains("applications.manage") && !a.permissions().contains("interviews.manage")) throw new Api.Failure(403,"无权下载此附件");
            CourseService.check(db.count("SELECT COUNT(*) FROM applications WHERE resume_file_id=?",id)>0,"附件尚未用于投递，不能访问");
        } else a.require("apply");
        try {
            byte[] bytes=storage.getObjectAsBytes(r->r.bucket(bucket).key((String)file.get("objectKey"))).asByteArray();
            return new Download((String)file.get("originalName"),(String)file.get("contentType"),bytes);
        }catch(Exception e){throw new Api.Failure(503,"附件暂不可用，请稍后重试");}
    }
}
