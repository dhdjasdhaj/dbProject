package interview.guide.modules.interview.model;

public record SpeechToTextResult(
    String transcript,
    String language,
    String provider,
    boolean mock
) {
}
