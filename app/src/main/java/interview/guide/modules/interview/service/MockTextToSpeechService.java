package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.TextToSpeechRequest;
import interview.guide.modules.interview.model.TextToSpeechResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.interview.media", name = "tts-provider", havingValue = "mock", matchIfMissing = true)
public class MockTextToSpeechService implements TextToSpeechService {

    @Override
    public TextToSpeechResult synthesize(TextToSpeechRequest request) {
        return new TextToSpeechResult(
            null,
            null,
            "mock",
            true
        );
    }
}
