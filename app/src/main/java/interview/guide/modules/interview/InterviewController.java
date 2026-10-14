package interview.guide.modules.interview;

import interview.guide.common.annotation.RateLimit;
import interview.guide.common.result.Result;
import interview.guide.infrastructure.file.FileStorageService;
import interview.guide.infrastructure.security.SecurityUtils;
import interview.guide.modules.interview.model.*;
import interview.guide.modules.interview.service.InterviewCreationTaskService;
import interview.guide.modules.interview.service.InterviewHistoryService;
import interview.guide.modules.interview.service.InterviewMediaAnalysisService;
import interview.guide.modules.interview.service.InterviewPersistenceService;
import interview.guide.modules.interview.service.InterviewQuestionCollectionService;
import interview.guide.modules.interview.service.InterviewSessionService;
import interview.guide.modules.interview.service.CompleteInterviewVideoService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * 面试控制器
 * 提供模拟面试相关的API接口
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "模拟面试", description = "面试会话创建、问答交互与报告生成")
public class InterviewController {
    
    private final InterviewSessionService sessionService;
    private final InterviewCreationTaskService creationTaskService;
    private final InterviewHistoryService historyService;
    private final InterviewPersistenceService persistenceService;
    private final InterviewQuestionCollectionService collectionService;
    private final InterviewMediaAnalysisService interviewMediaAnalysisService;
    private final FileStorageService fileStorageService;
    private final CompleteInterviewVideoService completeInterviewVideoService;
    
    /**
     * 创建面试异步任务
     */
    @PostMapping("/api/interview/sessions/tasks")
    @RateLimit(dimension = RateLimit.Dimension.GLOBAL, count = 5)
    @RateLimit(dimension = RateLimit.Dimension.IP, count = 5)
    public Result<CreateInterviewTaskResponse> createSessionTask(@RequestBody CreateInterviewRequest request) {
        log.info("提交创建面试异步任务，题目数量: {}", request.questionCount());
        return Result.success(creationTaskService.createTask(request));
    }

    /**
     * 查询创建面试异步任务状态
     */
    @GetMapping("/api/interview/sessions/tasks/{taskId}")
    public Result<InterviewCreationTaskStatusResponse> getCreateSessionTaskStatus(@PathVariable String taskId) {
        return Result.success(creationTaskService.getTaskStatus(taskId));
    }

    /**
     * 创建面试会话
     */
    @PostMapping("/api/interview/sessions")
    @RateLimit(dimension = RateLimit.Dimension.GLOBAL, count = 5)
    @RateLimit(dimension = RateLimit.Dimension.IP, count = 5)
    public Result<InterviewSessionDTO> createSession(@RequestBody CreateInterviewRequest request) {
        log.info("创建面试会话，题目数量: {}", request.questionCount());
        InterviewSessionDTO session = sessionService.createSession(request);
        return Result.success(session);
    }
    
    /**
     * 获取会话信息
     */
    @GetMapping("/api/interview/sessions/{sessionId}")
    public Result<InterviewSessionDTO> getSession(@PathVariable String sessionId) {
        InterviewSessionDTO session = sessionService.getSession(sessionId);
        return Result.success(session);
    }
    
    /**
     * 获取当前问题
     */
    @GetMapping("/api/interview/sessions/{sessionId}/question")
    public Result<Map<String, Object>> getCurrentQuestion(@PathVariable String sessionId) {
        return Result.success(sessionService.getCurrentQuestionResponse(sessionId));
    }
    
    /**
     * 提交答案
     */
    @PostMapping("/api/interview/sessions/{sessionId}/answers")
    @RateLimit(dimension = RateLimit.Dimension.GLOBAL, count = 10)
    public Result<SubmitAnswerResponse> submitAnswer(
            @PathVariable String sessionId,
            @RequestBody Map<String, Object> body) {
        Integer questionIndex = (Integer) body.get("questionIndex");
        String answer = (String) body.get("answer");
        log.info("提交答案: 会话{}, 问题{}", sessionId, questionIndex);
        SubmitAnswerRequest request = new SubmitAnswerRequest(sessionId, questionIndex, answer);
        SubmitAnswerResponse response = sessionService.submitAnswer(request);
        return Result.success(response);
    }
    
    /**
     * 生成面试报告
     */
    @GetMapping("/api/interview/sessions/{sessionId}/report")
    public Result<InterviewReportDTO> getReport(@PathVariable String sessionId) {
        log.info("生成面试报告: {}", sessionId);
        InterviewReportDTO report = sessionService.generateReport(sessionId);
        return Result.success(report);
    }
    
    /**
     * 查找未完成的面试会话
     * GET /api/interview/sessions/unfinished/{resumeId}
     */
    @GetMapping("/api/interview/sessions/unfinished/{resumeId}")
    public Result<InterviewSessionDTO> findUnfinishedSession(@PathVariable Long resumeId) {
        return Result.success(sessionService.findUnfinishedSessionOrThrow(resumeId));
    }
    
    /**
     * 暂存答案（不进入下一题）
     */
    @PutMapping("/api/interview/sessions/{sessionId}/answers")
    public Result<Void> saveAnswer(
            @PathVariable String sessionId,
            @RequestBody Map<String, Object> body) {
        Integer questionIndex = (Integer) body.get("questionIndex");
        String answer = (String) body.get("answer");
        log.info("暂存答案: 会话{}, 问题{}", sessionId, questionIndex);
        SubmitAnswerRequest request = new SubmitAnswerRequest(sessionId, questionIndex, answer);
        sessionService.saveAnswer(request);
        return Result.success(null);
    }
    
    /**
     * 提前交卷
     */
    @PostMapping("/api/interview/sessions/{sessionId}/complete")
    public Result<Void> completeInterview(@PathVariable String sessionId) {
        log.info("提前交卷: {}", sessionId);
        sessionService.completeInterview(sessionId);
        return Result.success(null);
    }
    
    /**
     * 收藏当前面试题到知识库
     */
    @PostMapping("/api/interview/sessions/{sessionId}/collect")
    public Result<CollectInterviewQuestionResponse> collectInterviewQuestion(
            @PathVariable String sessionId,
            @RequestBody CollectInterviewQuestionRequest request) {
        log.info("收藏面试题: sessionId={}, questionIndex={}", sessionId, request.questionIndex());
        return Result.success(collectionService.collectQuestion(sessionId, request.questionIndex()));
    }

    /**
     * 取消收藏当前面试题
     */
    @DeleteMapping("/api/interview/sessions/{sessionId}/collect")
    public Result<CollectInterviewQuestionResponse> uncollectInterviewQuestion(
            @PathVariable String sessionId,
            @RequestParam("questionIndex") Integer questionIndex) {
        log.info("取消收藏面试题: sessionId={}, questionIndex={}", sessionId, questionIndex);
        return Result.success(collectionService.uncollectQuestion(sessionId, questionIndex));
    }

    /**
     * 上传视频面试录制媒体
     */
    @PostMapping(value = "/api/interview/sessions/{sessionId}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<UploadInterviewMediaResponse> uploadInterviewMedia(
            @PathVariable String sessionId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("questionIndex") Integer questionIndex,
            @RequestParam(value = "transcript", required = false) String transcript) {
        log.info("上传视频面试媒体: sessionId={}, questionIndex={}, fileName={}, size={}",
                sessionId, questionIndex, file.getOriginalFilename(), file.getSize());
        String fileKey = fileStorageService.uploadInterviewMedia(file);
        String fileUrl = fileStorageService.getFileUrl(fileKey);
        ProcessInterviewMediaResult processResult = interviewMediaAnalysisService.processUploadedRound(
                sessionId,
                questionIndex,
                file,
                fileKey,
                fileUrl,
                transcript
        );
        return Result.success(new UploadInterviewMediaResponse(
                sessionId,
                questionIndex,
                fileKey,
                fileUrl,
                file.getContentType(),
                file.getSize(),
                "上传成功",
                processResult.currentRound(),
                processResult.decision(),
                processResult.nextQuestion(),
                processResult.nextPrompt(),
                processResult.sttProvider()
        ));
    }

    /**
     * 获取面试会话详情
     * GET /api/interview/sessions/{sessionId}/details
     */
    @GetMapping("/api/interview/sessions/{sessionId}/details")
    public Result<InterviewDetailDTO> getInterviewDetail(@PathVariable String sessionId) {
        InterviewDetailDTO detail = historyService.getInterviewDetail(sessionId);
        return Result.success(detail);
    }
    
    /**
     * 导出面试报告为PDF
     */
    @GetMapping("/api/interview/sessions/{sessionId}/export")
    public ResponseEntity<byte[]> exportInterviewPdf(@PathVariable String sessionId) {
        try {
            byte[] pdfBytes = historyService.exportInterviewPdf(sessionId);
            String filename = URLEncoder.encode("模拟面试报告_" + sessionId + ".pdf", 
                StandardCharsets.UTF_8);
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
        } catch (Exception e) {
            log.error("导出PDF失败", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 一键整理面试记录并上传知识库
     */
    @PostMapping("/api/interview/sessions/{sessionId}/collect-record")
    public Result<Map<String, Object>> collectInterviewRecord(@PathVariable String sessionId) {
        log.info("整理面试记录并上传知识库: sessionId={}", sessionId);
        return Result.success(historyService.collectInterviewSessionToKnowledgeBase(sessionId));
    }

    /**
     * 删除面试会话
     */
    @DeleteMapping("/api/interview/sessions/{sessionId}")
    public Result<Void> deleteInterview(@PathVariable String sessionId) {
        log.info("删除面试会话: {}", sessionId);
        persistenceService.deleteSessionBySessionIdForUser(sessionId, SecurityUtils.requireUserId());
        return Result.success(null);
    }

    /**
     * 上传完整面试视频并分析
     */
    @PostMapping(value = "/api/interview/sessions/{sessionId}/complete-video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<UploadCompleteInterviewResponse> uploadCompleteInterview(
            @PathVariable String sessionId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("transcripts") String transcriptsJson,
            @RequestParam("conversationLog") String conversationLogJson,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds) {
        log.info("上传完整面试视频: sessionId={}, fileName={}, size={}",
                sessionId, file.getOriginalFilename(), file.getSize());

        try {
            tools.jackson.databind.ObjectMapper objectMapper = new tools.jackson.databind.ObjectMapper();
            java.util.List<String> transcripts = objectMapper.readValue(
                transcriptsJson,
                new tools.jackson.core.type.TypeReference<java.util.List<String>>() {}
            );
            java.util.List<UploadCompleteInterviewRequest.ConversationLogEntry> conversationLog = objectMapper.readValue(
                conversationLogJson,
                new tools.jackson.core.type.TypeReference<java.util.List<UploadCompleteInterviewRequest.ConversationLogEntry>>() {}
            );

            UploadCompleteInterviewResponse response = completeInterviewVideoService.uploadAndAnalyze(
                sessionId,
                file,
                transcripts,
                conversationLog,
                durationSeconds
            );
            return Result.success(response);
        } catch (Exception e) {
            log.error("上传完整面试视频失败", e);
            throw new interview.guide.common.exception.BusinessException(
                interview.guide.common.exception.ErrorCode.BAD_REQUEST,
                "上传失败: " + e.getMessage()
            );
        }
    }
}
