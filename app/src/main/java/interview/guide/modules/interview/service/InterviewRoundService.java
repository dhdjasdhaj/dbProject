package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.InterviewFlowDecisionDTO;
import interview.guide.modules.interview.model.InterviewRoundDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InterviewRoundService {

    private final InterviewDecisionService interviewDecisionService;
    private final InterviewRoundEvaluationAsyncService roundEvaluationAsyncService;

    public InterviewFlowDecisionDTO decideAfterRound(
        String resumeSummary,
        InterviewRoundDTO currentRound,
        List<InterviewRoundDTO> history
    ) {
        return interviewDecisionService.decideNextAction(resumeSummary, currentRound, history);
    }

    public void triggerAsyncEvaluation(String sessionId, InterviewRoundDTO round) {
        roundEvaluationAsyncService.evaluateAsync(sessionId, round);
    }
}
