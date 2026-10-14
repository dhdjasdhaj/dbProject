package interview.guide.modules.interview.model;

public record SpeechToTextRequest(
    String sessionId,
    String roundId,
    String mediaFileKey,
    String mediaFileUrl,
    String contentType,
    byte[] audioBytes
) {
}
