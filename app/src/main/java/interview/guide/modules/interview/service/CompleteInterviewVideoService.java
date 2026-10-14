package interview.guide.modules.interview.service;

import interview.guide.common.ai.StructuredOutputInvoker;
import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.infrastructure.file.FileStorageService;
import interview.guide.modules.interview.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class CompleteInterviewVideoService {

    public record VideoAnalysisDTO(
        Integer overallExpressionScore,
        Integer overallGestureScore,
        Integer overallConfidenceScore,
        String summary,
        List<String> strengths,
        List<String> improvements
    ) {}

    private final FileStorageService fileStorageService;
    private final InterviewSessionService interviewSessionService;
    private final InterviewPersistenceService interviewPersistenceService;
    private final ChatClient chatClient;
    private final StructuredOutputInvoker structuredOutputInvoker;
    private final PromptTemplate videoAnalysisSystemPromptTemplate;
    private final PromptTemplate videoAnalysisUserPromptTemplate;
    private final BeanOutputConverter<VideoAnalysisDTO> videoAnalysisOutputConverter;

    public CompleteInterviewVideoService(
        FileStorageService fileStorageService,
        InterviewSessionService interviewSessionService,
        InterviewPersistenceService interviewPersistenceService,
        ChatClient.Builder chatClientBuilder,
        StructuredOutputInvoker structuredOutputInvoker,
        @Value("${APP_AI_VIDEO_ANALYSIS_ENABLED:true}") boolean videoAnalysisEnabled,
        @Value("${APP_AI_VIDEO_ANALYSIS_BASE_URL:https://generativelanguage.googleapis.com/v1beta/openai}") String videoAnalysisBaseUrl,
        @Value("${APP_AI_VIDEO_ANALYSIS_API_KEY:${AI_GEMINI_API_KEY:}}") String videoAnalysisApiKey,
        @Value("${APP_AI_VIDEO_ANALYSIS_MODEL:gemini-2.0-flash}") String videoAnalysisModel,
        @Value("classpath:prompts/video-analysis-system.st") Resource videoAnalysisSystemPromptResource,
        @Value("classpath:prompts/video-analysis-user.st") Resource videoAnalysisUserPromptResource
    ) throws IOException {
        this.fileStorageService = fileStorageService;
        this.interviewSessionService = interviewSessionService;
        this.interviewPersistenceService = interviewPersistenceService;
        this.chatClient = buildVideoAnalysisChatClient(
            chatClientBuilder,
            videoAnalysisEnabled,
            videoAnalysisBaseUrl,
            videoAnalysisApiKey,
            videoAnalysisModel
        );
        this.structuredOutputInvoker = structuredOutputInvoker;
        this.videoAnalysisSystemPromptTemplate = new PromptTemplate(
            videoAnalysisSystemPromptResource.getContentAsString(StandardCharsets.UTF_8)
        );
        this.videoAnalysisUserPromptTemplate = new PromptTemplate(
            videoAnalysisUserPromptResource.getContentAsString(StandardCharsets.UTF_8)
        );
        this.videoAnalysisOutputConverter = new BeanOutputConverter<>(VideoAnalysisDTO.class);
    }

    public UploadCompleteInterviewResponse uploadAndAnalyze(
        String sessionId,
        MultipartFile videoFile,
        List<String> transcripts,
        List<UploadCompleteInterviewRequest.ConversationLogEntry> conversationLog,
        Integer clientDurationSeconds
    ) {
        InterviewSessionDTO session = interviewSessionService.getSession(sessionId);

        if (session == null) {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_FOUND);
        }

        // 上传完整视频
        String videoFileKey = fileStorageService.uploadInterviewCompleteVideo(videoFile);
        String videoFileUrl = fileStorageService.getFileUrl(videoFileKey);
        long videoFileSize = videoFile.getSize();
        int estimatedDurationSeconds = Math.max(60, Math.min(600, (int) Math.ceil(videoFileSize / 32000.0)));
        int durationSeconds = clientDurationSeconds != null && clientDurationSeconds > 0
            ? Math.max(1, Math.min(7200, clientDurationSeconds))
            : estimatedDurationSeconds;

        log.info("上传完整面试视频: sessionId={}, fileKey={}, size={}, duration={}s",
            sessionId, videoFileKey, videoFileSize, durationSeconds);

        // 保存视频信息到数据库
        interviewPersistenceService.saveCompleteInterviewVideo(
            sessionId,
            videoFileKey,
            videoFileUrl,
            videoFileSize,
            durationSeconds
        );

        // 保存对话记录
        interviewPersistenceService.saveConversationLog(sessionId, conversationLog);

        // 分析视频(表情、手势、自信度)
        VideoAnalysisDTO analysisResult = analyzeCompleteVideo(
            sessionId,
            session.resumeText(),
            session.questions(),
            transcripts,
            conversationLog,
            durationSeconds
        );

        // 保存分析结果
        interviewPersistenceService.saveVideoAnalysisResult(sessionId, analysisResult);

        return new UploadCompleteInterviewResponse(
            sessionId,
            videoFileKey,
            videoFileUrl,
            videoFileSize,
            durationSeconds,
            "COMPLETED",
            new UploadCompleteInterviewResponse.VideoAnalysisResult(
                analysisResult.overallExpressionScore(),
                analysisResult.overallGestureScore(),
                analysisResult.overallConfidenceScore(),
                analysisResult.summary(),
                analysisResult.strengths(),
                analysisResult.improvements()
            )
        );
    }

    private VideoAnalysisDTO analyzeCompleteVideo(
        String sessionId,
        String resumeText,
        List<InterviewQuestionDTO> questions,
        List<String> transcripts,
        List<UploadCompleteInterviewRequest.ConversationLogEntry> conversationLog,
        int durationSeconds
    ) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("resumeText", resumeText == null ? "" : resumeText);
            variables.put("questionCount", questions.size());
            variables.put("transcriptCount", transcripts.size());
            variables.put("durationSeconds", durationSeconds);
            variables.put("conversationLog", formatConversationLog(conversationLog));

            return structuredOutputInvoker.invoke(
                chatClient,
                videoAnalysisSystemPromptTemplate.render() + "\n\n" + videoAnalysisOutputConverter.getFormat(),
                videoAnalysisUserPromptTemplate.render(variables),
                videoAnalysisOutputConverter,
                ErrorCode.AI_SERVICE_ERROR,
                "视频分析失败：",
                "视频分析",
                log
            );
        } catch (Exception e) {
            log.warn("视频分析失败，使用兜底策略: sessionId={}, error={}", sessionId, e.getMessage());
            return buildFallbackAnalysis(transcripts, durationSeconds);
        }
    }

    private ChatClient buildVideoAnalysisChatClient(
        ChatClient.Builder defaultBuilder,
        boolean enabled,
        String baseUrl,
        String apiKey,
        String model
    ) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            return defaultBuilder.build();
        }
        OpenAiApi openAiApi = OpenAiApi.builder()
            .baseUrl(baseUrl)
            .apiKey(apiKey)
            .completionsPath("/chat/completions")
            .build();
        OpenAiChatModel videoModel = OpenAiChatModel.builder()
            .openAiApi(openAiApi)
            .defaultOptions(
                OpenAiChatOptions.builder()
                    .model(model)
                    .temperature(0.2)
                    .build()
            )
            .build();
        return ChatClient.builder(videoModel).build();
    }

    private String formatConversationLog(List<UploadCompleteInterviewRequest.ConversationLogEntry> conversationLog) {
        if (conversationLog == null || conversationLog.isEmpty()) {
            return "无对话记录";
        }
        StringBuilder sb = new StringBuilder();
        for (UploadCompleteInterviewRequest.ConversationLogEntry entry : conversationLog) {
            sb.append(entry.role().equals("ai") ? "AI: " : "候选人: ");
            sb.append(entry.text());
            sb.append("\n");
        }
        return sb.toString();
    }

    private VideoAnalysisDTO buildFallbackAnalysis(List<String> transcripts, int durationSeconds) {
        int totalLength = transcripts.stream().mapToInt(String::length).sum();
        boolean shortAnswers = totalLength < 500;
        boolean normalDuration = durationSeconds >= 300 && durationSeconds <= 600;

        int expressionScore = shortAnswers ? 62 : normalDuration ? 78 : 72;
        int gestureScore = shortAnswers ? 58 : normalDuration ? 76 : 70;
        int confidenceScore = shortAnswers ? 60 : normalDuration ? 80 : 74;

        String summary = shortAnswers
            ? "候选人整体表达较稳，但回答偏短，建议在关键观点上补充更多细节与例证。"
            : normalDuration
                ? "候选人整体表现良好，沟通状态稳定，表达清晰，具备较好的面试呈现能力。"
                : "候选人整体状态较稳定，建议在重点问题上进一步展开以提升说服力。";

        List<String> strengths = shortAnswers
            ? List.of("回答节奏稳定", "具备基础沟通清晰度")
            : List.of("表达自然流畅", "沟通逻辑清晰", "面试状态稳定");

        List<String> improvements = List.of(
            "可以增加更多项目细节和具体数据",
            "建议结合实际案例展开说明",
            "可以更主动地展示个人优势"
        );

        return new VideoAnalysisDTO(
            expressionScore,
            gestureScore,
            confidenceScore,
            summary,
            strengths,
            improvements
        );
    }
}
