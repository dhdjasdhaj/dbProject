package interview.guide.modules.interview.model;

public record InterviewRoundDTO(
    String roundId,
    String sessionId,
    String parentRoundId,
    Integer rootQuestionIndex,
    Integer followUpDepth,
    String questionText,
    String questionCategory,
    String transcript,
    String mediaFileKey,
    String mediaFileUrl,
    String status
) {
}
