package interview.guide.modules.interview.model;

public record InterviewPromptPayload(
    String sessionId,
    Integer questionIndex,
    String questionText,
    String questionCategory,
    String ttsProvider,
    String ttsAudioFileKey,
    String ttsAudioFileUrl,
    boolean mock
) {
}
