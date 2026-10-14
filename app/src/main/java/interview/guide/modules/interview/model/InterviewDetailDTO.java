package interview.guide.modules.interview.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 面试详情DTO
 */
public record InterviewDetailDTO(
    Long id,
    String sessionId,
    Integer totalQuestions,
    String status,
    String evaluateStatus,
    String evaluateError,
    Integer overallScore,
    String overallFeedback,
    LocalDateTime createdAt,
    LocalDateTime completedAt,
    List<Object> questions,
    List<String> strengths,
    List<String> improvements,
    List<Object> referenceAnswers,
    List<ConversationLogEntryDTO> conversationLog,
    String completeVideoFileUrl,
    Long completeVideoFileSize,
    Integer completeVideoDurationSeconds,
    VideoAnalysisDTO videoAnalysis,
    List<AnswerDetailDTO> answers
) {
    public record ConversationLogEntryDTO(
        String role,
        String text
    ) {}

    public record VideoAnalysisDTO(
        Integer overallExpressionScore,
        Integer overallGestureScore,
        Integer overallConfidenceScore,
        String summary,
        List<String> strengths,
        List<String> improvements
    ) {}
    /**
     * 答案详情DTO
     */
    public record AnswerDetailDTO(
        Integer questionIndex,
        String question,
        String category,
        String userAnswer,
        Integer score,
        String feedback,
        String referenceAnswer,
        List<String> keyPoints,
        LocalDateTime answeredAt
    ) {}
}

