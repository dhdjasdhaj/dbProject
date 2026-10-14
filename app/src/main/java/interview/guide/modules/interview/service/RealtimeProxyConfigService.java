package interview.guide.modules.interview.service;

import interview.guide.common.config.InterviewMediaConfigProperties;
import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.interview.model.ProxyRealtimeTranscriptionConfigResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RealtimeProxyConfigService {

    private final InterviewMediaConfigProperties mediaConfig;

    public ProxyRealtimeTranscriptionConfigResponse getProxyConfig() {
        if (!mediaConfig.isTranscriptionEnabled()
            || mediaConfig.getTranscriptionApiKey() == null
            || mediaConfig.getTranscriptionApiKey().isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "实时转写未启用或 Deepgram API Key 未配置");
        }

        return new ProxyRealtimeTranscriptionConfigResponse(
            "backend-proxy",
            "/ws/interview/realtime-transcription",
            mediaConfig.getTranscriptionModel(),
            "zh",
            true,
            true,
            300,
            1200,
            "audio/ogg;codecs=opus",
            "ogg"
        );
    }
}
