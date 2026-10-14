package interview.guide.modules.interview.websocket;

import interview.guide.common.config.InterviewMediaConfigProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimeTranscriptionProxyHandler extends BinaryWebSocketHandler {

    private final InterviewMediaConfigProperties mediaConfig;
    private final Map<String, WebSocket> upstreamSockets = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> frameCounters = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> byteCounters = new ConcurrentHashMap<>();
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String url = "wss://api.deepgram.com/v1/listen?model=" + mediaConfig.getTranscriptionModel()
            + "&language=zh&interim_results=true&smart_format=true&endpointing=300&utterance_end_ms=1200&punctuate=true"
            + "&mimetype=audio/ogg;codecs=opus";
        frameCounters.put(session.getId(), new AtomicLong());
        byteCounters.put(session.getId(), new AtomicLong());
        log.info("Opening realtime upstream websocket: sessionId={}, url={}", session.getId(), url);
        try {
            WebSocket upstream = httpClient.newWebSocketBuilder()
                .header("Authorization", "Token " + mediaConfig.getTranscriptionApiKey())
                .connectTimeout(Duration.ofSeconds(20))
                .buildAsync(URI.create(url), new ProxyUpstreamListener(session))
                .join();
            upstreamSockets.put(session.getId(), upstream);
            log.info("Realtime upstream websocket connected: sessionId={}", session.getId());
        } catch (Exception ex) {
            log.warn("Opening realtime upstream websocket failed: sessionId={}, message={}", session.getId(), ex.getMessage());
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        WebSocket upstream = upstreamSockets.get(session.getId());
        if (upstream == null) {
            log.warn("Realtime binary frame dropped: no upstream, sessionId={}", session.getId());
            return;
        }
        ByteBuffer payload = message.getPayload().asReadOnlyBuffer();
        int bytes = payload.remaining();
        long frameNo = frameCounters.computeIfAbsent(session.getId(), key -> new AtomicLong()).incrementAndGet();
        long totalBytes = byteCounters.computeIfAbsent(session.getId(), key -> new AtomicLong()).addAndGet(bytes);
        if (frameNo <= 3 || frameNo % 20 == 0) {
            log.info("Realtime binary frame forwarded: sessionId={}, frameNo={}, bytes={}, totalBytes={}", session.getId(), frameNo, bytes, totalBytes);
        }
        upstream.sendBinary(payload, true);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        WebSocket upstream = upstreamSockets.get(session.getId());
        if (upstream == null) {
            log.warn("Realtime text frame dropped: no upstream, sessionId={}, payload={}", session.getId(), message.getPayload());
            return;
        }
        log.info("Realtime control message forwarded: sessionId={}, payload={}", session.getId(), message.getPayload());
        upstream.sendText(message.getPayload(), true);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        long frames = frameCounters.getOrDefault(session.getId(), new AtomicLong()).get();
        long bytes = byteCounters.getOrDefault(session.getId(), new AtomicLong()).get();
        log.info("Realtime downstream websocket closed: sessionId={}, code={}, reason={}, frames={}, bytes={}", session.getId(), status.getCode(), status.getReason(), frames, bytes);
        WebSocket upstream = upstreamSockets.remove(session.getId());
        frameCounters.remove(session.getId());
        byteCounters.remove(session.getId());
        if (upstream != null) {
            upstream.sendClose(WebSocket.NORMAL_CLOSURE, "client closed");
        }
    }

    @Slf4j
    private static final class ProxyUpstreamListener implements WebSocket.Listener {

        private final WebSocketSession downstream;
        private final AtomicBoolean firstMessageLogged = new AtomicBoolean(false);

        private ProxyUpstreamListener(WebSocketSession downstream) {
            this.downstream = downstream;
        }

        @Override
        public void onOpen(WebSocket webSocket) {
            log.info("Realtime upstream listener opened: sessionId={}", downstream.getId());
            webSocket.request(1);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            try {
                if (firstMessageLogged.compareAndSet(false, true)) {
                    log.info("Realtime upstream first message: sessionId={}, payload={}", downstream.getId(), data);
                }
                if (downstream.isOpen()) {
                    downstream.sendMessage(new TextMessage(data.toString()));
                }
            } catch (Exception e) {
                log.warn("Forward realtime transcript failed: {}", e.getMessage());
            }
            webSocket.request(1);
            return null;
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            log.info("Realtime upstream listener closed: sessionId={}, code={}, reason={}", downstream.getId(), statusCode, reason);
            try {
                if (downstream.isOpen()) {
                    downstream.close();
                }
            } catch (Exception e) {
                log.warn("Close downstream websocket failed: {}", e.getMessage());
            }
            return null;
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            log.warn("Deepgram realtime upstream error: {}", error.getMessage());
            try {
                if (downstream.isOpen()) {
                    downstream.close(CloseStatus.SERVER_ERROR);
                }
            } catch (Exception e) {
                log.warn("Close downstream after upstream error failed: {}", e.getMessage());
            }
        }
    }
}
