package interview.guide.modules.resume.service;

import interview.guide.common.ai.StructuredOutputInvoker;
import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.resume.model.ResumeAiGenerateRequest;
import interview.guide.modules.resume.model.ResumeAiGenerateResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Service
public class ResumeAiGenerateService {

    private final ChatClient chatClient;
    private final PromptTemplate systemPromptTemplate;
    private final BeanOutputConverter<ResumeAiSectionsDTO> outputConverter;
    private final StructuredOutputInvoker structuredOutputInvoker;

    public ResumeAiGenerateService(ChatClient.Builder builder,
                                   StructuredOutputInvoker invoker,
                                   @Value("classpath:prompts/resume-ai-generate-system.st") Resource systemPromptResource) throws IOException {
        this.chatClient = builder.build();
        this.structuredOutputInvoker = invoker;
        this.systemPromptTemplate = new PromptTemplate(systemPromptResource.getContentAsString(StandardCharsets.UTF_8));
        this.outputConverter = new BeanOutputConverter<>(ResumeAiSectionsDTO.class);
    }

    public ResumeAiGenerateResponse generate(ResumeAiGenerateRequest r) {
        try {
            String systemPrompt = systemPromptTemplate.render() + "\n\n" + outputConverter.getFormat();

            // ✅ 核心：手写 Prompt（不再用模板）
            String userPrompt = buildUserPrompt(r);

            ResumeAiSectionsDTO dto = invokeWithRetry(systemPrompt, userPrompt);

            SectionsDTO s = normalize(dto, r);
            validate(s, r);

            return new ResumeAiGenerateResponse(
                    r.templateId(),
                    new ResumeAiGenerateResponse.AiMeta(
                            r.identity(),
                            r.major(),
                            r.educationInfo(),
                            r.jobTargets(),
                            safeList(r.educationTags()),
                            safeList(r.internshipTags()),
                            safeList(r.certificateTags()),
                            r.additionalNotes()
                    ),
                    new ResumeAiGenerateResponse.Sections(
                            s.profile(),
                            s.summary(),
                            s.education(),
                            s.projects(),
                            s.experience(),
                            s.skills()
                    )
            );

        } catch (Exception e) {
            log.error("AI简历生成失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.RESUME_AI_GENERATE_FAILED, "AI生成简历失败：" + e.getMessage());
        }
    }

    /**
     * 🔥 核心方法：手写 Prompt，彻底解决变量不替换问题
     */
    private String buildUserPrompt(ResumeAiGenerateRequest r) {

        ResumeContext c = mergeContext(r);

        return String.format("""
                        【用户信息】
                        
                        - 身份：%s
                        - 专业：%s
                        - 教育信息：%s
                        - 求职方向：%s
                        - 教育亮点：%s
                        - 实习/实践：%s
                        - 证书：%s
                        - 补充说明：%s
                        
                        【历史上下文】
                        %s
                        
                        【任务要求】
                        请基于以上信息生成一份完整中文简历：
                        
                        1. 必须使用用户提供的信息
                        2. 不允许出现占位符（如 $xxx$）
                        3. 所有字段必须有内容，不允许为空
                        4. 可以合理扩展，但不要编造虚假经历
                        5. 表达要自然、可直接投递
                        
                        """,
                safe(c.identity()),
                safe(c.major()),
                safe(c.educationInfo()),
                join(c.jobTargets()),
                join(c.educationTags()),
                join(c.internshipTags()),
                join(c.certificateTags()),
                safe(c.additionalNotes()),
                buildHistoricalContext(r)
        );
    }

    private ResumeAiSectionsDTO invokeWithRetry(String systemPrompt, String userPrompt) {
        int maxRetries = 3;

        for (int i = 0; i < maxRetries; i++) {
            try {
                ResumeAiSectionsDTO dto = structuredOutputInvoker.invoke(
                        chatClient,
                        systemPrompt,
                        userPrompt,
                        outputConverter,
                        ErrorCode.RESUME_AI_GENERATE_FAILED,
                        "AI生成简历失败：",
                        "AI简历生成",
                        log
                );

                if (dto != null && dto.sections() != null) {
                    return dto;
                }

            } catch (Exception e) {
                log.warn("解析失败，第{}次重试", i + 1);
            }

            log.warn("AI生成失败，第{}次重试", i + 1);
        }

        throw new BusinessException(ErrorCode.RESUME_AI_GENERATE_FAILED, "AI多次生成失败");
    }

    // ================== 工具方法 ==================

    private String safe(String v) {
        return (v == null || v.trim().isEmpty()) ? "无" : v;
    }

    private String join(List<String> list) {
        return (list == null || list.isEmpty()) ? "无" : String.join("、", list);
    }

    private <T> List<T> safeList(List<T> v) {
        return v == null ? List.of() : v;
    }

    private String preferText(String current, String fallback) {
        return blank(current) ? fallback : current;
    }

    private <T> List<T> preferList(List<T> current, List<T> fallback) {
        return (current == null || current.isEmpty()) ? safeList(fallback) : current;
    }

    private String shorten(String value, int maxLength) {
        if (blank(value) || value.length() <= maxLength) {
            return safe(value);
        }
        return value.substring(0, maxLength) + "...";
    }

    private String formatBuilderDraft(ResumeAiGenerateRequest.BuilderDraft draft) {
        StringBuilder builder = new StringBuilder();
        builder.append("  模板：").append(safe(draft.templateId())).append("；更新时间：")
                .append(safe(draft.updatedAt())).append("\n");

        if (draft.aiMeta() != null) {
            builder.append("  AI 元信息：身份=").append(safe(draft.aiMeta().identity()))
                    .append("，专业=").append(safe(draft.aiMeta().major()))
                    .append("，求职方向=").append(join(draft.aiMeta().jobTargets()))
                    .append("\n");
        }

        String sectionsSummary = summarizeSections(draft.sections());
        if (!blank(sectionsSummary)) {
            builder.append("  内容摘要：").append(sectionsSummary).append("\n");
        }
        return builder.toString();
    }

    private String summarizeSections(java.util.Map<String, String> sections) {
        if (sections == null || sections.isEmpty()) {
            return "";
        }
        return sections.entrySet().stream()
                .filter(entry -> !blank(entry.getValue()))
                .limit(4)
                .map(entry -> entry.getKey() + "=" + shorten(entry.getValue().replace('\n', ' '), 48))
                .reduce((left, right) -> left + "；" + right)
                .orElse("");
    }

    private boolean blank(String v) {
        return v == null || v.trim().isEmpty();
    }

    // ================== 你原有逻辑（保留） ==================

    private ResumeContext mergeContext(ResumeAiGenerateRequest r) {
        ResumeAiGenerateRequest.WizardDraft wizardDraft = r.historicalContext() != null ? r.historicalContext().wizardDraft() : null;
        return new ResumeContext(
                preferText(r.identity(), wizardDraft != null ? wizardDraft.identity() : null),
                preferText(r.major(), wizardDraft != null ? wizardDraft.major() : null),
                preferText(r.educationInfo(), wizardDraft != null ? wizardDraft.educationInfo() : null),
                preferList(r.jobTargets(), wizardDraft != null ? wizardDraft.jobTargets() : null),
                preferList(r.educationTags(), wizardDraft != null ? wizardDraft.educationTags() : null),
                preferList(r.internshipTags(), wizardDraft != null ? wizardDraft.internshipTags() : null),
                preferList(r.certificateTags(), wizardDraft != null ? wizardDraft.certificateTags() : null),
                preferText(r.additionalNotes(), wizardDraft != null ? wizardDraft.additionalNotes() : null)
        );
    }

    private String buildHistoricalContext(ResumeAiGenerateRequest r) {
        ResumeAiGenerateRequest.HistoricalContext historicalContext = r.historicalContext();
        if (historicalContext == null) {
            return "无";
        }

        StringBuilder context = new StringBuilder();

        ResumeAiGenerateRequest.WizardDraft wizardDraft = historicalContext.wizardDraft();
        if (wizardDraft != null) {
            context.append("- 最近一次向导草稿：\n")
                    .append("  身份：").append(safe(wizardDraft.identity())).append("\n")
                    .append("  专业：").append(safe(wizardDraft.major())).append("\n")
                    .append("  教育信息：").append(safe(shorten(wizardDraft.educationInfo(), 120))).append("\n")
                    .append("  求职方向：").append(join(wizardDraft.jobTargets())).append("\n")
                    .append("  教育亮点：").append(join(wizardDraft.educationTags())).append("\n")
                    .append("  实习/实践：").append(join(wizardDraft.internshipTags())).append("\n")
                    .append("  证书：").append(join(wizardDraft.certificateTags())).append("\n")
                    .append("  补充说明：").append(safe(shorten(wizardDraft.additionalNotes(), 120))).append("\n");
        }

        List<ResumeAiGenerateRequest.BuilderDraft> builderDrafts = safeList(historicalContext.builderDrafts());
        if (!builderDrafts.isEmpty()) {
            context.append("- 历史简历草稿：\n");
            builderDrafts.stream()
                    .limit(3)
                    .forEach(draft -> context.append(formatBuilderDraft(draft)));
        }

        String value = context.toString().trim();
        return value.isEmpty() ? "无" : value;
    }

    private SectionsDTO normalize(ResumeAiSectionsDTO dto, ResumeAiGenerateRequest r) {
        if (dto == null || dto.sections() == null)
            throw new BusinessException(ErrorCode.RESUME_AI_GENERATE_FAILED, "AI生成结果为空");

        return dto.sections();
    }

    private void validate(SectionsDTO s, ResumeAiGenerateRequest r) {
        if (blank(s.profile()) || blank(s.summary()) || blank(s.education())
                || blank(s.projects()) || blank(s.experience()) || blank(s.skills())) {
            throw new BusinessException(ErrorCode.RESUME_AI_GENERATE_FAILED, "AI生成内容不完整");
        }
    }

    // ================== DTO ==================

    private record ResumeAiSectionsDTO(SectionsDTO sections) {
    }

    private record SectionsDTO(
            String profile,
            String summary,
            String education,
            String projects,
            String experience,
            String skills
    ) {
    }

    private record ResumeContext(
            String identity,
            String major,
            String educationInfo,
            List<String> jobTargets,
            List<String> educationTags,
            List<String> internshipTags,
            List<String> certificateTags,
            String additionalNotes
    ) {
    }
}