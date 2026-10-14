package interview.guide.modules.interview.service;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.common.model.AsyncTaskStatus;
import interview.guide.modules.interview.model.InterviewAnswerEntity;
import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.InterviewReportDTO;
import interview.guide.modules.interview.model.InterviewReportDTO.ReferenceAnswer;
import interview.guide.modules.interview.model.InterviewSessionEntity;
import interview.guide.modules.interview.repository.InterviewAnswerRepository;
import interview.guide.modules.interview.repository.InterviewSessionRepository;
import interview.guide.modules.resume.model.ResumeEntity;
import interview.guide.modules.resume.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 面试持久化服务
 * 面试会话和答案的持久化
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewPersistenceService {
    
    private final InterviewSessionRepository sessionRepository;
    private final InterviewAnswerRepository answerRepository;
    private final ResumeRepository resumeRepository;
    private final ObjectMapper objectMapper;
    private final InterviewQuestionCollectionService collectionService;
    private final AnswerEvaluationService answerEvaluationService;
    
    /**
     * 保存新的面试会话
     */
    @Transactional(rollbackFor = Exception.class)
    public InterviewSessionEntity saveSession(String sessionId, Long resumeId,
                                              int totalQuestions,
                                              List<InterviewQuestionDTO> questions,
                                              Long ownerUserId,
                                              String mode,
                                              Integer maxFollowUps,
                                              Boolean videoEnabled,
                                              Boolean audioEnabled) {
        try {
            Optional<ResumeEntity> resumeOpt = resumeRepository.findByIdAndOwnerUserId(resumeId, ownerUserId);
            if (resumeOpt.isEmpty()) {
                throw new BusinessException(ErrorCode.RESUME_NOT_FOUND);
            }
            
            InterviewSessionEntity session = new InterviewSessionEntity();
            session.setSessionId(sessionId);
            session.setResume(resumeOpt.get());
            session.setTotalQuestions(totalQuestions);
            session.setCurrentQuestionIndex(0);
            session.setStatus(InterviewSessionEntity.SessionStatus.CREATED);
            session.setQuestionsJson(objectMapper.writeValueAsString(questions));
            session.setMode(mode);
            session.setMaxFollowUps(maxFollowUps);
            session.setVideoEnabled(videoEnabled);
            session.setAudioEnabled(audioEnabled);
            
            InterviewSessionEntity saved = sessionRepository.save(session);
            log.info("面试会话已保存: sessionId={}, resumeId={}", sessionId, resumeId);
            
            return saved;
        } catch (JacksonException e) {
            log.error("序列化问题列表失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "保存会话失败");
        }
    }
    
    /**
     * 更新会话状态
     */
    @Transactional(rollbackFor = Exception.class)
    public void updateSessionStatus(String sessionId, InterviewSessionEntity.SessionStatus status) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            InterviewSessionEntity session = sessionOpt.get();
            session.setStatus(status);
            if (status == InterviewSessionEntity.SessionStatus.COMPLETED ||
                status == InterviewSessionEntity.SessionStatus.EVALUATED) {
                session.setCompletedAt(LocalDateTime.now());
            }
            sessionRepository.save(session);
        }
    }

    /**
     * 更新评估状态
     */
    @Transactional(rollbackFor = Exception.class)
    public void updateEvaluateStatus(String sessionId, AsyncTaskStatus status, String error) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            InterviewSessionEntity session = sessionOpt.get();
            session.setEvaluateStatus(status);
            if (error != null) {
                session.setEvaluateError(error.length() > 500 ? error.substring(0, 500) : error);
            } else {
                session.setEvaluateError(null);
            }
            sessionRepository.save(session);
            log.debug("评估状态已更新: sessionId={}, status={}", sessionId, status);
        }
    }
    
    /**
     * 更新当前问题索引
     */
    @Transactional(rollbackFor = Exception.class)
    public void updateCurrentQuestionIndex(String sessionId, int index) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            InterviewSessionEntity session = sessionOpt.get();
            session.setCurrentQuestionIndex(index);
            session.setStatus(InterviewSessionEntity.SessionStatus.IN_PROGRESS);
            sessionRepository.save(session);
        }
    }

    /**
     * 更新问题列表与当前问题索引
     */
    @Transactional(rollbackFor = Exception.class)
    public void updateSessionQuestionsAndCurrentIndex(String sessionId, List<InterviewQuestionDTO> questions, int currentIndex) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isEmpty()) {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND);
        }
        try {
            InterviewSessionEntity session = sessionOpt.get();
            session.setQuestionsJson(objectMapper.writeValueAsString(questions));
            session.setTotalQuestions(questions.size());
            session.setCurrentQuestionIndex(currentIndex);
            session.setStatus(InterviewSessionEntity.SessionStatus.IN_PROGRESS);
            sessionRepository.save(session);
        } catch (JacksonException e) {
            log.error("更新面试问题列表失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "更新面试会话失败");
        }
    }
    
    /**
     * 保存面试答案
     */
    @Transactional(rollbackFor = Exception.class)
    public InterviewAnswerEntity saveAnswer(String sessionId, int questionIndex,
                                            String question, String category,
                                            String userAnswer, int score, String feedback) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isEmpty()) {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND);
        }

        InterviewAnswerEntity answer = answerRepository
            .findBySession_SessionIdAndQuestionIndex(sessionId, questionIndex)
            .orElseGet(() -> {
                InterviewAnswerEntity created = new InterviewAnswerEntity();
                created.setSession(sessionOpt.get());
                created.setQuestionIndex(questionIndex);
                return created;
            });

        answer.setQuestion(question);
        answer.setCategory(category);
        answer.setUserAnswer(userAnswer);
        answer.setScore(score);
        answer.setFeedback(feedback);

        InterviewAnswerEntity saved = answerRepository.save(answer);
        log.info("面试答案已保存: sessionId={}, questionIndex={}, score={}", 
                sessionId, questionIndex, score);
        
        return saved;
    }
    
    /**
     * 保存面试报告
     */
    @Transactional(rollbackFor = Exception.class)
    public void saveReport(String sessionId, InterviewReportDTO report) {
        try {
            Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
            if (sessionOpt.isEmpty()) {
                log.warn("会话不存在: {}", sessionId);
                return;
            }

            InterviewSessionEntity session = sessionOpt.get();
            session.setOverallScore(report.overallScore());
            session.setOverallFeedback(report.overallFeedback());
            session.setStrengthsJson(objectMapper.writeValueAsString(report.strengths()));
            session.setImprovementsJson(objectMapper.writeValueAsString(report.improvements()));
            session.setReferenceAnswersJson(objectMapper.writeValueAsString(report.referenceAnswers()));
            session.setStatus(InterviewSessionEntity.SessionStatus.EVALUATED);
            session.setCompletedAt(LocalDateTime.now());

            sessionRepository.save(session);

            // 查询已存在的答案，建立索引
            List<InterviewAnswerEntity> existingAnswers = answerRepository.findBySession_SessionIdOrderByQuestionIndex(sessionId);
            java.util.Map<Integer, InterviewAnswerEntity> answerMap = existingAnswers.stream()
                .collect(java.util.stream.Collectors.toMap(
                    InterviewAnswerEntity::getQuestionIndex,
                    a -> a,
                    (a1, a2) -> a1
                ));

            // 建立参考答案索引
            java.util.Map<Integer, InterviewReportDTO.ReferenceAnswer> refAnswerMap = report.referenceAnswers().stream()
                .collect(java.util.stream.Collectors.toMap(
                    InterviewReportDTO.ReferenceAnswer::questionIndex,
                    r -> r,
                    (r1, r2) -> r1
                ));

            List<InterviewAnswerEntity> answersToSave = new java.util.ArrayList<>();

            // 遍历所有评估结果，更新或创建答案记录
            for (InterviewReportDTO.QuestionEvaluation eval : report.questionDetails()) {
                InterviewAnswerEntity answer = answerMap.get(eval.questionIndex());

                if (answer == null) {
                    // 未回答的题目，创建新记录
                    answer = new InterviewAnswerEntity();
                    answer.setSession(session);
                    answer.setQuestionIndex(eval.questionIndex());
                    answer.setQuestion(eval.question());
                    answer.setCategory(eval.category());
                    answer.setUserAnswer(null);  // 未回答
                    log.debug("为未回答的题目 {} 创建答案记录", eval.questionIndex());
                }

                // 更新评分和反馈
                answer.setScore(eval.score());
                answer.setFeedback(eval.feedback());

                // 设置参考答案和关键点
                InterviewReportDTO.ReferenceAnswer refAns = refAnswerMap.get(eval.questionIndex());
                if (refAns != null) {
                    answer.setReferenceAnswer(refAns.referenceAnswer());
                    if (refAns.keyPoints() != null && !refAns.keyPoints().isEmpty()) {
                        answer.setKeyPointsJson(objectMapper.writeValueAsString(refAns.keyPoints()));
                    }
                }

                answersToSave.add(answer);
            }

            answerRepository.saveAll(answersToSave);

            // 评估完成后，回填已收藏题目的标准答案到知识库文档
            collectionService.syncCollectedQuestionsAfterEvaluation(sessionId);

            log.info("面试报告已保存: sessionId={}, score={}, 答案数={}",
                sessionId, report.overallScore(), answersToSave.size());

        } catch (JacksonException e) {
            log.error("序列化报告失败: {}", e.getMessage(), e);
        }
    }
    
    /**
     * 根据会话ID获取会话
     */
    public Optional<InterviewSessionEntity> findBySessionId(String sessionId) {
        return sessionRepository.findBySessionId(sessionId);
    }

    public Optional<InterviewSessionEntity> findBySessionIdAndResumeOwnerUserId(String sessionId, Long userId) {
        return sessionRepository.findBySessionIdAndResumeOwnerUserId(sessionId, userId);
    }

    /**
     * 校验简历归属；不通过则抛出简历不存在（避免枚举资源）
     */
    public void assertResumeOwnedBy(Long resumeId, Long userId) {
        if (!resumeRepository.existsByIdAndOwnerUserId(resumeId, userId)) {
            throw new BusinessException(ErrorCode.RESUME_NOT_FOUND);
        }
    }

    public InterviewSessionEntity requireSessionOwnedByUser(String sessionId, Long userId) {
        return sessionRepository.findBySessionIdAndResumeOwnerUserId(sessionId, userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));
    }
    
    /**
     * 获取简历的所有面试记录
     */
    public List<InterviewSessionEntity> findByResumeId(Long resumeId) {
        return sessionRepository.findByResumeIdOrderByCreatedAtDesc(resumeId);
    }
    
    /**
     * 删除简历的所有面试会话
     * 由于InterviewSessionEntity设置了cascade = CascadeType.ALL, orphanRemoval = true
     * 删除会话会自动删除关联的答案
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteSessionsByResumeId(Long resumeId) {
        List<InterviewSessionEntity> sessions = sessionRepository.findByResumeIdOrderByCreatedAtDesc(resumeId);
        if (!sessions.isEmpty()) {
            sessionRepository.deleteAll(sessions);
            log.info("已删除 {} 个面试会话（包含所有答案）", sessions.size());
        }
    }
    
    /**
     * 删除单个面试会话
     * 由于InterviewSessionEntity设置了cascade = CascadeType.ALL, orphanRemoval = true
     * 删除会话会自动删除关联的答案
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteSessionBySessionId(String sessionId) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            sessionRepository.delete(sessionOpt.get());
            log.info("已删除面试会话: sessionId={}", sessionId);
        } else {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND);
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteSessionBySessionIdForUser(String sessionId, Long userId) {
        InterviewSessionEntity session = sessionRepository.findBySessionIdAndResumeOwnerUserId(sessionId, userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));
        sessionRepository.delete(session);
        log.info("已删除面试会话: sessionId={}, userId={}", sessionId, userId);
    }
    
    /**
     * 查找未完成的面试会话（CREATED或IN_PROGRESS状态）
     */
    public Optional<InterviewSessionEntity> findUnfinishedSession(Long resumeId) {
        List<InterviewSessionEntity.SessionStatus> unfinishedStatuses = List.of(
            InterviewSessionEntity.SessionStatus.CREATED,
            InterviewSessionEntity.SessionStatus.IN_PROGRESS
        );
        return sessionRepository.findFirstByResumeIdAndStatusInOrderByCreatedAtDesc(resumeId, unfinishedStatuses);
    }
    
    /**
     * 根据会话ID查找所有答案
     */
    public List<InterviewAnswerEntity> findAnswersBySessionId(String sessionId) {
        return answerRepository.findBySession_SessionIdOrderByQuestionIndex(sessionId);
    }

    /**
     * 预生成会话主问题的标准答案，并提前落库，供收藏时直接复用。
     * 追问题在收藏时按需兜底生成，以缩短创建面试耗时。
     */
    @Transactional(rollbackFor = Exception.class)
    public void prefetchReferenceAnswers(String sessionId) {
        InterviewSessionEntity session = sessionRepository.findBySessionIdWithResume(sessionId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND));

        try {
            List<InterviewQuestionDTO> questions = objectMapper.readValue(
                session.getQuestionsJson(),
                new TypeReference<List<InterviewQuestionDTO>>() {}
            );

            List<ReferenceAnswer> referenceAnswers = new java.util.ArrayList<>();
            List<InterviewAnswerEntity> existingAnswers = answerRepository.findBySession_SessionIdOrderByQuestionIndex(sessionId);
            java.util.Map<Integer, InterviewAnswerEntity> existingAnswerMap = existingAnswers.stream()
                .collect(java.util.stream.Collectors.toMap(
                    InterviewAnswerEntity::getQuestionIndex,
                    a -> a,
                    (a1, a2) -> a1
                ));

            for (InterviewQuestionDTO question : questions) {
                if (question == null || question.isFollowUp()) {
                    continue;
                }

                ReferenceAnswer generated = answerEvaluationService.generateReferenceAnswer(
                    sessionId,
                    session.getResume().getResumeText(),
                    question
                );
                referenceAnswers.add(generated);

                InterviewAnswerEntity answer = existingAnswerMap.get(question.questionIndex());
                if (answer == null) {
                    continue;
                }

                answer.setQuestion(question.question());
                answer.setCategory(question.category());
                answer.setReferenceAnswer(generated.referenceAnswer());
                if (generated.keyPoints() != null && !generated.keyPoints().isEmpty()) {
                    answer.setKeyPointsJson(objectMapper.writeValueAsString(generated.keyPoints()));
                } else {
                    answer.setKeyPointsJson(null);
                }
            }

            session.setReferenceAnswersJson(objectMapper.writeValueAsString(referenceAnswers));
            sessionRepository.save(session);
            if (!existingAnswers.isEmpty()) {
                answerRepository.saveAll(existingAnswers);
            }
            log.info("主问题标准答案预生成完成并已落库: sessionId={}, count={}", sessionId, referenceAnswers.size());
        } catch (Exception e) {
            log.error("标准答案预生成失败: sessionId={}, error={}", sessionId, e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERVIEW_EVALUATION_FAILED, "标准答案预生成失败：" + e.getMessage());
        }
    }

    /**
     * 获取简历的历史提问列表（限制最近的 N 条）
     */
    public List<String> getHistoricalQuestionsByResumeId(Long resumeId) {
        // 只查询最近的 10 个会话，避免加载过多历史数据
        List<InterviewSessionEntity> sessions = sessionRepository.findTop10ByResumeIdOrderByCreatedAtDesc(resumeId);
        
        return sessions.stream()
            .map(InterviewSessionEntity::getQuestionsJson)
            .filter(json -> json != null && !json.isEmpty())
            .flatMap(json -> {
                try {
                    List<InterviewQuestionDTO> questions = objectMapper.readValue(json,
                        new TypeReference<List<InterviewQuestionDTO>>() {});
                    // 过滤掉追问，只保留主问题作为历史参考
                    return questions.stream()
                        .filter(q -> !q.isFollowUp())
                        .map(InterviewQuestionDTO::question);
                } catch (Exception e) {
                    log.error("解析历史问题JSON失败", e);
                    return java.util.stream.Stream.empty();
                }
            })
            .distinct()
            .limit(30) // 核心改动：只保留最近的 30 道题
            .toList();
    }

    /**
     * 保存完整面试视频信息
     */
    @Transactional(rollbackFor = Exception.class)
    public void saveCompleteInterviewVideo(
        String sessionId,
        String videoFileKey,
        String videoFileUrl,
        Long videoFileSize,
        Integer durationSeconds
    ) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            InterviewSessionEntity session = sessionOpt.get();
            session.setCompleteVideoFileKey(videoFileKey);
            session.setCompleteVideoFileUrl(videoFileUrl);
            session.setCompleteVideoFileSize(videoFileSize);
            session.setCompleteVideoDurationSeconds(durationSeconds);
            sessionRepository.save(session);
            log.info("完整面试视频信息已保存: sessionId={}, fileKey={}", sessionId, videoFileKey);
        }
    }

    /**
     * 保存对话记录
     */
    @Transactional(rollbackFor = Exception.class)
    public void saveConversationLog(
        String sessionId,
        List<interview.guide.modules.interview.model.UploadCompleteInterviewRequest.ConversationLogEntry> conversationLog
    ) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            try {
                InterviewSessionEntity session = sessionOpt.get();
                session.setConversationLogJson(objectMapper.writeValueAsString(conversationLog));
                sessionRepository.save(session);
                log.info("对话记录已保存: sessionId={}, entries={}", sessionId, conversationLog.size());
            } catch (Exception e) {
                log.error("保存对话记录失败: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * 保存视频分析结果
     */
    @Transactional(rollbackFor = Exception.class)
    public void saveVideoAnalysisResult(
        String sessionId,
        interview.guide.modules.interview.service.CompleteInterviewVideoService.VideoAnalysisDTO analysisResult
    ) {
        Optional<InterviewSessionEntity> sessionOpt = sessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            try {
                InterviewSessionEntity session = sessionOpt.get();
                session.setVideoAnalysisJson(objectMapper.writeValueAsString(analysisResult));
                sessionRepository.save(session);
                log.info("视频分析结果已保存: sessionId={}", sessionId);
            } catch (Exception e) {
                log.error("保存视频分析结果失败: {}", e.getMessage(), e);
            }
        }
    }
}
