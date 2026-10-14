package interview.guide.modules.community;

import interview.guide.common.result.Result;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService service;
    public record Comment(@NotBlank @Size(min=2,max=2000) String content, @Min(1) @Max(5) Integer rating) {}
    public record Report(@NotBlank @Size(min=5,max=500) String reason) {}
    public record Moderation(@NotBlank String action, @Size(max=500) String note) {}
    @GetMapping("/api/community/posts") public Result<Map<String,Object>> list(@RequestParam(defaultValue="") String channel,@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="") String topic,@RequestParam(defaultValue="false") boolean mine,@RequestParam(defaultValue="0") int page){return Result.success(service.list(channel,q,topic,mine,page));}
    @PostMapping(value="/api/community/posts",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<Map<String,Long>> create(@RequestParam String channel,@RequestParam String title,@RequestParam String content,@RequestParam(defaultValue="面试复盘") String topic,@RequestPart(required=false) MultipartFile file) throws Exception {return Result.success(Map.of("id",service.create(channel,title,content,topic,file)));}
    @GetMapping("/api/community/gallery") public Result<List<Map<String,Object>>> gallery(){return Result.success(service.gallery());}
    @GetMapping("/api/community/posts/{id}") public Result<Map<String,Object>> detail(@PathVariable long id){return Result.success(service.detail(id));}
    @DeleteMapping("/api/community/posts/{id}") public Result<String> delete(@PathVariable long id){service.deletePost(id);return Result.success("帖子已删除");}
    @PostMapping("/api/community/posts/{id}/comments") public Result<String> comment(@PathVariable long id,@Valid @RequestBody Comment request){service.comment(id,request.content(),request.rating());return Result.success("评论已发布");}
    @DeleteMapping("/api/community/comments/{id}") public Result<String> deleteComment(@PathVariable long id){service.deleteComment(id);return Result.success("评论已删除");}
    @PostMapping("/api/community/posts/{id}/reports") public Result<String> report(@PathVariable long id,@Valid @RequestBody Report request){service.report(id,request.reason());return Result.success("举报已提交");}
    @GetMapping("/api/community/posts/{id}/download") public ResponseEntity<byte[]> download(@PathVariable long id){var f=service.download(id);return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(f.name(),StandardCharsets.UTF_8).build().toString()).header("X-Content-Type-Options","nosniff").header(HttpHeaders.CACHE_CONTROL,"no-store").body(f.bytes());}
    @GetMapping("/api/admin/community/posts") public Result<Map<String,Object>> adminPosts(@RequestParam(defaultValue="PENDING") String status,@RequestParam(defaultValue="0") int page){return Result.success(service.adminList(status,page));}
    @PutMapping("/api/admin/community/posts/{id}") public Result<String> moderate(@PathVariable long id,@Valid @RequestBody Moderation request){service.moderate(id,request.action(),request.note());return Result.success("管理操作已保存");}
    @GetMapping("/api/admin/community/reports") public Result<List<Map<String,Object>>> reports(){return Result.success(service.reports());}
    @PutMapping("/api/admin/community/reports/{id}/resolve") public Result<String> resolve(@PathVariable long id){service.resolve(id);return Result.success("举报已处理");}
}
