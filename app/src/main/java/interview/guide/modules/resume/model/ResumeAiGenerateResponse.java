package interview.guide.modules.resume.model;

import java.util.List;

/**
 * AI 简历生成响应
 */
public record ResumeAiGenerateResponse(
    String templateId,
    AiMeta aiMeta,
    Sections sections
) {
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

    public record Sections(
        String profile,
        String summary,
        String education,
        String projects,
        String experience,
        String skills
    ) {}
}
