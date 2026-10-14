package interview.guide.modules.interview.model;

public record RealtimeTranscriptionConfigResponse(
    String provider,
    String wsUrl,
    String token,
    String model,
    String language,
    boolean interimResults,
    boolean smartFormat,
    Integer endpointingMs,
    Integer utteranceEndMs
) {
}
