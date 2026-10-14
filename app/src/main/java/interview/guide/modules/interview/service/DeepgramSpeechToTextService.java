package interview.guide.modules.interview.service;

import interview.guide.common.config.InterviewMediaConfigProperties;
import interview.guide.modules.interview.model.SpeechToTextRequest;
import interview.guide.modules.interview.model.SpeechToTextResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.interview.media", name = "transcription-provider", havingValue = "deepgram")
@RequiredArgsConstructor
public class DeepgramSpeechToTextService implements SpeechToTextService {

    private final InterviewMediaConfigProperties mediaConfig;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(20))
        .build();

    @Override
    public SpeechToTextResult transcribe(SpeechToTextRequest request) {
        if (!mediaConfig.isTranscriptionEnabled()
            || !"deepgram".equalsIgnoreCase(mediaConfig.getTranscriptionProvider())
            || mediaConfig.getTranscriptionApiKey() == null
            || mediaConfig.getTranscriptionApiKey().isBlank()
            || request.audioBytes() == null
            || request.audioBytes().length == 0) {
            return new SpeechToTextResult("", "zh", "deepgram-disabled", true);
        }

        try {
            String query = "model=" + mediaConfig.getTranscriptionModel()
                + "&smart_format=true&language=zh&punctuate=true";
            String contentType = request.contentType() == null || request.contentType().isBlank()
                ? "audio/webm"
                : request.contentType();

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(mediaConfig.getTranscriptionUrl() + "?" + query))
                .timeout(Duration.ofSeconds(90))
                .header("Authorization", "Token " + mediaConfig.getTranscriptionApiKey())
                .header("Content-Type", contentType)
                .POST(HttpRequest.BodyPublishers.ofByteArray(request.audioBytes()))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            log.info("Deepgram transcription response status={}, sessionId={}, roundId={}, contentType={}, bytes={}",
                response.statusCode(), request.sessionId(), request.roundId(), contentType, request.audioBytes().length);
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Deepgram transcription returned non-2xx: status={}, body={}", response.statusCode(), response.body());
                return new SpeechToTextResult("", "zh", "deepgram-http-error", true);
            }

            String transcript = extractTranscript(response.body());
            if (transcript == null || transcript.isBlank()) {
                log.warn("Deepgram transcription returned empty transcript: sessionId={}, roundId={}, body={}",
                    request.sessionId(), request.roundId(), response.body());
                return new SpeechToTextResult("", "zh", "deepgram-empty", true);
            }
            return new SpeechToTextResult(transcript.trim(), "zh", "deepgram", false);
        } catch (Exception e) {
            log.warn("Deepgram transcription failed: {}", e.getMessage());
            return new SpeechToTextResult("", "zh", "deepgram-error", true);
        }
    }

    private String extractTranscript(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode transcriptNode = root.path("results").path("channels").path(0).path("alternatives").path(0).path("transcript");
            return transcriptNode.isTextual() ? transcriptNode.asText() : "";
        } catch (Exception e) {
            log.warn("Failed to parse Deepgram transcript: {}", e.getMessage());
            return "";
        }
    }
}
