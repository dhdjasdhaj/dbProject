package interview.guide.modules.interview.service;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.common.model.AsyncTaskStatus;
import interview.guide.infrastructure.security.SecurityUtils;
import interview.guide.infrastructure.redis.InterviewSessionCache;
import interview.guide.infrastructure.redis.InterviewSessionCache.CachedSession;
import interview.guide.modules.interview.listener.EvaluateStreamProducer;
import interview.guide.modules.interview.model.*;
import interview.guide.modules.interview.model.InterviewSessionDTO.SessionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * 面试会话管理服务
 * 管理面试会话的生命周期，使用 Redis 缓存会话状态
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewSessionService {

    private final InterviewQuestionService questionService;
    private final AnswerEvaluationService evaluationService;
    private final InterviewPersistenceService persistenceService;
    private final InterviewSessionCache sessionCache;
    private final ObjectMapper objectMapper;
    private final EvaluateStreamProducer evaluateStreamProducer;
    private final InterviewPromptService interviewPromptService;

    /**
     * 创建新的面试会话
     * 注意：如果已有未完成的会话，不会创建新的，而是返回现有会话
     * 前端应该先调用 findUnfinishedSession 检查，或者使用 forceCreate 参数强制创建
     */
    public InterviewSessionDTO createSession(CreateInterviewRequest request) {
        long userId = SecurityUtils.requireUserId();
        persistenceService.assertResumeOwnedBy(request.resumeId(), userId);

        // 如果指定了resumeId且未强制创建，检查是否有未完成的会话
        if (request.resumeId() != null && !Boolean.TRUE.equals(request.forceCreate())) {
            Optional<InterviewSessionDTO> unfinishedOpt = findUnfinishedSession(request.resumeId());
            if (unfinishedOpt.isPresent()) {
                log.info("检测到未完成的面试会话，返回现有会话: resumeId={}, sessionId={}",
                    request.resumeId(), unfinishedOpt.get().sessionId());
                return unfinishedOpt.get();
            }
        }

        String sessionId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        log.info("创建新面试会话: {}, 题目数量: {}, resumeId: {}",
            sessionId, request.questionCount(), request.resumeId());

        // 获取历史问题
        List<String> historicalQuestions = null;
        if (request.resumeId() != null) {
            historicalQuestions = persistenceService.getHistoricalQuestionsByResumeId(request.resumeId());
        }

        // 生成面试问题
        List<InterviewQuestionDTO> questions = questionService.generateQuestions(
            request.resumeText(),
            request.questionCount(),
            historicalQuestions
        );

        // 保存到 Redis 缓存
        sessionCache.saveSession(
            sessionId,
            request.resumeText(),
            request.resumeId(),
            questions,
            0,
            SessionStatus.CREATED,
            request.effectiveMode(),
            request.effectiveMaxFollowUps(),
            request.effectiveVideoEnabled(),
            request.effectiveAudioEnabled()
        );

        // 保存到数据库，并同步生成参考答案
        if (request.resumeId() != null) {
            try {
                persistenceService.saveSession(
                    sessionId,
                    request.resumeId(),
                    questions.size(),
                    questions,
                    userId,
                    request.effectiveMode(),
                    request.effectiveMaxFollowUps(),
                    request.effectiveVideoEnabled(),
                    request.effectiveAudioEnabled()
                );
                persistenceService.prefetchReferenceAnswers(sessionId);
            } catch (Exception e) {
                sessionCache.deleteSession(sessionId);
                try {
                    persistenceService.deleteSessionBySessionId(sessionId);
                } catch (Exception cleanupError) {
                    log.warn("创建失败后清理面试会话失败: sessionId={}, error={}", sessionId, cleanupError.getMessage());
                }
                log.warn("保存面试会话或同步生成参考答案失败: {}", e.getMessage(), e);
                throw new BusinessException(ErrorCode.INTERVIEW_EVALUATION_FAILED, "创建面试失败：参考答案生成失败，请重试");
            }
        }

        InterviewPromptPayload currentPrompt = request.effectiveMode().equalsIgnoreCase("VIDEO") && !questions.isEmpty()
            ? interviewPromptService.buildPrompt(sessionId, questions.get(0))
            : null;

        return new InterviewSessionDTO(
            sessionId,
            request.resumeText(),
            questions.size(),
            0,
            questions,
            SessionStatus.CREATED,
            request.effectiveMode(),
            request.effectiveMaxFollowUps(),
            request.effectiveVideoEnabled(),
            request.effectiveAudioEnabled(),
            currentPrompt
        );
    }

    /**
     * 获取会话信息（优先从缓存获取，缓存未命中则从数据库恢复）
     */
    public InterviewSessionDTO getSession(String sessionId) {
        persistenceService.requireSessionOwnedByUser(sessionId, SecurityUtils.requireUserId());
        // 1. 尝试从 Redis 缓存获取
        Optional<CachedSession> cachedOpt = sessionCache.getSession(sessionId);
        if (cachedOpt.isPresent()) {
            return toDTO(cachedOpt.get());
        }

        // 2. 缓存未命中，从数据库恢复
        CachedSession restoredSession = restoreSessionFromDatabase(sessionId);
        if (restoredSession == null) {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND);
        }

        return toDTO(restoredSession);
    }

    /**
     * 查找并恢复未完成的面试会话
     */
    public Optional<InterviewSessionDTO> findUnfinishedSession(Long resumeId) {
        return findUnfinishedSessionForUser(resumeId, SecurityUtils.requireUserId());
    }

    public Optional<InterviewSessionDTO> findUnfinishedSessionForUser(Long resumeId, Long userId) {
        persistenceService.assertResumeOwnedBy(resumeId, userId);
        try {
            // 1. 先从 Redis 缓存查找
            Optional<String> cachedSessionIdOpt = sessionCache.findUnfinishedSessionId(resumeId);
            if (cachedSessionIdOpt.isPresent()) {
                String sessionId = cachedSessionIdOpt.get();
                Optional<CachedSession> cachedOpt = sessionCache.getSession(sessionId);
                if (cachedOpt.isPresent()) {
                    log.debug("从 Redis 缓存找到未完成会话: resumeId={}, sessionId={}", resumeId, sessionId);
                    return Optional.of(toDTO(cachedOpt.get()));
                }
            }

            // 2. 缓存未命中，从数据库查找
            Optional<InterviewSessionEntity> entityOpt = persistenceService.findUnfinishedSession(resumeId);
            if (entityOpt.isEmpty()) {
                return Optional.empty();
            }

            InterviewSessionEntity entity = entityOpt.get();
            CachedSession restoredSession = restoreSessionFromEntity(entity);
            if (restoredSession != null) {
                return Optional.of(toDTO(restoredSession));
            }
        } catch (Exception e) {
            log.error("恢复未完成会话失败: {}", e.getMessage(), e);
        }
        return Optional.empty();
    }

    /**
     * 查找并恢复未完成的面试会话，如果不存在则抛出异常
     */
    public InterviewSessionDTO findUnfinishedSessionOrThrow(Long resumeId) {
        return findUnfinishedSession(resumeId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND, "未找到未完成的面试会话"));
    }

    /**
     * 从数据库恢复会话并缓存到 Redis
     */
    private CachedSession restoreSessionFromDatabase(String sessionId) {
        try {
            Optional<InterviewSessionEntity> entityOpt = persistenceService.findBySessionIdAndResumeOwnerUserId(
                sessionId, SecurityUtils.requireUserId());
            return entityOpt.map(this::restoreSessionFromEntity).orElse(null);
        } catch (Exception e) {
            log.error("从数据库恢复会话失败: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * 从实体恢复会话并缓存到 Redis
     */
    private CachedSession restoreSessionFromEntity(InterviewSessionEntity entity) {
        try {
            // 解析问题列表
            List<InterviewQuestionDTO> questions = objectMapper.readValue(
                entity.getQuestionsJson(),
                new TypeReference<>() {}
            );

            // 恢复已保存的答案
            List<InterviewAnswerEntity> answers = persistenceService.findAnswersBySessionId(entity.getSessionId());
            for (InterviewAnswerEntity answer : answers) {
                int index = answer.getQuestionIndex();
                if (index >= 0 && index < questions.size()) {
                    InterviewQuestionDTO question = questions.get(index);
                    questions.set(index, question.withAnswer(answer.getUserAnswer()));
                }
            }

            SessionStatus status = convertStatus(entity.getStatus());

            // 保存到 Redis 缓存
            sessionCache.saveSession(
                entity.getSessionId(),
                entity.getResume().getResumeText(),
                entity.getResume().getId(),
                questions,
                entity.getCurrentQuestionIndex(),
                status,
                entity.getMode() == null || entity.getMode().isBlank() ? "TEXT" : entity.getMode(),
                entity.getMaxFollowUps() == null ? 1 : entity.getMaxFollowUps(),
                Boolean.TRUE.equals(entity.getVideoEnabled()),
                entity.getAudioEnabled() == null || entity.getAudioEnabled()
            );

            log.info("从数据库恢复会话到 Redis: sessionId={}, currentIndex={}, status={}",
                entity.getSessionId(), entity.getCurrentQuestionIndex(), entity.getStatus());

            // 返回缓存的会话
            return sessionCache.getSession(entity.getSessionId()).orElse(null);
        } catch (Exception e) {
            log.error("恢复会话失败: {}", e.getMessage(), e);
            return null;
        }
    }

    private SessionStatus convertStatus(InterviewSessionEntity.SessionStatus status) {
        return switch (status) {
            case CREATED -> SessionStatus.CREATED;
            case IN_PROGRESS -> SessionStatus.IN_PROGRESS;
            case COMPLETED -> SessionStatus.COMPLETED;
            case EVALUATED -> SessionStatus.EVALUATED;
        };
    }

    /**
     * 获取当前问题的响应（包含完成状态）
     */
    public Map<String, Object> getCurrentQuestionResponse(String sessionId) {
        InterviewQuestionDTO question = getCurrentQuestion(sessionId);
        if (question == null) {
            return Map.of(
                "completed", true,
                "message", "所有问题已回答完毕"
            );
        }
        return Map.of(
            "completed", false,
            "question", question
        );
    }

    /**
     * 获取当前问题
     */
    public InterviewQuestionDTO getCurrentQuestion(String sessionId) {
        CachedSession session = getOrRestoreSession(sessionId);
        List<InterviewQuestionDTO> questions = session.getQuestions(objectMapper);

        if (session.getCurrentIndex() >= questions.size()) {
            return null; // 所有问题已回答完
        }

        // 更新状态为进行中
        if (session.getStatus() == SessionStatus.CREATED) {
            session.setStatus(SessionStatus.IN_PROGRESS);
            sessionCache.updateSessionStatus(sessionId, SessionStatus.IN_PROGRESS);

            // 同步到数据库
            try {
                persistenceService.updateSessionStatus(sessionId,
                    InterviewSessionEntity.SessionStatus.IN_PROGRESS);
            } catch (Exception e) {
                log.warn("更新会话状态失败: {}", e.getMessage());
            }
        }

        return questions.get(session.getCurrentIndex());
    }

    /**
     * 提交答案（并进入下一题）
     * 如果是最后一题，自动触发异步评估
     */
    public SubmitAnswerResponse submitAnswer(SubmitAnswerRequest request) {
        CachedSession session = getOrRestoreSession(request.sessionId());
        List<InterviewQuestionDTO> questions = session.getQuestions(objectMapper);

        int index = request.questionIndex();
        if (index < 0 || index >= questions.size()) {
            throw new BusinessException(ErrorCode.INTERVIEW_QUESTION_NOT_FOUND, "无效的问题索引: " + index);
        }

        // 更新问题答案
        InterviewQuestionDTO question = questions.get(index);
        // 已提交过的题目不允许再次提交
        if (question.userAnswer() != null && !question.userAnswer().isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "该题已提交，不能重复提交");
        }
        InterviewQuestionDTO answeredQuestion = question.withAnswer(request.answer());
        questions.set(index, answeredQuestion);

        // 更新当前索引（不自动交卷，只有主动点击“提前交卷”才结束）
        int persistedCurrentIndex = Math.max(session.getCurrentIndex(), Math.min(index + 1, questions.size() - 1));

        // 是否还有未回答题目
        boolean hasNextQuestion = questions.stream().anyMatch(q -> q.userAnswer() == null || q.userAnswer().isBlank());
        InterviewQuestionDTO nextQuestion = hasNextQuestion ? questions.get(persistedCurrentIndex) : null;

        // 始终保持进行中，直到用户主动交卷
        SessionStatus newStatus = SessionStatus.IN_PROGRESS;

        // 更新 Redis 缓存
        sessionCache.updateQuestions(request.sessionId(), questions);
        sessionCache.updateCurrentIndex(request.sessionId(), persistedCurrentIndex);
        sessionCache.updateSessionStatus(request.sessionId(), newStatus);

        // 保存答案到数据库
        try {
            persistenceService.saveAnswer(
                request.sessionId(), index,
                question.question(), question.category(),
                request.answer(), 0, null  // 分数在报告生成时更新
            );
            persistenceService.updateCurrentQuestionIndex(request.sessionId(), persistedCurrentIndex);
            persistenceService.updateSessionStatus(request.sessionId(), InterviewSessionEntity.SessionStatus.IN_PROGRESS);
        } catch (Exception e) {
            log.warn("保存答案到数据库失败: {}", e.getMessage());
        }

        log.info("会话 {} 提交答案: 问题{}, 已完成{}题/{}题",
            request.sessionId(), index,
            questions.stream().filter(q -> q.userAnswer() != null && !q.userAnswer().isBlank()).count(),
            questions.size());

        InterviewPromptPayload nextPrompt = null;
        if (hasNextQuestion && nextQuestion != null) {
            boolean videoMode = "VIDEO".equalsIgnoreCase(session.getMode());
            nextPrompt = videoMode ? interviewPromptService.buildPrompt(request.sessionId(), nextQuestion) : null;
        }

        return new SubmitAnswerResponse(
            hasNextQuestion,
            nextQuestion,
            persistedCurrentIndex,
            questions.size(),
            nextPrompt
        );
    }

    /**
     * 暂存答案（不进入下一题）
     */
    public void saveAnswer(SubmitAnswerRequest request) {
        CachedSession session = getOrRestoreSession(request.sessionId());
        List<InterviewQuestionDTO> questions = session.getQuestions(objectMapper);

        int index = request.questionIndex();
        if (index < 0 || index >= questions.size()) {
            throw new BusinessException(ErrorCode.INTERVIEW_QUESTION_NOT_FOUND, "无效的问题索引: " + index);
        }

        // 更新问题答案
        InterviewQuestionDTO question = questions.get(index);
        InterviewQuestionDTO answeredQuestion = question.withAnswer(request.answer());
        questions.set(index, answeredQuestion);

        // 更新 Redis 缓存
        sessionCache.updateQuestions(request.sessionId(), questions);

        // 更新状态为进行中
        if (session.getStatus() == SessionStatus.CREATED) {
            sessionCache.updateSessionStatus(request.sessionId(), SessionStatus.IN_PROGRESS);
        }

        // 保存答案到数据库（不更新currentIndex）
        try {
            persistenceService.saveAnswer(
                request.sessionId(), index,
                question.question(), question.category(),
                request.answer(), 0, null
            );
            persistenceService.updateSessionStatus(request.sessionId(),
                InterviewSessionEntity.SessionStatus.IN_PROGRESS);
        } catch (Exception e) {
            log.warn("暂存答案到数据库失败: {}", e.getMessage());
        }

        log.info("会话 {} 暂存答案: 问题{}", request.sessionId(), index);
    }

    public InterviewSessionDTO applyVideoInterviewDecision(
        String sessionId,
        Integer answeredQuestionIndex,
        String transcript,
        InterviewQuestionDTO nextQuestion,
        InterviewPromptPayload nextPrompt
    ) {
        CachedSession session = getOrRestoreSession(sessionId);
        List<InterviewQuestionDTO> currentQuestions = session.getQuestions(objectMapper);
        List<InterviewQuestionDTO> updatedQuestions = new ArrayList<>(currentQuestions);

        int answeredPosition = findQuestionPosition(updatedQuestions, answeredQuestionIndex);
        if (answeredQuestionIndex == null || answeredPosition < 0) {
            throw new BusinessException(ErrorCode.INTERVIEW_QUESTION_NOT_FOUND, "无效的问题索引: " + answeredQuestionIndex);
        }

        InterviewQuestionDTO answeredQuestion = updatedQuestions.get(answeredPosition).withAnswer(transcript);
        updatedQuestions.set(answeredPosition, answeredQuestion);

        int nextPosition = answeredPosition;
        if (nextQuestion != null) {
            if (nextQuestion.isFollowUp()) {
                int uniqueQuestionIndex = findQuestionPosition(updatedQuestions, nextQuestion.questionIndex()) >= 0
                    ? updatedQuestions.stream().mapToInt(InterviewQuestionDTO::questionIndex).max().orElse(-1) + 1
                    : nextQuestion.questionIndex();
                InterviewQuestionDTO normalizedFollowUp = new InterviewQuestionDTO(
                    uniqueQuestionIndex,
                    nextQuestion.question(),
                    nextQuestion.type(),
                    nextQuestion.category(),
                    nextQuestion.userAnswer(),
                    nextQuestion.score(),
                    nextQuestion.feedback(),
                    true,
                    nextQuestion.parentQuestionIndex()
                );
                updatedQuestions.add(answeredPosition + 1, normalizedFollowUp);
                nextPosition = answeredPosition + 1;
                nextQuestion = normalizedFollowUp;
            } else {
                int existingIndex = findQuestionPosition(updatedQuestions, nextQuestion.questionIndex());
                if (existingIndex >= 0) {
                    updatedQuestions.set(existingIndex, mergeQuestion(nextQuestion, updatedQuestions.get(existingIndex)));
                    nextPosition = existingIndex;
                } else {
                    updatedQuestions.add(nextQuestion);
                    nextPosition = updatedQuestions.size() - 1;
                }
            }
        }

        sessionCache.updateQuestions(sessionId, updatedQuestions);
        sessionCache.updateCurrentIndex(sessionId, nextPosition);
        sessionCache.updateSessionStatus(sessionId, SessionStatus.IN_PROGRESS);

        try {
            persistenceService.saveAnswer(
                sessionId,
                answeredQuestionIndex,
                answeredQuestion.question(),
                answeredQuestion.category(),
                transcript,
                0,
                null
            );
            persistenceService.updateSessionQuestionsAndCurrentIndex(sessionId, updatedQuestions, nextPosition);
            persistenceService.updateSessionStatus(sessionId, InterviewSessionEntity.SessionStatus.IN_PROGRESS);
        } catch (Exception e) {
            log.warn("同步视频面试决策失败: {}", e.getMessage(), e);
        }

        return buildSessionDTO(
            session,
            updatedQuestions,
            nextPosition,
            SessionStatus.IN_PROGRESS,
            nextPrompt
        );
    }

    private int findQuestionPosition(List<InterviewQuestionDTO> questions, int questionIndex) {
        for (int i = 0; i < questions.size(); i++) {
            if (questions.get(i).questionIndex() == questionIndex) {
                return i;
            }
        }
        return -1;
    }

    private InterviewQuestionDTO mergeQuestion(InterviewQuestionDTO incoming, InterviewQuestionDTO existing) {
        return new InterviewQuestionDTO(
            existing.questionIndex(),
            incoming.question(),
            incoming.type(),
            incoming.category(),
            existing.userAnswer(),
            existing.score(),
            existing.feedback(),
            incoming.isFollowUp(),
            incoming.parentQuestionIndex()
        );
    }

    /**
     * 提前交卷（触发异步评估）
     */
    public void completeInterview(String sessionId) {
        CachedSession session = getOrRestoreSession(sessionId);

        if (session.getStatus() == SessionStatus.COMPLETED || session.getStatus() == SessionStatus.EVALUATED) {
            throw new BusinessException(ErrorCode.INTERVIEW_ALREADY_COMPLETED);
        }

        // 更新 Redis 缓存
        sessionCache.updateSessionStatus(sessionId, SessionStatus.COMPLETED);

        // 更新数据库状态
        try {
            persistenceService.updateSessionStatus(sessionId,
                InterviewSessionEntity.SessionStatus.COMPLETED);
            // 设置评估状态为 PENDING
            persistenceService.updateEvaluateStatus(sessionId, AsyncTaskStatus.PENDING, null);
        } catch (Exception e) {
            log.warn("更新会话状态失败: {}", e.getMessage());
        }

        // 发送评估任务到 Redis Stream
        evaluateStreamProducer.sendEvaluateTask(sessionId);

        log.info("会话 {} 提前交卷，评估任务已入队", sessionId);
    }

    /**
     * 获取或恢复会话（优先从缓存获取）
     */
    private CachedSession getOrRestoreSession(String sessionId) {
        persistenceService.requireSessionOwnedByUser(sessionId, SecurityUtils.requireUserId());
        // 1. 尝试从 Redis 缓存获取
        Optional<CachedSession> cachedOpt = sessionCache.getSession(sessionId);
        if (cachedOpt.isPresent()) {
            // 刷新 TTL
            sessionCache.refreshSessionTTL(sessionId);
            return cachedOpt.get();
        }

        // 2. 缓存未命中，从数据库恢复
        CachedSession restoredSession = restoreSessionFromDatabase(sessionId);
        if (restoredSession == null) {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND);
        }

        return restoredSession;
    }

    /**
     * 生成评估报告
     */
    public InterviewReportDTO generateReport(String sessionId) {
        CachedSession session = getOrRestoreSession(sessionId);

        if (session.getStatus() != SessionStatus.COMPLETED && session.getStatus() != SessionStatus.EVALUATED) {
            throw new BusinessException(ErrorCode.INTERVIEW_NOT_COMPLETED, "面试尚未完成，无法生成报告");
        }

        log.info("生成面试报告: {}", sessionId);

        List<InterviewQuestionDTO> questions = session.getQuestions(objectMapper);

        InterviewReportDTO report = evaluationService.evaluateInterview(
            sessionId,
            session.getResumeText(),
            questions
        );

        // 更新 Redis 缓存状态
        sessionCache.updateSessionStatus(sessionId, SessionStatus.EVALUATED);

        // 保存报告到数据库
        try {
            persistenceService.saveReport(sessionId, report);
        } catch (Exception e) {
            log.warn("保存报告到数据库失败: {}", e.getMessage());
        }

        return report;
    }

    /**
     * 将缓存会话转换为 DTO
     */
    private InterviewSessionDTO toDTO(CachedSession session) {
        List<InterviewQuestionDTO> questions = session.getQuestions(objectMapper);
        InterviewPromptPayload currentPrompt = session.getCurrentIndex() < questions.size()
            ? interviewPromptService.buildPrompt(session.getSessionId(), questions.get(session.getCurrentIndex()))
            : null;
        return buildSessionDTO(session, questions, session.getCurrentIndex(), session.getStatus(), currentPrompt);
    }

    private InterviewSessionDTO buildSessionDTO(
        CachedSession session,
        List<InterviewQuestionDTO> questions,
        int currentIndex,
        SessionStatus status,
        InterviewPromptPayload currentPrompt
    ) {
        return new InterviewSessionDTO(
            session.getSessionId(),
            session.getResumeText(),
            questions.size(),
            questions.isEmpty() ? 0 : questions.get(Math.max(0, Math.min(currentIndex, questions.size() - 1))).questionIndex(),
            questions,
            status,
            session.getMode() == null || session.getMode().isBlank() ? "TEXT" : session.getMode(),
            session.getMaxFollowUps() == null ? 1 : session.getMaxFollowUps(),
            session.getVideoEnabled() != null && session.getVideoEnabled(),
            session.getAudioEnabled() == null || session.getAudioEnabled(),
            currentPrompt
        );
    }
}
