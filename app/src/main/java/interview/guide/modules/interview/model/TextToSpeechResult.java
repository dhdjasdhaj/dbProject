package interview.guide.modules.interview.model;

public record TextToSpeechResult(
    String audioFileKey,
    String audioFileUrl,
    String provider,
    boolean mock
) {
}
