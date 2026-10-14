package interview.guide.modules.interview.service;

import interview.guide.modules.interview.model.InterviewPromptPayload;
import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.TextToSpeechRequest;
import interview.guide.modules.interview.model.TextToSpeechResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InterviewPromptService {

    private final TextToSpeechService textToSpeechService;

    public InterviewPromptPayload buildPrompt(String sessionId, InterviewQuestionDTO question) {
        if (question == null) {
            return null;
        }
        String roundId = question.isFollowUp()
            ? "q" + (question.parentQuestionIndex() != null ? question.parentQuestionIndex() + 1 : question.questionIndex() + 1) + "_" + (question.questionIndex() + 1)
            : "q" + (question.questionIndex() + 1);
        TextToSpeechResult tts = textToSpeechService.synthesize(new TextToSpeechRequest(
            sessionId,
            roundId,
            question.question(),
            null
        ));
        return new InterviewPromptPayload(
            sessionId,
            question.questionIndex(),
            question.question(),
            question.category(),
            tts.provider(),
            tts.audioFileKey(),
            tts.audioFileUrl(),
            tts.mock()
        );
    }
}
