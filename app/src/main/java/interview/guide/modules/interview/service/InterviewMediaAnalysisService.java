package interview.guide.modules.interview.service;

import interview.guide.common.ai.StructuredOutputInvoker;
import interview.guide.common.exception.ErrorCode;
import interview.guide.infrastructure.security.SecurityUtils;
import interview.guide.modules.interview.model.InterviewFlowDecisionDTO;
import interview.guide.modules.interview.model.InterviewNextAction;
import interview.guide.modules.interview.model.InterviewPromptPayload;
import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.InterviewRoundDTO;
import interview.guide.modules.interview.model.InterviewSessionDTO;
import interview.guide.modules.interview.model.ProcessInterviewMediaResult;
import interview.guide.modules.interview.model.SpeechToTextRequest;
import interview.guide.modules.interview.model.SpeechToTextResult;
import interview.guide.modules.interview.model.VideoInterviewRoundResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class InterviewMediaAnalysisService {

    private record VideoRoundAnalysisDTO(
        Integer fluencyScore,
        Integer expressionScore,
        Integer confidenceScore,
        String summary,
        List<String> strengths,
        List<String> improvements,
        String suggestedFollowUp
    ) {}

    private record TranscriptionOutcome(String transcript, String provider) {}

    private final InterviewSessionService interviewSessionService;
    private final InterviewRoundService interviewRoundService;
    private final SpeechToTextService speechToTextService;
    private final InterviewArtifactStorageService interviewArtifactStorageService;
    private final InterviewPromptService interviewPromptService;
    private final TranscriptRefinementService transcriptRefinementService;
    private final ChatClient chatClient;
    private final StructuredOutputInvoker structuredOutputInvoker;
    private final PromptTemplate analysisSystemPromptTemplate;
    private final PromptTemplate analysisUserPromptTemplate;
    private final BeanOutputConverter<VideoRoundAnalysisDTO> analysisOutputConverter;

    public InterviewMediaAnalysisService(
        InterviewSessionService interviewSessionService,
        InterviewRoundService interviewRoundService,
        SpeechToTextService speechToTextService,
        InterviewArtifactStorageService interviewArtifactStorageService,
        InterviewPromptService interviewPromptService,
        TranscriptRefinementService transcriptRefinementService,
        ChatClient.Builder chatClientBuilder,
        StructuredOutputInvoker structuredOutputInvoker,
        @Value("${APP_AI_VIDEO_ANALYSIS_ENABLED:true}") boolean videoAnalysisEnabled,
        @Value("${APP_AI_VIDEO_ANALYSIS_BASE_URL:https://generativelanguage.googleapis.com/v1beta/openai}") String videoAnalysisBaseUrl,
        @Value("${APP_AI_VIDEO_ANALYSIS_API_KEY:${AI_GEMINI_API_KEY:}}") String videoAnalysisApiKey,
        @Value("${APP_AI_VIDEO_ANALYSIS_MODEL:gemini-2.0-flash}") String videoAnalysisModel,
        @Value("classpath:prompts/video-round-analysis-system.st") Resource analysisSystemPromptResource,
        @Value("classpath:prompts/video-round-analysis-user.st") Resource analysisUserPromptResource
    ) throws IOException {
        this.interviewSessionService = interviewSessionService;
        this.interviewRoundService = interviewRoundService;
        this.speechToTextService = speechToTextService;
        this.interviewArtifactStorageService = interviewArtifactStorageService;
        this.interviewPromptService = interviewPromptService;
        this.transcriptRefinementService = transcriptRefinementService;
        this.chatClient = buildVideoAnalysisChatClient(
            chatClientBuilder,
            videoAnalysisEnabled,
            videoAnalysisBaseUrl,
            videoAnalysisApiKey,
            videoAnalysisModel
        );
        this.structuredOutputInvoker = structuredOutputInvoker;
        this.analysisSystemPromptTemplate = new PromptTemplate(
            analysisSystemPromptResource.getContentAsString(StandardCharsets.UTF_8)
        );
        this.analysisUserPromptTemplate = new PromptTemplate(
            analysisUserPromptResource.getContentAsString(StandardCharsets.UTF_8)
        );
        this.analysisOutputConverter = new BeanOutputConverter<>(VideoRoundAnalysisDTO.class);
    }

    public ProcessInterviewMediaResult processUploadedRound(
        String sessionId,
        Integer questionIndex,
        MultipartFile file,
        String fileKey,
        String fileUrl,
        String clientTranscript
    ) {
        InterviewSessionDTO session = interviewSessionService.getSession(sessionId);
        InterviewQuestionDTO question = resolveQuestion(session, questionIndex);
        String roundId = buildRoundId(questionIndex, question);
        TranscriptionOutcome transcriptionOutcome = clientTranscript != null && !clientTranscript.isBlank()
            ? new TranscriptionOutcome(clientTranscript.trim(), "client-provided")
            : transcribe(file, sessionId, roundId, fileKey, fileUrl);
        String transcript = transcriptionOutcome.transcript();
        int durationSeconds = Math.max(15, Math.min(180, (int) Math.ceil(file.getSize() / 32000.0)));

        InterviewRoundDTO currentRound = new InterviewRoundDTO(
            roundId,
            sessionId,
            question != null && question.isFollowUp() ? buildParentRoundId(question.parentQuestionIndex()) : null,
            question != null && question.parentQuestionIndex() != null ? question.parentQuestionIndex() : questionIndex,
            calculateFollowUpDepth(session, question),
            question != null ? question.question() : "暂未识别到当前问题",
            question != null ? question.category() : "未分类",
            transcript,
            fileKey,
            fileUrl,
            "COMPLETED"
        );

        if ("deepgram-empty".equalsIgnoreCase(transcriptionOutcome.provider())) {
            InterviewFlowDecisionDTO retryDecision = new InterviewFlowDecisionDTO(
                InterviewNextAction.FOLLOW_UP,
                "本轮未识别到有效语音，请重试当前题目",
                null
            );
            return new ProcessInterviewMediaResult(
                currentRound,
                retryDecision,
                question,
                session.currentPrompt(),
                transcript,
                durationSeconds,
                transcriptionOutcome.provider()
            );
        }

        InterviewFlowDecisionDTO decision = decideNextAction(session, currentRound);
        InterviewQuestionDTO nextQuestion = decision.nextRound() != null ? toQuestionDTO(questionIndex, question, decision.nextRound()) : null;
        InterviewPromptPayload nextPrompt = nextQuestion != null ? interviewPromptService.buildPrompt(sessionId, nextQuestion) : null;
        InterviewSessionDTO updatedSession = interviewSessionService.applyVideoInterviewDecision(
            sessionId,
            questionIndex,
            transcript,
            nextQuestion,
            nextPrompt
        );
        InterviewQuestionDTO responseNextQuestion = resolveQuestion(updatedSession, updatedSession.currentQuestionIndex());

        persistRoundArtifacts(session, question, currentRound, transcript);
        interviewRoundService.triggerAsyncEvaluation(sessionId, currentRound);

        return new ProcessInterviewMediaResult(
            currentRound,
            decision,
            responseNextQuestion,
            updatedSession.currentPrompt(),
            transcript,
            durationSeconds,
            transcriptionOutcome.provider()
        );
    }

    public VideoInterviewRoundResult analyzeUploadedRound(
        String sessionId,
        Integer questionIndex,
        MultipartFile file,
        String fileKey,
        String fileUrl
    ) {
        String transcript = transcribe(file, sessionId, UUID.randomUUID().toString(), fileKey, fileUrl).transcript();
        int durationSeconds = Math.max(15, Math.min(180, (int) Math.ceil(file.getSize() / 32000.0)));
        InterviewQuestionDTO question = resolveQuestion(interviewSessionService.getSession(sessionId), questionIndex);
        VideoRoundAnalysisDTO analysis = analyzeTranscript(sessionId, question, transcript, durationSeconds);

        return new VideoInterviewRoundResult(
            UUID.randomUUID().toString(),
            sessionId,
            questionIndex,
            fileKey,
            fileUrl,
            transcript,
            durationSeconds,
            normalizeScore(analysis.fluencyScore(), 55),
            normalizeScore(analysis.expressionScore(), 50),
            normalizeScore(analysis.confidenceScore(), 50),
            safeSummary(analysis.summary(), transcript),
            safeList(analysis.strengths(), defaultStrengths(transcript)),
            safeList(analysis.improvements(), defaultImprovements(transcript)),
            safeFollowUp(analysis.suggestedFollowUp(), question)
        );
    }

    private InterviewFlowDecisionDTO decideNextAction(InterviewSessionDTO session, InterviewRoundDTO currentRound) {
        List<InterviewRoundDTO> history = session.questions().stream()
            .filter(q -> q.userAnswer() != null && !q.userAnswer().isBlank())
            .map(q -> new InterviewRoundDTO(
                buildRoundId(q.questionIndex(), q),
                session.sessionId(),
                q.isFollowUp() ? buildParentRoundId(q.parentQuestionIndex()) : null,
                q.parentQuestionIndex() != null ? q.parentQuestionIndex() : q.questionIndex(),
                calculateFollowUpDepth(session, q),
                q.question(),
                q.category(),
                q.userAnswer(),
                null,
                null,
                "COMPLETED"
            ))
            .toList();

        InterviewFlowDecisionDTO skeletonDecision = interviewRoundService.decideAfterRound(
            session.resumeText(),
            currentRound,
            history
        );

        InterviewQuestionDTO pendingInitialMain = findNextUnansweredInitialMainQuestion(session, currentRound.rootQuestionIndex());

        if (skeletonDecision.action() == InterviewNextAction.FOLLOW_UP && !shouldForceNextMainQuestion(session, currentRound)) {
            return skeletonDecision;
        }

        if (skeletonDecision.action() == InterviewNextAction.END && pendingInitialMain == null) {
            return skeletonDecision;
        }

        InterviewQuestionDTO nextQuestion = pendingInitialMain != null
            ? pendingInitialMain
            : session.questions().stream()
                .filter(q -> q.questionIndex() > currentRound.rootQuestionIndex())
                .filter(q -> q.userAnswer() == null || q.userAnswer().isBlank())
                .filter(q -> !q.isFollowUp())
                .min(Comparator.comparingInt(InterviewQuestionDTO::questionIndex))
                .orElse(null);

        if (nextQuestion == null) {
            return new InterviewFlowDecisionDTO(
                InterviewNextAction.END,
                "本轮主问题已完成，且没有可继续推进的新主问题",
                null
            );
        }

        InterviewRoundDTO nextRound = new InterviewRoundDTO(
            buildRoundId(nextQuestion.questionIndex(), nextQuestion),
            session.sessionId(),
            null,
            nextQuestion.questionIndex(),
            0,
            nextQuestion.question(),
            nextQuestion.category(),
            null,
            null,
            null,
            "PENDING"
        );

        return new InterviewFlowDecisionDTO(
            InterviewNextAction.NEXT_QUESTION,
            pendingInitialMain != null
                ? "需先完成本场初始主问题，再决定是否结束或新增主问题"
                : (skeletonDecision.action() == InterviewNextAction.FOLLOW_UP
                    ? "当前主问题追问已达上限（最多 3 次），进入下一主问题"
                    : skeletonDecision.reason()),
            nextRound
        );
    }

    private boolean shouldForceNextMainQuestion(InterviewSessionDTO session, InterviewRoundDTO currentRound) {
        int requestedLimit = session.maxFollowUps() == null ? 3 : Math.max(0, session.maxFollowUps());
        int hardCap = Math.min(3, requestedLimit);
        int currentDepth = currentRound.followUpDepth() == null ? 0 : Math.max(0, currentRound.followUpDepth());
        int nextDepth = currentDepth + 1;
        return nextDepth > hardCap;
    }

    private InterviewQuestionDTO findNextUnansweredInitialMainQuestion(InterviewSessionDTO session, Integer currentRootQuestionIndex) {
        int initialMainQuestionCount = Math.max(0, session.totalQuestions());
        return session.questions().stream()
            .filter(q -> !q.isFollowUp())
            .filter(q -> q.questionIndex() < initialMainQuestionCount)
            .filter(q -> q.userAnswer() == null || q.userAnswer().isBlank())
            .min(Comparator.comparingInt(InterviewQuestionDTO::questionIndex))
            .orElse(null);
    }

    private InterviewQuestionDTO toQuestionDTO(Integer currentQuestionIndex, InterviewQuestionDTO currentQuestion, InterviewRoundDTO nextRound) {
        InterviewQuestionDTO.QuestionType type = currentQuestion != null ? currentQuestion.type() : InterviewQuestionDTO.QuestionType.PROJECT;
        boolean isFollowUp = nextRound.followUpDepth() != null && nextRound.followUpDepth() > 0;
        int nextIndex = isFollowUp
            ? currentQuestionIndex + 1
            : (nextRound.rootQuestionIndex() != null ? nextRound.rootQuestionIndex() : currentQuestionIndex + 1);
        return InterviewQuestionDTO.create(
            nextIndex,
            nextRound.questionText(),
            type,
            nextRound.questionCategory(),
            isFollowUp,
            nextRound.parentRoundId() != null ? currentQuestionIndex : null
        );
    }

    private void persistRoundArtifacts(InterviewSessionDTO session, InterviewQuestionDTO question, InterviewRoundDTO currentRound, String transcript) {
        try {
            Long userId = SecurityUtils.requireUserId();
            String roundPrefix = interviewArtifactStorageService.buildRoundPrefix(currentRound);
            interviewArtifactStorageService.writeSessionResume(userId, session.sessionId(), session.resumeText());
            interviewArtifactStorageService.writeRoundQuestion(userId, session.sessionId(), roundPrefix, question);
            interviewArtifactStorageService.writeRoundAnswer(userId, session.sessionId(), roundPrefix, transcript);
            interviewArtifactStorageService.writeRoundTranscript(userId, session.sessionId(), roundPrefix, transcript);
            interviewArtifactStorageService.writeRoundEvaluation(userId, session.sessionId(), roundPrefix, "{\"status\":\"PENDING\"}");
        } catch (Exception e) {
            log.warn("保存面试轮次制品失败: sessionId={}, roundId={}, error={}", session.sessionId(), currentRound.roundId(), e.getMessage());
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

    private InterviewQuestionDTO resolveQuestion(InterviewSessionDTO session, Integer questionIndex) {
        try {
            return session.questions().stream()
                .filter(q -> q.questionIndex() == questionIndex)
                .findFirst()
                .orElse(null);
        } catch (Exception e) {
            log.warn("解析当前题目失败: sessionId={}, questionIndex={}, error={}",
                session != null ? session.sessionId() : null, questionIndex, e.getMessage());
            return null;
        }
    }

    private int calculateFollowUpDepth(InterviewSessionDTO session, InterviewQuestionDTO question) {
        if (session == null || question == null || !question.isFollowUp()) {
            return 0;
        }
        int depth = 1;
        Integer parentIndex = question.parentQuestionIndex();
        int guard = 0;
        while (parentIndex != null && guard < 32) {
            final Integer lookupParentIndex = parentIndex;
            InterviewQuestionDTO parent = session.questions().stream()
                .filter(q -> q.questionIndex() == lookupParentIndex)
                .findFirst()
                .orElse(null);
            if (parent == null || !parent.isFollowUp()) {
                break;
            }
            depth += 1;
            parentIndex = parent.parentQuestionIndex();
            guard += 1;
        }
        return depth;
    }

    private VideoRoundAnalysisDTO analyzeTranscript(
        String sessionId,
        InterviewQuestionDTO question,
        String transcript,
        int durationSeconds
    ) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("question", question != null ? question.question() : "暂未识别到题目内容");
            variables.put("category", question != null && question.category() != null ? question.category() : "未分类");
            variables.put("transcript", transcript == null || transcript.isBlank() ? "(无转写文本)" : transcript);
            variables.put("durationSeconds", durationSeconds);

            return structuredOutputInvoker.invoke(
                chatClient,
                analysisSystemPromptTemplate.render() + "\n\n" + analysisOutputConverter.getFormat(),
                analysisUserPromptTemplate.render(variables),
                analysisOutputConverter,
                ErrorCode.AI_SERVICE_ERROR,
                "视频轮次分析失败：",
                "视频轮次分析",
                log
            );
        } catch (Exception e) {
            log.warn("视频轮次分析失败，使用兜底结果: sessionId={}, error={}", sessionId, e.getMessage());
            return buildFallbackAnalysis(question, transcript);
        }
    }

    private VideoRoundAnalysisDTO buildFallbackAnalysis(InterviewQuestionDTO question, String transcript) {
        String safeTranscript = transcript == null ? "" : transcript.trim();
        int length = safeTranscript.length();
        boolean veryShort = length < 20;
        boolean shortAnswer = length < 80;

        int fluency = veryShort ? 35 : shortAnswer ? 58 : 76;
        int expression = veryShort ? 30 : shortAnswer ? 52 : 74;
        int confidence = veryShort ? 38 : shortAnswer ? 55 : 72;

        String summary = veryShort
            ? "候选人本轮回答过短，暂时无法充分评估表达与内容质量。"
            : shortAnswer
                ? "候选人完成了基础回答，但细节不足，建议进一步展开项目背景、职责与结果。"
                : "候选人本轮回答相对完整，表达较流畅，能够覆盖主要问题点。";

        List<String> strengths = veryShort
            ? List.of("能够快速回应问题")
            : shortAnswer
                ? List.of("表达较为直接", "能够覆盖部分关键信息")
                : List.of("表达较流畅", "逻辑较清晰", "能够结合问题展开回答");

        List<String> improvements = List.of(
            "可以补充更多项目背景与业务上下文",
            "建议明确说明个人职责、关键动作与产出结果",
            "回答时可加入数据、指标或复盘信息增强说服力"
        );

        String followUp = question != null && question.question() != null && !question.question().isBlank()
            ? "可以围绕刚才这段回答，继续补充更具体的项目场景、你的职责分工以及最终结果。"
            : "请你再补充一些更具体的项目细节，帮助系统更准确评估这轮表现。";

        return new VideoRoundAnalysisDTO(
            fluency,
            expression,
            confidence,
            summary,
            strengths,
            improvements,
            followUp
        );
    }

    private TranscriptionOutcome transcribe(
        MultipartFile file,
        String sessionId,
        String roundId,
        String fileKey,
        String fileUrl
    ) {
        try {
            SpeechToTextResult result = speechToTextService.transcribe(new SpeechToTextRequest(
                sessionId,
                roundId,
                fileKey,
                fileUrl,
                resolveSafeContentType(file),
                file.getBytes()
            ));
            if (result != null && result.transcript() != null && !result.transcript().isBlank()) {
                String rawTranscript = result.transcript().trim();
                String refinedTranscript = transcriptRefinementService.refineForInterview(rawTranscript, sessionId, roundId);
                return new TranscriptionOutcome(refinedTranscript, result.provider());
            }
            log.warn("语音转写结果为空，使用兜底 transcript: sessionId={}, roundId={}, provider={}",
                sessionId, roundId, result != null ? result.provider() : "unknown");
            String provider = result != null && result.provider() != null ? result.provider() : "unknown";
            return new TranscriptionOutcome(fallbackTranscript(), provider);
        } catch (Exception e) {
            log.warn("调用 STT 服务失败，回退到兜底转写: {}", e.getMessage());
            return new TranscriptionOutcome(fallbackTranscript(), "stt-error");
        }
    }

    private String resolveSafeContentType(MultipartFile file) {
        String raw = file.getContentType();
        if (raw == null || raw.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        String normalized = raw.split(";", 2)[0].trim().toLowerCase();
        try {
            MediaType.parseMediaType(normalized);
            return normalized;
        } catch (Exception e) {
            log.warn("无法解析上传文件的 content-type，回退为 application/octet-stream: raw={}, error={}", raw, e.getMessage());
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
    }

    private int normalizeScore(Integer score, int fallback) {
        return score == null ? fallback : Math.max(0, Math.min(100, score));
    }

    private String safeSummary(String summary, String transcript) {
        return summary != null && !summary.isBlank()
            ? summary.trim()
            : buildFallbackAnalysis(null, transcript).summary();
    }

    private List<String> safeList(List<String> list, List<String> fallback) {
        if (list == null || list.isEmpty()) {
            return fallback;
        }
        List<String> sanitized = list.stream()
            .filter(item -> item != null && !item.isBlank())
            .limit(3)
            .toList();
        return sanitized.isEmpty() ? fallback : sanitized;
    }

    private String safeFollowUp(String followUp, InterviewQuestionDTO question) {
        return followUp != null && !followUp.isBlank()
            ? followUp.trim()
            : buildFallbackAnalysis(question, "").suggestedFollowUp();
    }

    private List<String> defaultStrengths(String transcript) {
        return buildFallbackAnalysis(null, transcript).strengths();
    }

    private List<String> defaultImprovements(String transcript) {
        return buildFallbackAnalysis(null, transcript).improvements();
    }

    private String fallbackTranscript() {
        return "当前环境未启用真实语音转写，已返回 mock 转写文本作为兜底结果。";
    }

    private String buildRoundId(Integer questionIndex, InterviewQuestionDTO question) {
        if (question != null && question.isFollowUp() && question.parentQuestionIndex() != null) {
            return "q" + (question.parentQuestionIndex() + 1) + "_" + (question.questionIndex() + 1);
        }
        return "q" + (questionIndex + 1);
    }

    private String buildParentRoundId(Integer parentQuestionIndex) {
        if (parentQuestionIndex == null) {
            return null;
        }
        return "q" + (parentQuestionIndex + 1);
    }
}
