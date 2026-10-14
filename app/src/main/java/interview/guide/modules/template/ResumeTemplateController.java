package interview.guide.modules.template;

import interview.guide.common.result.Result;
import interview.guide.modules.template.model.ResumeTemplateDTO;
import interview.guide.modules.template.service.ResumeTemplateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 简历模板控制器
 * 展示简历模板，提供已接入的 Word 原文件下载。
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "简历模板", description = "简历模板展示与 Word 下载")
public class ResumeTemplateController {

    private final ResumeTemplateService service;

    /**
     * 列出模板，可按风格标签（style）或分类（category）过滤。
     */
    @GetMapping("/api/resume-templates")
    public Result<List<ResumeTemplateDTO>> list(
            @RequestParam(required = false) String style,
            @RequestParam(required = false) String category) {
        return Result.success(service.list(style, category));
    }

    /**
     * 下载已打包的 Word 原文件；未配置的模板仍返回未开放提示。
     */
    @GetMapping("/api/resume-templates/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable Long id) throws IOException {
        var file = service.download(id);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                .filename(file.filename(), StandardCharsets.UTF_8).build().toString())
            .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
            .header("X-Content-Type-Options", "nosniff")
            .contentLength(file.bytes().length)
            .body(file.bytes());
    }
}
