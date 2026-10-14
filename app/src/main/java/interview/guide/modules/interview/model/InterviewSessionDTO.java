package interview.guide.modules.interview.model;

import java.util.List;

public record InterviewSessionDTO(
    String sessionId,
    String resumeText,
    int totalQuestions,
    int currentQuestionIndex,
    List<InterviewQuestionDTO> questions,
    SessionStatus status,
    String mode,
    Integer maxFollowUps,
    Boolean videoEnabled,
    Boolean audioEnabled,
    InterviewPromptPayload currentPrompt
) {
    public enum SessionStatus {
        CREATED,
        IN_PROGRESS,
        COMPLETED,
        EVALUATED
    }
}
