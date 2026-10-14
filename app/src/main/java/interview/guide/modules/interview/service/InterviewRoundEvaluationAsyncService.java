package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.InterviewRoundDTO;

public interface InterviewRoundEvaluationAsyncService {

    void evaluateAsync(String sessionId, InterviewRoundDTO round);
}
