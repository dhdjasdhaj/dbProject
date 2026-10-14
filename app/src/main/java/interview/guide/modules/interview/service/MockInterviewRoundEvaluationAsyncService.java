package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.InterviewRoundDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class MockInterviewRoundEvaluationAsyncService implements InterviewRoundEvaluationAsyncService {

    @Override
    @Async
    public void evaluateAsync(String sessionId, InterviewRoundDTO round) {
        log.info("异步单轮评估占位执行: sessionId={}, roundId={}", sessionId, round.roundId());
    }
}
