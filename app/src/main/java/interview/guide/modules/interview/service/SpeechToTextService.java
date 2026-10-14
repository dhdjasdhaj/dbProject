package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.SpeechToTextRequest;
import interview.guide.modules.interview.model.SpeechToTextResult;

public interface SpeechToTextService {

    SpeechToTextResult transcribe(SpeechToTextRequest request);
}
