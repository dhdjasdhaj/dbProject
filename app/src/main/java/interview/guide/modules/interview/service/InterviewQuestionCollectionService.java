package interview.guide.modules.interview.service;

import interview.guide.common.config.StorageConfigProperties;
import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.infrastructure.file.FileHashService;
import interview.guide.infrastructure.file.FileStorageService;
import interview.guide.infrastructure.security.SecurityUtils;
import interview.guide.modules.interview.model.CollectInterviewQuestionResponse;
import interview.guide.modules.interview.model.InterviewAnswerEntity;
import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.InterviewReportDTO;
import interview.guide.modules.interview.model.InterviewSessionEntity;
import interview.guide.modules.interview.repository.InterviewAnswerRepository;
import interview.guide.modules.interview.repository.InterviewSessionRepository;
import interview.guide.modules.knowledgebase.listener.VectorizeStreamProducer;
import interview.guide.modules.knowledgebase.model.KnowledgeBaseEntity;
import interview.guide.modules.knowledgebase.model.VectorStatus;
import interview.guide.modules.knowledgebase.repository.KnowledgeBaseRepository;
import interview.guide.modules.knowledgebase.service.KnowledgeBaseDeleteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewQuestionCollectionService {

    private static final ZoneId BEIJING_ZONE_ID = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter INTERVIEW_FOLDER_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final InterviewSessionRepository sessionRepository;
    private final InterviewAnswerRepository answerRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final FileHashService fileHashService;
    private final FileStorageService fileStorageService;
    private final StorageConfigProperties storageConfigProperties;
    private final VectorizeStreamProducer vectorizeStreamProducer;
    private final KnowledgeBaseDeleteService knowledgeBaseDeleteService;
    private final S3Client s3Client;
    private final ObjectMapper objectMapper;
    private final AnswerEvaluationService answerEvaluationService;

    @Transactional(rollbackFor = Exception.class)
    public CollectInterviewQuestionResponse collectQuestion(String sessionId, Integer questionIndex) {
        long userId = SecurityUtils.requireUserId();
        InterviewSessionEntity session = sessionRepository.findBySessionIdAndResumeOwnerUserId(sessionId, userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));
        InterviewAnswerEntity answer = answerRepository.findBySession_SessionIdAndQuestionIndex(sessionId, questionIndex)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_QUESTION_NOT_FOUND, "当前题目还没有可收藏的回答"));

        String category = buildCategory(session);
        String name = buildKnowledgeBaseName(questionIndex, answer.getQuestion());
        String originalFilename = buildFilename(questionIndex);

        hydrateReferenceAnswerIfMissing(session, answer, questionIndex);
        String content = buildDocument(session, answer, questionIndex);

        return knowledgeBaseRepository.findByOwnerUserIdAndCategoryAndOriginalFilename(userId, category, originalFilename)
            .map(existing -> updateExistingKnowledgeBase(existing, content, category, originalFilename, questionIndex, sessionId, session, true))
            .orElseGet(() -> createKnowledgeBase(userId, category, name, originalFilename, content, questionIndex, sessionId, session));
    }

    @Transactional(rollbackFor = Exception.class)
    public CollectInterviewQuestionResponse uncollectQuestion(String sessionId, Integer questionIndex) {
        long userId = SecurityUtils.requireUserId();
        InterviewSessionEntity session = sessionRepository.findBySessionIdAndResumeOwnerUserId(sessionId, userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));

        String category = buildCategory(session);
        String originalFilename = buildFilename(questionIndex);
        KnowledgeBaseEntity existing = knowledgeBaseRepository
            .findByOwnerUserIdAndCategoryAndOriginalFilename(userId, category, originalFilename)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "当前题目尚未收藏"));

        knowledgeBaseDeleteService.deleteKnowledgeBase(existing.getId());
        return new CollectInterviewQuestionResponse(existing.getId(), existing.getName(), existing.getCategory(), questionIndex, true, false);
    }


    private void hydrateReferenceAnswerIfMissing(InterviewSessionEntity session, InterviewAnswerEntity answer, Integer questionIndex) {
        if (answer.getReferenceAnswer() != null && !answer.getReferenceAnswer().isBlank()) {
            return;
        }

        String fromSession = resolveReferenceAnswer(session, answer, questionIndex);
        if (fromSession != null && !fromSession.isBlank()) {
            answer.setReferenceAnswer(fromSession);
            answerRepository.save(answer);
            return;
        }

        try {
            InterviewQuestionDTO question = new InterviewQuestionDTO(
                questionIndex,
                answer.getQuestion(),
                null,
                answer.getCategory(),
                answer.getUserAnswer(),
                answer.getScore(),
                answer.getFeedback(),
                false,
                null
            );

            InterviewReportDTO.ReferenceAnswer generated = answerEvaluationService.generateReferenceAnswer(
                session.getSessionId(),
                session.getResume().getResumeText(),
                question
            );

            if (generated.referenceAnswer() == null || generated.referenceAnswer().isBlank()) {
                return;
            }

            answer.setReferenceAnswer(generated.referenceAnswer());
            if (generated.keyPoints() != null && !generated.keyPoints().isEmpty()) {
                answer.setKeyPointsJson(objectMapper.writeValueAsString(generated.keyPoints()));
            }
            answerRepository.save(answer);
        } catch (Exception e) {
            log.warn("收藏时生成标准答案失败: sessionId={}, questionIndex={}, error={}",
                session.getSessionId(), questionIndex, e.getMessage());
        }
    }


    /**
     * 评估完成后，回填已收藏题目的标准答案到知识库文档
     */
    @Transactional(rollbackFor = Exception.class)
    public void syncCollectedQuestionsAfterEvaluation(String sessionId) {
        InterviewSessionEntity session = sessionRepository.findBySessionIdWithResume(sessionId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));

        Long userId = session.getResume().getOwnerUserId();
        String category = buildCategory(session);

        List<InterviewAnswerEntity> answers = answerRepository.findBySession_SessionIdOrderByQuestionIndex(sessionId);
        for (InterviewAnswerEntity answer : answers) {
            Integer questionIndex = answer.getQuestionIndex();
            if (questionIndex == null) {
                continue;
            }
            String originalFilename = buildFilename(questionIndex);
            knowledgeBaseRepository
                .findByOwnerUserIdAndCategoryAndOriginalFilename(userId, category, originalFilename)
                .ifPresent(existing -> {
                    String content = buildDocument(session, answer, questionIndex);
                    updateExistingKnowledgeBase(
                        existing,
                        content,
                        category,
                        originalFilename,
                        questionIndex,
                        sessionId,
                        session,
                        true
                    );
                });
        }
    }

    private CollectInterviewQuestionResponse updateExistingKnowledgeBase(
        KnowledgeBaseEntity existing, String content, String category, String originalFilename,
        Integer questionIndex, String sessionId, InterviewSessionEntity session, boolean alreadyCollected
    ) {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        String newHash = computeCollectedFileHash(content, category, originalFilename);
        String storageKey = existing.getStorageKey();
        if (storageKey == null || storageKey.isBlank()) {
            storageKey = buildStorageKey(session, originalFilename);
            existing.setStorageKey(storageKey);
            existing.setStorageUrl(fileStorageService.getFileUrl(storageKey));
        }

        s3Client.putObject(PutObjectRequest.builder()
            .bucket(storageConfigProperties.getBucket())
            .key(storageKey)
            .contentType("text/markdown; charset=utf-8")
            .contentLength((long) bytes.length)
            .build(), RequestBody.fromBytes(bytes));

        boolean contentChanged = !newHash.equals(existing.getFileHash());
        existing.setFileHash(newHash);
        existing.setFileSize((long) bytes.length);
        existing.setContentType("text/markdown");
        if (contentChanged) {
            existing.setVectorStatus(VectorStatus.PENDING);
            existing.setVectorError(null);
            existing.setChunkCount(0);
        }

        KnowledgeBaseEntity saved = knowledgeBaseRepository.save(existing);
        if (contentChanged) vectorizeStreamProducer.sendVectorizeTask(saved.getId(), content);

        return new CollectInterviewQuestionResponse(saved.getId(), saved.getName(), saved.getCategory(), questionIndex, alreadyCollected, true);
    }

    private CollectInterviewQuestionResponse createKnowledgeBase(
        long userId, String category, String name, String originalFilename,
        String content, Integer questionIndex, String sessionId, InterviewSessionEntity session
    ) {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        String storageKey = buildStorageKey(session, originalFilename);

        s3Client.putObject(PutObjectRequest.builder()
            .bucket(storageConfigProperties.getBucket())
            .key(storageKey)
            .contentType("text/markdown; charset=utf-8")
            .contentLength((long) bytes.length)
            .build(), RequestBody.fromBytes(bytes));

        KnowledgeBaseEntity entity = new KnowledgeBaseEntity();
        entity.setOwnerUserId(userId);
        entity.setFileHash(computeCollectedFileHash(content, category, originalFilename));
        entity.setName(name);
        entity.setCategory(category);
        entity.setOriginalFilename(originalFilename);
        entity.setFileSize((long) bytes.length);
        entity.setContentType("text/markdown");
        entity.setStorageKey(storageKey);
        entity.setStorageUrl(fileStorageService.getFileUrl(storageKey));
        entity.setVectorStatus(VectorStatus.PENDING);
        entity.setVectorError(null);
        entity.setChunkCount(0);

        KnowledgeBaseEntity saved = knowledgeBaseRepository.save(entity);
        vectorizeStreamProducer.sendVectorizeTask(saved.getId(), content);
        return new CollectInterviewQuestionResponse(saved.getId(), saved.getName(), saved.getCategory(), questionIndex, false, true);
    }

    private String buildCategory(InterviewSessionEntity session) {
        return "面试收藏/" + toBeijingTime(session.getCreatedAt()).format(INTERVIEW_FOLDER_FORMATTER);
    }

    private String buildKnowledgeBaseName(Integer questionIndex, String question) {
        String compact = question == null ? "未命名问题" : question.replaceAll("\\s+", " ").trim();
        String title = compact.length() > 24 ? compact.substring(0, 24) + "…" : compact;
        return "第 " + (questionIndex + 1) + " 题 - " + title;
    }

    private String buildFilename(Integer questionIndex) {
        return "question-" + (questionIndex + 1) + ".md";
    }

    private String buildStorageKey(InterviewSessionEntity session, String originalFilename) {
        String interviewFolder = toBeijingTime(session.getCreatedAt()).format(INTERVIEW_FOLDER_FORMATTER);
        String timestamp = ZonedDateTime.now(BEIJING_ZONE_ID).format(DateTimeFormatter.ofPattern("yyyy/MM/dd/HHmmss"));
        return "knowledgebases/interview-collections/" + interviewFolder + "/" + timestamp + "_" + originalFilename;
    }

    private ZonedDateTime toBeijingTime(LocalDateTime localDateTime) {
        LocalDateTime value = localDateTime != null ? localDateTime : LocalDateTime.now();
        return value.atZone(ZoneId.systemDefault()).withZoneSameInstant(BEIJING_ZONE_ID);
    }

    private String computeCollectedFileHash(String content, String category, String originalFilename) {
        String fingerprint = category + "\n" + originalFilename + "\n" + content;
        return fileHashService.calculateHash(fingerprint.getBytes(StandardCharsets.UTF_8));
    }

    private String buildDocument(InterviewSessionEntity session, InterviewAnswerEntity answer, Integer questionIndex) {
        StringBuilder sb = new StringBuilder();
        sb.append("# 模拟面试收藏题\n\n");
        sb.append("- 会话 ID：").append(session.getSessionId()).append("\n");
        sb.append("- 题号：第 ").append(questionIndex + 1).append(" 题\n");
        if (answer.getCategory() != null && !answer.getCategory().isBlank()) sb.append("- 分类：").append(answer.getCategory()).append("\n");
        if (session.getCreatedAt() != null) sb.append("- 面试时间：").append(toBeijingTime(session.getCreatedAt()).toLocalDateTime()).append("（北京时间）\n");
        sb.append("\n## 题目\n\n");
        sb.append(answer.getQuestion() == null ? "（题目缺失）" : answer.getQuestion()).append("\n\n");
        sb.append("## 我的回答\n\n");
        sb.append(answer.getUserAnswer() == null || answer.getUserAnswer().isBlank() ? "（暂无回答）" : answer.getUserAnswer()).append("\n\n");
        if (answer.getFeedback() != null && !answer.getFeedback().isBlank()) sb.append("## 评语\n\n").append(answer.getFeedback()).append("\n\n");

        String referenceAnswer = resolveReferenceAnswer(session, answer, questionIndex);
        if (referenceAnswer != null && !referenceAnswer.isBlank()) sb.append("## 标准答案\n\n").append(referenceAnswer).append("\n");
        return sb.toString();
    }

    private String resolveReferenceAnswer(InterviewSessionEntity session, InterviewAnswerEntity answer, Integer questionIndex) {
        if (answer.getReferenceAnswer() != null && !answer.getReferenceAnswer().isBlank()) return answer.getReferenceAnswer();
        String referenceAnswersJson = session.getReferenceAnswersJson();
        if (referenceAnswersJson == null || referenceAnswersJson.isBlank()) return null;

        try {
            List<InterviewReportDTO.ReferenceAnswer> refs = objectMapper.readValue(
                referenceAnswersJson,
                new TypeReference<List<InterviewReportDTO.ReferenceAnswer>>() {}
            );
            Integer[] candidates = new Integer[] { questionIndex, questionIndex + 1, questionIndex - 1 };
            for (Integer idx : candidates) {
                if (idx == null || idx < 0) continue;
                String found = refs.stream()
                    .filter(r -> r.questionIndex() == idx)
                    .map(InterviewReportDTO.ReferenceAnswer::referenceAnswer)
                    .filter(text -> text != null && !text.isBlank())
                    .findFirst().orElse(null);
                if (found != null) return found;
            }
            return null;
        } catch (Exception e) {
            log.warn("解析会话参考答案失败: sessionId={}, questionIndex={}, error={}", session.getSessionId(), questionIndex, e.getMessage());
            return null;
        }
    }
}
