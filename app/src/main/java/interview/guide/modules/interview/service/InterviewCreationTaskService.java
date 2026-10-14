package interview.guide.modules.interview.service;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.common.model.AsyncTaskStatus;
import interview.guide.infrastructure.redis.InterviewCreationTaskCache;
import interview.guide.infrastructure.redis.InterviewSessionCache;
import interview.guide.infrastructure.security.SecurityUtils;
import interview.guide.modules.interview.model.CreateInterviewRequest;
import interview.guide.modules.interview.model.CreateInterviewTaskResponse;
import interview.guide.modules.interview.model.InterviewCreationTaskStatusResponse;
import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.InterviewPromptPayload;
import interview.guide.modules.interview.model.InterviewSessionDTO;
import interview.guide.modules.interview.model.InterviewSessionDTO.SessionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewCreationTaskService {

    private final InterviewCreationTaskCache creationTaskCache;
    private final InterviewSessionService sessionService;
    private final InterviewQuestionService questionService;
    private final InterviewPersistenceService persistenceService;
    private final InterviewSessionCache sessionCache;
    private final InterviewPromptService interviewPromptService;

    public CreateInterviewTaskResponse createTask(CreateInterviewRequest request) {
        long userId = SecurityUtils.requireUserId();
        persistenceService.assertResumeOwnedBy(request.resumeId(), userId);

        String taskId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        InterviewCreationTaskCache.CachedTask task = new InterviewCreationTaskCache.CachedTask();
        task.setTaskId(taskId);
        task.setUserId(userId);
        task.setResumeId(request.resumeId());
        task.setStatus(AsyncTaskStatus.PENDING);
        task.setStage("PENDING");
        task.setMessage("创建任务已提交，等待开始...");
        creationTaskCache.save(task);

        CompletableFuture.runAsync(() -> runTask(taskId, request, userId));
        return new CreateInterviewTaskResponse(taskId);
    }

    public InterviewCreationTaskStatusResponse getTaskStatus(String taskId) {
        long userId = SecurityUtils.requireUserId();
        InterviewCreationTaskCache.CachedTask task = creationTaskCache.get(taskId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "创建任务不存在或已过期"));

        if (task.getUserId() == null || task.getUserId() != userId) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "创建任务不存在或已过期");
        }

        return new InterviewCreationTaskStatusResponse(
            task.getTaskId(),
            task.getStatus(),
            task.getStage(),
            task.getMessage(),
            task.getError(),
            task.getSession()
        );
    }

    private void runTask(String taskId, CreateInterviewRequest request, long userId) {
        InterviewCreationTaskCache.CachedTask task = creationTaskCache.get(taskId).orElse(null);
        if (task == null) {
            return;
        }

        String sessionId = null;
        try {
            updateTask(task, AsyncTaskStatus.PROCESSING, "CHECKING_UNFINISHED", "正在检查未完成面试...", null, null);
            if (request.resumeId() != null && !Boolean.TRUE.equals(request.forceCreate())) {
                Optional<InterviewSessionDTO> unfinishedOpt = sessionService.findUnfinishedSessionForUser(request.resumeId(), userId);
                if (unfinishedOpt.isPresent()) {
                    updateTask(task, AsyncTaskStatus.COMPLETED, "COMPLETED", "已返回未完成的面试会话", null, unfinishedOpt.get());
                    return;
                }
            }

            sessionId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);

            updateTask(task, AsyncTaskStatus.PROCESSING, "GENERATING_QUESTIONS", "正在生成面试题目...", null, null);
            List<String> historicalQuestions = null;
            if (request.resumeId() != null) {
                historicalQuestions = persistenceService.getHistoricalQuestionsByResumeId(request.resumeId());
            }
            List<InterviewQuestionDTO> questions = questionService.generateQuestions(
                request.resumeText(),
                request.effectiveQuestionCount(),
                historicalQuestions
            );

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

            if (request.resumeId() != null) {
                updateTask(task, AsyncTaskStatus.PROCESSING, "SAVING_SESSION", "正在保存面试会话...", null, null);
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

                final String createdSessionId = sessionId;
                CompletableFuture.runAsync(() -> {
                    try {
                        persistenceService.prefetchReferenceAnswers(createdSessionId);
                    } catch (Exception ex) {
                        log.warn("主问题参考答案后台预生成失败: sessionId={}, error={}", createdSessionId, ex.getMessage());
                    }
                });
            }

            InterviewPromptPayload currentPrompt = request.effectiveMode().equalsIgnoreCase("VIDEO") && !questions.isEmpty()
                ? interviewPromptService.buildPrompt(sessionId, questions.get(0))
                : null;
            InterviewSessionDTO session = new InterviewSessionDTO(
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
            updateTask(task, AsyncTaskStatus.COMPLETED, "COMPLETED", "面试创建完成", null, session);
        } catch (Exception e) {
            log.warn("异步创建面试失败: taskId={}, error={}", taskId, e.getMessage(), e);
            if (sessionId != null) {
                sessionCache.deleteSession(sessionId);
                try {
                    persistenceService.deleteSessionBySessionId(sessionId);
                } catch (Exception cleanupError) {
                    log.warn("异步创建失败后清理面试会话失败: sessionId={}, error={}", sessionId, cleanupError.getMessage());
                }
            }
            updateTask(task, AsyncTaskStatus.FAILED, "FAILED", "创建面试失败", e.getMessage(), null);
        }
    }

    private void updateTask(
        InterviewCreationTaskCache.CachedTask task,
        AsyncTaskStatus status,
        String stage,
        String message,
        String error,
        InterviewSessionDTO session
    ) {
        task.setStatus(status);
        task.setStage(stage);
        task.setMessage(message);
        task.setError(error);
        task.setSession(session);
        creationTaskCache.save(task);
    }
}
