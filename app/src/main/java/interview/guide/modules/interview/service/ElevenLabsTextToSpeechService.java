package interview.guide.modules.interview.service;

import interview.guide.common.config.InterviewMediaConfigProperties;
import interview.guide.modules.interview.model.TextToSpeechRequest;
import interview.guide.modules.interview.model.TextToSpeechResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.interview.media", name = "tts-provider", havingValue = "elevenlabs")
@RequiredArgsConstructor
public class ElevenLabsTextToSpeechService implements TextToSpeechService {

    private final InterviewMediaConfigProperties mediaConfig;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(20))
        .build();

    @Override
    public TextToSpeechResult synthesize(TextToSpeechRequest request) {
        if (!mediaConfig.isTtsEnabled()
            || !"elevenlabs".equalsIgnoreCase(mediaConfig.getTtsProvider())
            || mediaConfig.getTtsApiKey() == null
            || mediaConfig.getTtsApiKey().isBlank()) {
            return new TextToSpeechResult(null, null, "elevenlabs-disabled", true);
        }

        try {
            String voiceId = request.voiceId() != null && !request.voiceId().isBlank()
                ? request.voiceId()
                : mediaConfig.getTtsVoiceId();

            String body = "{\"text\":\""
                + request.text().replace("\\", "\\\\").replace("\"", "\\\"")
                + "\",\"model_id\":\"eleven_flash_v2_5\"}";

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(mediaConfig.getTtsUrl() + "/" + voiceId))
                .timeout(Duration.ofSeconds(90))
                .header("xi-api-key", mediaConfig.getTtsApiKey())
                .header("Accept", "audio/mpeg")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<byte[]> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
            log.info("ElevenLabs tts response status={}, sessionId={}, roundId={}", response.statusCode(), request.sessionId(), request.roundId());

            if (response.statusCode() >= 200 && response.statusCode() < 300 && response.body() != null && response.body().length > 0) {
                String audioBase64 = Base64.getEncoder().encodeToString(response.body());
                String audioDataUrl = "data:audio/mpeg;base64," + audioBase64;
                return new TextToSpeechResult(null, audioDataUrl, "elevenlabs", false);
            }

            String errorBody = response.body() == null ? "" : new String(response.body(), StandardCharsets.UTF_8);
            log.warn("ElevenLabs tts non-success status={}, sessionId={}, roundId={}, body={}",
                response.statusCode(),
                request.sessionId(),
                request.roundId(),
                truncate(errorBody));
            return new TextToSpeechResult(null, null, "elevenlabs-non-success", true);
        } catch (Exception e) {
            log.warn("ElevenLabs tts failed: {}", e.getMessage());
            return new TextToSpeechResult(null, null, "elevenlabs-error", true);
        }
    }

    private String truncate(String s) {
        if (s == null) {
            return "";
        }
        String oneLine = s.replace('\n', ' ').replace('\r', ' ').trim();
        return oneLine.length() > 800 ? oneLine.substring(0, 800) + "..." : oneLine;
    }
}
