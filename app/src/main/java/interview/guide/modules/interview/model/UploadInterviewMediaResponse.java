package interview.guide.modules.interview.model;

public record UploadInterviewMediaResponse(
    String sessionId,
    Integer questionIndex,
    String fileKey,
    String fileUrl,
    String contentType,
    Long size,
    String message,
    InterviewRoundDTO currentRound,
    InterviewFlowDecisionDTO decision,
    InterviewQuestionDTO nextQuestion,
    InterviewPromptPayload nextPrompt,
    String sttProvider
) {
}
