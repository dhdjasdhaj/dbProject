package interview.guide.modules.interview.model;

public record UploadCompleteInterviewResponse(
    String sessionId,
    String videoFileKey,
    String videoFileUrl,
    Long videoFileSize,
    Integer durationSeconds,
    String status,
    VideoAnalysisResult analysisResult
) {
    public record VideoAnalysisResult(
        Integer overallExpressionScore,
        Integer overallGestureScore,
        Integer overallConfidenceScore,
        String summary,
        java.util.List<String> strengths,
        java.util.List<String> improvements
    ) {}
}
