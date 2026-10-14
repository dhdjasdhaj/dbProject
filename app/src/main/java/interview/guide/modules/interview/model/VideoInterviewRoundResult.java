package interview.guide.modules.interview.model;

import java.util.List;

public record VideoInterviewRoundResult(
    String roundId,
    String sessionId,
    Integer questionIndex,
    String mediaFileKey,
    String mediaFileUrl,
    String transcript,
    Integer durationSeconds,
    Integer fluencyScore,
    Integer expressionScore,
    Integer confidenceScore,
    String summary,
    List<String> strengths,
    List<String> improvements,
    String suggestedFollowUp
) {
}
