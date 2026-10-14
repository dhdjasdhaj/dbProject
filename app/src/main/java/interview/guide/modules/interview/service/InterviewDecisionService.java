package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.InterviewFlowDecisionDTO;
import interview.guide.modules.interview.model.InterviewRoundDTO;

import java.util.List;

public interface InterviewDecisionService {

    InterviewFlowDecisionDTO decideNextAction(
        String resumeSummary,
        InterviewRoundDTO currentRound,
        List<InterviewRoundDTO> history
    );
}
