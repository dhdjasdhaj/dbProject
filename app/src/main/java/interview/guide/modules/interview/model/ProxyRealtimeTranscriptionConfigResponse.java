package interview.guide.modules.interview.model;

public record ProxyRealtimeTranscriptionConfigResponse(
    String provider,
    String wsUrl,
    String model,
    String language,
    boolean interimResults,
    boolean smartFormat,
    Integer endpointingMs,
    Integer utteranceEndMs,
    String audioMimeType,
    String container
) {
}
