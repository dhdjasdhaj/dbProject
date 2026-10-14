package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.SpeechToTextRequest;
import interview.guide.modules.interview.model.SpeechToTextResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.interview.media", name = "transcription-provider", havingValue = "mock", matchIfMissing = true)
public class MockSpeechToTextService implements SpeechToTextService {

    @Override
    public SpeechToTextResult transcribe(SpeechToTextRequest request) {
        return new SpeechToTextResult(
            "这是预留给 Deepgram 的 mock transcript。",
            "zh",
            "mock",
            true
        );
    }
}
