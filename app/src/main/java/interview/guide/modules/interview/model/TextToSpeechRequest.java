package interview.guide.modules.interview.model;

public record TextToSpeechRequest(
    String sessionId,
    String roundId,
    String text,
    String voiceId
) {
}
