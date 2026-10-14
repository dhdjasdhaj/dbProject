package interview.guide.modules.interview.model;

public record ProcessInterviewMediaResult(
    InterviewRoundDTO currentRound,
    InterviewFlowDecisionDTO decision,
    InterviewQuestionDTO nextQuestion,
    InterviewPromptPayload nextPrompt,
    String transcript,
    Integer durationSeconds,
    String sttProvider
) {
}
