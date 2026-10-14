package interview.guide.modules.interview.model;

import java.util.List;

public record UploadCompleteInterviewRequest(
    String sessionId,
    List<String> transcripts,
    List<ConversationLogEntry> conversationLog
) {
    public record ConversationLogEntry(
        String role,
        String text
    ) {}
}
