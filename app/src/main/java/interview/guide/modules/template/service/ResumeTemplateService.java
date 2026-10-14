package interview.guide.modules.template.service;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.template.model.ResumeTemplateDTO;
import interview.guide.modules.template.model.ResumeTemplateEntity;
import interview.guide.modules.template.repository.ResumeTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.io.IOException;

/**
 * 简历模板查询服务
 * 查询模板并提供已随项目打包的 Word 原文件。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeTemplateService {

    private final ResumeTemplateRepository repository;
    private final ObjectMapper objectMapper;

    /**
     * 列出模板，可按风格标签（style）或分类（category）过滤。
     */
    public List<ResumeTemplateDTO> list(String style, String category) {
        List<ResumeTemplateEntity> entities = repository.findAll(Sort.by(Sort.Direction.ASC, "sourceId"));
        return entities.stream()
            .filter(e -> style == null || style.isBlank() || parseTags(e.getStyleTagsJson()).contains(style))
            .filter(e -> category == null || category.isBlank() || category.equals(e.getCategorySlug()))
            .map(this::toDTO)
            .toList();
    }

    /**
     * 按主键获取，找不到抛异常。
     */
    public ResumeTemplateEntity requireById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND));
    }

    public record Download(String filename, byte[] bytes) {}

    public Download download(Long id) throws IOException {
        ResumeTemplateEntity entity = requireById(id);
        // Only registered classpath assets are downloadable; never read arbitrary DB paths or URLs.
        var asset = BundledResumeTemplates.TEMPLATES.stream()
            .filter(t -> t.sourceId() == entity.getSourceId()
                && t.resourcePath().equals(entity.getWordLocalPath()))
            .findFirst()
            .orElseThrow(() -> new BusinessException(ErrorCode.TEMPLATE_DOWNLOAD_NOT_READY));
        var resource = new ClassPathResource(asset.resourcePath());
        if (!resource.exists()) throw new BusinessException(ErrorCode.TEMPLATE_DOWNLOAD_NOT_READY);
        return new Download(asset.filename(), resource.getContentAsByteArray());
    }

    private ResumeTemplateDTO toDTO(ResumeTemplateEntity e) {
        return new ResumeTemplateDTO(
            e.getId(),
            e.getSourceId(),
            e.getTitle(),
            parseTags(e.getStyleTagsJson()),
            e.getCategorySlug(),
            e.getUsageCount(),
            e.getCoverUrl(),
            e.getLocalImagePath(),
            e.getDetailUrl(),
            e.getWordDownloadUrl(),
            e.getWordLocalPath()
        );
    }

    private List<String> parseTags(String json) {
        try {
            return objectMapper.readValue(json != null ? json : "[]", new TypeReference<>() {});
        } catch (JacksonException ex) {
            log.warn("解析模板风格标签失败: {}", ex.getMessage());
            return List.of();
        }
    }
}
