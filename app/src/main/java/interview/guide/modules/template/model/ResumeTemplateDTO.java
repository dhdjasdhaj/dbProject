package interview.guide.modules.template.model;

import java.util.List;

/**
 * 简历模板列表项 DTO
 */
public record ResumeTemplateDTO(
    Long id,
    Long sourceId,
    String title,
    List<String> styleTags,
    String categorySlug,
    Integer usageCount,
    String coverUrl,
    String localImagePath,
    String detailUrl,
    String wordDownloadUrl,
    String wordLocalPath
) {}
