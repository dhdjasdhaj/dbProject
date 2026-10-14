package interview.guide.modules.interview.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 创建面试会话请求
 */
public record CreateInterviewRequest(
    @NotBlank(message = "简历文本不能为空")
    String resumeText,      // 简历文本内容

    @Min(value = 3, message = "题目数量最少3题")
    @Max(value = 20, message = "题目数量最多20题")
    int questionCount,      // 面试题目数量 (3-20)

    @NotNull(message = "简历ID不能为空")
    Long resumeId,          // 简历ID（用于持久化关联）

    Boolean forceCreate,    // 是否强制创建新会话（忽略未完成的会话），默认为 false
    String mode,            // 面试模式：TEXT / VIDEO
    Integer maxFollowUps,   // 视频面试下的单题最大追问次数
    Boolean videoEnabled,   // 是否启用摄像头
    Boolean audioEnabled    // 是否启用麦克风
) {
    private static final int DEFAULT_VIDEO_MAIN_QUESTION_COUNT = 4;

    public String effectiveMode() {
        return mode == null || mode.isBlank() ? "TEXT" : mode;
    }

    public int effectiveQuestionCount() {
        if ("VIDEO".equalsIgnoreCase(effectiveMode())) {
            return DEFAULT_VIDEO_MAIN_QUESTION_COUNT;
        }
        return questionCount;
    }

    public int effectiveMaxFollowUps() {        return maxFollowUps == null ? 1 : Math.max(0, maxFollowUps);
    }

    public boolean effectiveVideoEnabled() {
        return Boolean.TRUE.equals(videoEnabled);
    }

    public boolean effectiveAudioEnabled() {
        return audioEnabled == null || audioEnabled;
    }
}

