package interview.guide.modules.resume.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.Map;

/**
 * AI 简历生成请求
 */
public record ResumeAiGenerateRequest(
    @NotBlank String templateId,
    @NotBlank String identity,
    @NotBlank String major,
    @NotBlank String educationInfo,
    @NotEmpty List<String> jobTargets,
    List<String> educationTags,
    List<String> internshipTags,
    List<String> certificateTags,
    String additionalNotes,
    @Valid HistoricalContext historicalContext
) {
    public record HistoricalContext(
        WizardDraft wizardDraft,
        List<BuilderDraft> builderDrafts
    ) {}

    public record WizardDraft(
        String identity,
        String major,
        String educationInfo,
        List<String> jobTargets,
        List<String> educationTags,
        List<String> internshipTags,
        List<String> certificateTags,
        String additionalNotes
    ) {}

    public record BuilderDraft(
        String templateId,
        Map<String, String> sections,
        String updatedAt,
        AiMeta aiMeta
    ) {}

    public record AiMeta(
        String identity,
        String major,
        String educationInfo,
        List<String> jobTargets,
        List<String> educationTags,
        List<String> internshipTags,
        List<String> certificateTags,
        String additionalNotes
    ) {}
}
