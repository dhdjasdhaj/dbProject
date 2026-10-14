package interview.guide.modules.template.service;

import interview.guide.modules.template.model.ResumeTemplateEntity;
import interview.guide.modules.template.repository.ResumeTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** The two supplied Word originals replace the first two existing market cards. */
@Component
@Order(100)
@RequiredArgsConstructor
public class BundledResumeTemplates implements ApplicationRunner {
    public record Template(long sourceId, String title, String tags, String resourcePath, String filename) {}

    public static final List<Template> TEMPLATES = List.of(
        new Template(1000L, "秋招医护类求职简历", "[\"医护\",\"秋招\"]",
            "resume-templates/word/healthcare-autumn.docx", "秋招医护类求职简历.docx"),
        new Template(1001L, "有多颜色模板，下放链接进群", "[\"多颜色\",\"求职\"]",
            "resume-templates/word/multicolor.docx", "有多颜色模板，下放链接进群.docx")
    );

    private final ResumeTemplateRepository repository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (Template asset : TEMPLATES) {
            if (!new ClassPathResource(asset.resourcePath()).exists()) {
                throw new IllegalStateException("Missing bundled resume template: " + asset.resourcePath());
            }
            ResumeTemplateEntity entity = repository.findBySourceId(asset.sourceId())
                .orElseGet(ResumeTemplateEntity::new);
            entity.setSourceId(asset.sourceId());
            entity.setTitle(asset.title());
            entity.setStyleTagsJson(asset.tags());
            entity.setCategorySlug("featured-word");
            if (entity.getUsageCount() == null) entity.setUsageCount(0);
            entity.setCoverUrl("/resume-template-previews/" + asset.sourceId() + "-word.svg");
            entity.setLocalImagePath("resume-template-previews/" + asset.sourceId() + "-word.svg");
            entity.setDetailUrl(null);
            entity.setWordDownloadUrl(null);
            entity.setWordLocalPath(asset.resourcePath());
            repository.save(entity);
        }
    }
}
