package interview.guide.modules.interview.service;

import interview.guide.common.ai.StructuredOutputInvoker;
import interview.guide.common.config.InterviewMediaConfigProperties;
import interview.guide.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class TranscriptRefinementService {

    private record TranscriptRefineDTO(String transcript) {}

    private static final int MAX_LENGTH_MULTIPLIER = 2;
    private static final int MAX_EXTRA_CHARS = 12;

    private final InterviewMediaConfigProperties mediaConfig;
    private final ChatClient chatClient;
    private final StructuredOutputInvoker structuredOutputInvoker;
    private final BeanOutputConverter<TranscriptRefineDTO> outputConverter = new BeanOutputConverter<>(TranscriptRefineDTO.class);

    public TranscriptRefinementService(
        InterviewMediaConfigProperties mediaConfig,
        ChatClient.Builder chatClientBuilder,
        StructuredOutputInvoker structuredOutputInvoker
    ) {
        this.mediaConfig = mediaConfig;
        this.chatClient = chatClientBuilder.build();
        this.structuredOutputInvoker = structuredOutputInvoker;
    }

    public String refineForInterview(String transcript, String sessionId, String roundId) {
        if (transcript == null) {
            return "";
        }
        String source = transcript.trim();
        if (source.isBlank()) {
            return source;
        }
        if (!mediaConfig.isTranscriptRefinementEnabled()) {
            return source;
        }

        try {
            TranscriptRefineDTO dto = structuredOutputInvoker.invoke(
                chatClient,
                buildSystemPrompt() + "\n\n" + outputConverter.getFormat(),
                buildUserPrompt(source),
                outputConverter,
                ErrorCode.AI_SERVICE_ERROR,
                "转写优化失败：",
                "转写优化",
                log
            );

            String candidate = dto != null && dto.transcript() != null ? dto.transcript().trim() : "";
            if (candidate.isBlank()) {
                return source;
            }
            if (!passesLengthGuard(source, candidate)) {
                log.warn("转写优化长度越界，回退原文: sessionId={}, roundId={}, sourceLen={}, refinedLen={}",
                    sessionId, roundId, source.length(), candidate.length());
                return source;
            }
            return candidate;
        } catch (Exception e) {
            log.warn("转写优化失败，回退原文: sessionId={}, roundId={}, error={}", sessionId, roundId, e.getMessage());
            return source;
        }
    }

    private boolean passesLengthGuard(String source, String candidate) {
        int sourceLen = source.length();
        int candidateLen = candidate.length();
        if (sourceLen <= 8) {
            return candidateLen <= sourceLen + 4;
        }
        int maxAllowed = sourceLen * MAX_LENGTH_MULTIPLIER + MAX_EXTRA_CHARS;
        int minAllowed = Math.max(1, sourceLen / 2);
        return candidateLen >= minAllowed && candidateLen <= maxAllowed;
    }

    private String buildSystemPrompt() {
        return """
你是“语音转写文本清洗器”。
你的任务：仅对中文转写文本做轻量优化，使其更通顺、可读。

硬性约束（必须遵守）：
1) 不能新增事实、数字、时间、地点、人名、项目名、技术名。
2) 不能改变原意、立场、因果关系。
3) 不能补充用户未说过的信息。
4) 只能做：去口头禅/重复词、修正常见错别字或同音误识别、补全基础标点与断句。
5) 输出长度应与原文接近，不要扩写。
6) 仅输出字段 transcript 对应的一段文本，不要解释。
""";
    }

    private String buildUserPrompt(String source) {
        return "原始转写：\n" + source + "\n\n请按约束返回优化后 transcript。";
    }
}
