package interview.guide.modules.interview.service;

import interview.guide.common.config.InterviewMediaConfigProperties;
import interview.guide.modules.interview.model.TextToSpeechRequest;
import interview.guide.modules.interview.model.TextToSpeechResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.interview.media", name = "tts-provider", havingValue = "deepgram")
@RequiredArgsConstructor
public class DeepgramTextToSpeechService implements TextToSpeechService {

    private static final String DEFAULT_MODEL = "aura-orion-en";

    private final InterviewMediaConfigProperties mediaConfig;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(20))
        .build();

    @Override
    public TextToSpeechResult synthesize(TextToSpeechRequest request) {
        if (!mediaConfig.isTtsEnabled()
            || !"deepgram".equalsIgnoreCase(mediaConfig.getTtsProvider())
            || mediaConfig.getTtsApiKey() == null
            || mediaConfig.getTtsApiKey().isBlank()) {
            return new TextToSpeechResult(null, null, "deepgram-disabled", true);
        }

        // 中文场景：优先用浏览器 zh-CN 男声，保证可听懂。
        if (containsChinese(request.text())) {
            log.info("Deepgram tts use browser zh-CN male fallback, sessionId={}, roundId={}", request.sessionId(), request.roundId());
            return new TextToSpeechResult(null, null, "deepgram-zh-browser-male", true);
        }

        try {
            String model = mediaConfig.getTtsVoiceId() != null && !mediaConfig.getTtsVoiceId().isBlank()
                ? mediaConfig.getTtsVoiceId()
                : DEFAULT_MODEL;
            String ttsUrl = mediaConfig.getTtsUrl() != null && !mediaConfig.getTtsUrl().isBlank()
                ? mediaConfig.getTtsUrl()
                : "https://api.deepgram.com/v1/speak";
            String body = "{\"text\":\""
                + request.text().replace("\\", "\\\\").replace("\"", "\\\"")
                + "\"}";

            String query = "?model=" + urlEncode(model) + "&encoding=mp3";

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(ttsUrl + query))
                .timeout(Duration.ofSeconds(90))
                .header("Authorization", "Token " + mediaConfig.getTtsApiKey())
                .header("Accept", "audio/mpeg")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<byte[]> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
            log.info("Deepgram tts response status={}, sessionId={}, roundId={}, model={}",
                response.statusCode(), request.sessionId(), request.roundId(), model);

            if (response.statusCode() >= 200 && response.statusCode() < 300 && response.body() != null && response.body().length > 0) {
                String audioBase64 = Base64.getEncoder().encodeToString(response.body());
                String audioDataUrl = "data:audio/mpeg;base64," + audioBase64;
                return new TextToSpeechResult(null, audioDataUrl, "deepgram", false);
            }

            String errorBody = response.body() == null ? "" : new String(response.body(), StandardCharsets.UTF_8);
            log.warn("Deepgram tts non-success status={}, sessionId={}, roundId={}, model={}, body={}",
                response.statusCode(), request.sessionId(), request.roundId(), model, truncate(errorBody));
            return new TextToSpeechResult(null, null, "deepgram-non-success", true);
        } catch (Exception e) {
            log.warn("Deepgram tts failed: {}", e.getMessage());
            return new TextToSpeechResult(null, null, "deepgram-error", true);
        }
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private boolean containsChinese(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        for (int i = 0; i < text.length(); i++) {
            Character.UnicodeBlock block = Character.UnicodeBlock.of(text.charAt(i));
            if (block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B
                || block == Character.UnicodeBlock.CJK_COMPATIBILITY_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_SYMBOLS_AND_PUNCTUATION) {
                return true;
            }
        }
        return false;
    }

    private String truncate(String s) {
        if (s == null) return "";
        String oneLine = s.replace('\n', ' ').replace('\r', ' ').trim();
        return oneLine.length() > 800 ? oneLine.substring(0, 800) + "..." : oneLine;
    }
}
