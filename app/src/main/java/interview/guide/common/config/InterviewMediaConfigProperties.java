package interview.guide.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.interview.media")
public class InterviewMediaConfigProperties {

    /**
     * 是否启用真实转写。关闭时始终走 mock。
     */
    private boolean transcriptionEnabled = true;

    /**
     * 转写服务提供商：mock / deepgram
     */
    private String transcriptionProvider = "deepgram";

    /**
     * Deepgram 转写接口地址。
     */
    private String transcriptionUrl = "https://api.deepgram.com/v1/listen";

    /**
     * Deepgram 模型名。
     */
    private String transcriptionModel = "nova-2";

    /**
     * Deepgram API Key。
     */
    private String transcriptionApiKey;

    /**
     * grant token 失败时，是否允许直接下发主 API Key。
     * 仅建议本地开发联调使用，生产环境必须关闭。
     */
    private boolean realtimeAllowDirectKeyFallback = false;

    /**
     * 是否启用“转写后文本优化”。
     * 仅做轻量清洗，不允许新增事实信息。
     */
    private boolean transcriptRefinementEnabled = true;

    /**
     * 是否启用真实 TTS。关闭时始终走 mock。
     */
    private boolean ttsEnabled = true;

    /**
     * TTS 服务提供商：mock / elevenlabs / deepgram
     */
    private String ttsProvider = "mock";

    /**
     * TTS 接口地址。
     */
    private String ttsUrl = "https://api.elevenlabs.io/v1/text-to-speech";

    /**
     * TTS API Key。
     */
    private String ttsApiKey;

    /**
     * TTS 声音标识。
     * ElevenLabs 使用 voiceId；Deepgram 可用作默认（英文）model 名。
     */
    private String ttsVoiceId;

    /**
     * Deepgram 中文 TTS 的男声 model 名。
     */
    private String ttsVoiceIdZh = "aura-orion-en";

    /**
     * Deepgram 中文 TTS 的语言代码。
     */
    private String ttsLanguageZh = "zh-CN";
}
