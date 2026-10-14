package interview.guide.modules.interview.service;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.infrastructure.security.SecurityUtils;
import interview.guide.infrastructure.export.PdfExportService;
import interview.guide.infrastructure.file.FileHashService;
import interview.guide.infrastructure.file.FileStorageService;
import interview.guide.infrastructure.mapper.InterviewMapper;
import interview.guide.modules.interview.model.InterviewAnswerEntity;
import interview.guide.modules.interview.model.InterviewDetailDTO;
import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.InterviewSessionEntity;
import interview.guide.modules.knowledgebase.listener.VectorizeStreamProducer;
import interview.guide.modules.knowledgebase.model.KnowledgeBaseEntity;
import interview.guide.modules.knowledgebase.model.VectorStatus;
import interview.guide.modules.knowledgebase.repository.KnowledgeBaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 面试历史服务
 * 获取面试会话详情和导出面试报告
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewHistoryService {

    private static final ZoneId BEIJING_ZONE = ZoneId.of("Asia/Shanghai");

    private final InterviewPersistenceService interviewPersistenceService;
    private final PdfExportService pdfExportService;
    private final ObjectMapper objectMapper;
    private final InterviewMapper interviewMapper;
    private final ChatClient.Builder chatClientBuilder;
    private final FileStorageService fileStorageService;
    private final FileHashService fileHashService;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final VectorizeStreamProducer vectorizeStreamProducer;

    /**
     * 获取面试会话详情
     */
    public InterviewDetailDTO getInterviewDetail(String sessionId) {
        long userId = SecurityUtils.requireUserId();
        InterviewSessionEntity session = interviewPersistenceService
            .findBySessionIdAndResumeOwnerUserId(sessionId, userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));

        List<Object> questions = parseJson(session.getQuestionsJson(), new TypeReference<>() {});
        List<String> strengths = parseJson(session.getStrengthsJson(), new TypeReference<>() {});
        List<String> improvements = parseJson(session.getImprovementsJson(), new TypeReference<>() {});
        List<Object> referenceAnswers = parseJson(session.getReferenceAnswersJson(), new TypeReference<>() {});
        List<InterviewDetailDTO.ConversationLogEntryDTO> conversationLog = parseJson(
            session.getConversationLogJson(),
            new TypeReference<>() {}
        );
        InterviewDetailDTO.VideoAnalysisDTO videoAnalysis = parseJson(
            session.getVideoAnalysisJson(),
            new TypeReference<>() {}
        );

        List<InterviewQuestionDTO> allQuestions = parseJson(
            session.getQuestionsJson(),
            new TypeReference<>() {}
        );

        List<InterviewDetailDTO.AnswerDetailDTO> answerList = buildAnswerDetailList(
            allQuestions,
            session.getAnswers()
        );

        return interviewMapper.toDetailDTO(
            session,
            questions,
            strengths,
            improvements,
            referenceAnswers,
            conversationLog,
            videoAnalysis,
            answerList
        );
    }

    /**
     * 一键整理整场面试并上传知识库
     */
    public Map<String, Object> collectInterviewSessionToKnowledgeBase(String sessionId) {
        long userId = SecurityUtils.requireUserId();
        InterviewSessionEntity session = interviewPersistenceService
            .findBySessionIdAndResumeOwnerUserId(sessionId, userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));

        InterviewDetailDTO detail = getInterviewDetail(sessionId);
        String markdown = buildCollectionMarkdownByAi(session, detail);
        String filename = buildCollectionFilename();
        byte[] markdownBytes = markdown.getBytes(StandardCharsets.UTF_8);
        String storageKey = fileStorageService.uploadKnowledgeBaseText(filename, markdown);
        String storageUrl = fileStorageService.getFileUrl(storageKey);
        String fileHash = fileHashService.calculateHash(markdownBytes);

        Optional<KnowledgeBaseEntity> existingKb = knowledgeBaseRepository.findByOwnerUserIdAndFileHash(userId, fileHash);
        if (existingKb.isPresent()) {
            KnowledgeBaseEntity duplicated = existingKb.get();
            duplicated.incrementAccessCount();
            knowledgeBaseRepository.save(duplicated);
            return Map.of(
                "knowledgeBaseId", duplicated.getId(),
                "knowledgeBaseName", duplicated.getName(),
                "knowledgeBaseCategory", duplicated.getCategory() != null ? duplicated.getCategory() : "面试收藏",
                "vectorStatus", duplicated.getVectorStatus() != null ? duplicated.getVectorStatus().name() : VectorStatus.PENDING.name(),
                "duplicate", true,
                "fileUrl", duplicated.getStorageUrl() != null ? duplicated.getStorageUrl() : storageUrl
            );
        }

        KnowledgeBaseEntity kb = new KnowledgeBaseEntity();
        kb.setOwnerUserId(userId);
        kb.setFileHash(fileHash);
        kb.setName(filename.replaceAll("\\.md$", ""));
        kb.setCategory("面试收藏");
        kb.setOriginalFilename(filename);
        kb.setFileSize((long) markdownBytes.length);
        kb.setContentType("text/markdown");
        kb.setStorageKey(storageKey);
        kb.setStorageUrl(storageUrl);
        kb.setVectorStatus(VectorStatus.PENDING);
        KnowledgeBaseEntity savedKb = knowledgeBaseRepository.save(kb);

        vectorizeStreamProducer.sendVectorizeTask(savedKb.getId(), markdown);

        return Map.of(
            "knowledgeBaseId", savedKb.getId(),
            "knowledgeBaseName", savedKb.getName(),
            "knowledgeBaseCategory", savedKb.getCategory(),
            "vectorStatus", VectorStatus.PENDING.name(),
            "duplicate", false,
            "fileUrl", storageUrl
        );
    }

    /**
     * 构建答案详情列表（包含所有题目）
     */
    private List<InterviewDetailDTO.AnswerDetailDTO> buildAnswerDetailList(
        List<InterviewQuestionDTO> allQuestions,
        List<InterviewAnswerEntity> answers
    ) {
        if (allQuestions == null || allQuestions.isEmpty()) {
            return interviewMapper.toAnswerDetailDTOList(answers, this::extractKeyPoints);
        }

        java.util.Map<Integer, InterviewAnswerEntity> answerMap = answers.stream()
            .collect(java.util.stream.Collectors.toMap(
                InterviewAnswerEntity::getQuestionIndex,
                a -> a,
                (a1, a2) -> a1
            ));

        return allQuestions.stream()
            .map(question -> {
                InterviewAnswerEntity answer = answerMap.get(question.questionIndex());
                if (answer != null) {
                    return interviewMapper.toAnswerDetailDTO(answer, extractKeyPoints(answer));
                }
                return new InterviewDetailDTO.AnswerDetailDTO(
                    question.questionIndex(),
                    question.question(),
                    question.category(),
                    null,
                    question.score() != null ? question.score() : 0,
                    question.feedback(),
                    null,
                    null,
                    null
                );
            })
            .toList();
    }

    private String buildCollectionMarkdownByAi(InterviewSessionEntity session, InterviewDetailDTO detail) {
        String systemPrompt = """
你是资深面试记录整理专家。请把输入的整场面试详情整理成结构化 Markdown，要求：
1) 必须覆盖：基础信息、题目清单、每题回答要点、用户表现（表达/逻辑/技术）、整体优劣势、改进建议、后续行动清单。
2) 如果某题缺少回答，明确标记“未作答”。
3) 输出中文，条理清晰，可直接作为知识库沉淀文档。
4) 不要输出与 Markdown 无关的解释。
""";

        String userPrompt = """
请整理这场面试记录：
- 会话ID: %s
- 总题数: %d
- 状态: %s
- 总分: %s
- 总评: %s

题目与回答（JSON）:
%s

对话日志（JSON）:
%s

视频分析（JSON）:
%s
""".formatted(
            session.getSessionId(),
            session.getTotalQuestions() != null ? session.getTotalQuestions() : 0,
            session.getStatus() != null ? session.getStatus().name() : "UNKNOWN",
            session.getOverallScore() != null ? session.getOverallScore().toString() : "暂无",
            session.getOverallFeedback() != null ? session.getOverallFeedback() : "暂无",
            safeJson(detail.answers()),
            safeJson(detail.conversationLog()),
            safeJson(detail.videoAnalysis())
        );

        try {
            return chatClientBuilder.build().prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .content();
        } catch (Exception e) {
            log.warn("AI整理面试收藏失败，降级为本地模板: sessionId={}, error={}", session.getSessionId(), e.getMessage());
            return buildFallbackMarkdown(session, detail);
        }
    }

    private String safeJson(Object value) {
        if (value == null) {
            return "null";
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return String.valueOf(value);
        }
    }

    private String buildFallbackMarkdown(InterviewSessionEntity session, InterviewDetailDTO detail) {
        StringBuilder sb = new StringBuilder();
        sb.append("# 面试收藏\n\n");
        sb.append("- 会话ID: ").append(session.getSessionId()).append("\n");
        sb.append("- 总题数: ").append(session.getTotalQuestions() != null ? session.getTotalQuestions() : 0).append("\n");
        sb.append("- 总分: ").append(session.getOverallScore() != null ? session.getOverallScore() : "暂无").append("\n");
        sb.append("- 总评: ").append(session.getOverallFeedback() != null ? session.getOverallFeedback() : "暂无").append("\n\n");
        sb.append("## 题目与回答\n");
        if (detail.answers() != null) {
            for (InterviewDetailDTO.AnswerDetailDTO answer : detail.answers()) {
                sb.append("\n### Q").append(answer.questionIndex() != null ? answer.questionIndex() + 1 : "?").append(": ")
                    .append(answer.question() != null ? answer.question() : "").append("\n");
                sb.append("- 分类: ").append(answer.category() != null ? answer.category() : "未分类").append("\n");
                sb.append("- 回答: ").append(answer.userAnswer() != null && !answer.userAnswer().isBlank() ? answer.userAnswer() : "未作答").append("\n");
                sb.append("- 评分: ").append(answer.score() != null ? answer.score() : 0).append("\n");
                if (answer.feedback() != null && !answer.feedback().isBlank()) {
                    sb.append("- 反馈: ").append(answer.feedback()).append("\n");
                }
            }
        }
        return sb.toString();
    }

    private String buildCollectionFilename() {
        LocalDate today = LocalDate.now(BEIJING_ZONE);
        return "面试收藏_" + today + ".md";
    }

    /**
     * 从 JSON 提取 keyPoints
     */
    private List<String> extractKeyPoints(InterviewAnswerEntity answer) {
        return parseJson(answer.getKeyPointsJson(), new TypeReference<>() {});
    }

    /**
     * 通用 JSON 解析方法
     */
    private <T> T parseJson(String json, TypeReference<T> typeRef) {
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (JacksonException e) {
            log.error("解析 JSON 失败", e);
            return null;
        }
    }

    /**
     * 导出面试报告为PDF
     */
    public byte[] exportInterviewPdf(String sessionId) {
        long userId = SecurityUtils.requireUserId();
        InterviewSessionEntity session = interviewPersistenceService
            .findBySessionIdAndResumeOwnerUserId(sessionId, userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));
        try {
            return pdfExportService.exportInterviewReport(session);
        } catch (Exception e) {
            log.error("导出PDF失败: sessionId={}", sessionId, e);
            throw new BusinessException(ErrorCode.EXPORT_PDF_FAILED, "导出PDF失败: " + e.getMessage());
        }
    }
}
