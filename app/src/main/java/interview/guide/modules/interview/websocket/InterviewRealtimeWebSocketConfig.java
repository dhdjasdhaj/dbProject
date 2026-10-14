package interview.guide.modules.interview.websocket;

import interview.guide.common.config.CorsConfig;
import interview.guide.common.config.InterviewMediaConfigProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class InterviewRealtimeWebSocketConfig implements WebSocketConfigurer {

    private final RealtimeTranscriptionProxyHandler realtimeTranscriptionProxyHandler;
    private final RealtimeTranscriptionHandshakeInterceptor handshakeInterceptor;
    private final CorsConfig corsConfig;
    private final InterviewMediaConfigProperties mediaConfig;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        if (!mediaConfig.isRealtimeAllowDirectKeyFallback()) {
            return;
        }
        registry.addHandler(realtimeTranscriptionProxyHandler, "/ws/interview/realtime-transcription")
            .addInterceptors(handshakeInterceptor)
            .setAllowedOrigins(corsConfig.allowedOriginsArray());
    }
}
