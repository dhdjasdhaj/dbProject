package interview.guide.modules.interview.service;

import interview.guide.common.config.InterviewMediaConfigProperties;
import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.interview.model.RealtimeTranscriptionConfigResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@RequiredArgsConstructor
public class DeepgramRealtimeConfigService {

    private static final String DEFAULT_REALTIME_WS_URL = "wss://api.deepgram.com/v1/listen";

    private final InterviewMediaConfigProperties mediaConfig;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    public RealtimeTranscriptionConfigResponse issueRealtimeConfig() {
        if (!mediaConfig.isTranscriptionEnabled()
            || mediaConfig.getTranscriptionApiKey() == null
            || mediaConfig.getTranscriptionApiKey().isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "实时转写未启用或 Deepgram API Key 未配置");
        }

        String token = grantTemporaryToken();
        return new RealtimeTranscriptionConfigResponse(
            "deepgram",
            DEFAULT_REALTIME_WS_URL,
            token,
            mediaConfig.getTranscriptionModel(),
            "zh",
            true,
            true,
            300,
            1200
        );
    }

    private String grantTemporaryToken() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.deepgram.com/v1/auth/grant"))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Token " + mediaConfig.getTranscriptionApiKey())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"ttl\":3600}"))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                if (response.statusCode() == 403 && mediaConfig.isRealtimeAllowDirectKeyFallback()) {
                    log.warn("Deepgram token grant lacks permission, falling back to direct API key for development only.");
                    return mediaConfig.getTranscriptionApiKey();
                }
                if (response.statusCode() == 403) {
                    log.warn("Deepgram realtime token grant forbidden: body={}", response.body());
                    throw new BusinessException(
                        ErrorCode.AI_SERVICE_ERROR,
                        "当前 Deepgram 凭证没有 realtime token grant 权限。生产环境请为 Deepgram 开通对应权限，或改用后端代理 WebSocket 方案。"
                    );
                }
                log.warn("Deepgram realtime token grant failed: status={}, body={}", response.statusCode(), response.body());
                throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "获取实时转写临时令牌失败");
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode accessToken = root.path("access_token");
            if (!accessToken.isTextual() || accessToken.asText().isBlank()) {
                log.warn("Deepgram realtime token grant returned invalid body={}", response.body());
                throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "获取实时转写临时令牌失败");
            }
            return accessToken.asText();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Grant Deepgram realtime token failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "获取实时转写临时令牌失败");
        }
    }
}
