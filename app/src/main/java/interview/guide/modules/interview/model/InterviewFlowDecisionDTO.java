package interview.guide.modules.interview.model;

public record InterviewFlowDecisionDTO(
    InterviewNextAction action,
    String reason,
    InterviewRoundDTO nextRound
) {
}
