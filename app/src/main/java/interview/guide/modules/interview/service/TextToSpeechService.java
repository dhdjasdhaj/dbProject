package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.TextToSpeechRequest;
import interview.guide.modules.interview.model.TextToSpeechResult;

public interface TextToSpeechService {

    TextToSpeechResult synthesize(TextToSpeechRequest request);
}
