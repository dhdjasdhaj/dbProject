package interview.guide.common.ai;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import org.slf4j.Logger;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 统一封装结构化输出调用与重试策略。
 */
@Component
public class StructuredOutputInvoker {

    private static final String STRICT_JSON_INSTRUCTION = """
请仅返回可被 JSON 解析器直接解析的 JSON 对象，并严格满足字段结构要求：
1) 不要输出 Markdown 代码块（如 ```json）。
2) 不要输出任何解释文字、前后缀、注释。
3) 所有字符串内引号必须正确转义。
""";

    private final int maxAttempts;
    private final boolean includeLastErrorInRetryPrompt;
    private final boolean openrouterFallbackEnabled;
    private final String openrouterBaseUrl;
    private final String openrouterApiKey;
    private final String openrouterModel;

    public StructuredOutputInvoker(
        @Value("${app.ai.structured-max-attempts:2}") int maxAttempts,
        @Value("${app.ai.structured-include-last-error:true}") boolean includeLastErrorInRetryPrompt,
        @Value("${app.ai.fallback.openrouter-enabled:true}") boolean openrouterFallbackEnabled,
        @Value("${OPENROUTER_BASE_URL:https://openrouter.ai/api/v1}") String openrouterBaseUrl,
        @Value("${OPENROUTER_API_KEY:}") String openrouterApiKey,
        @Value("${OPENROUTER_MODEL:openai/gpt-4o-mini}") String openrouterModel
    ) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.includeLastErrorInRetryPrompt = includeLastErrorInRetryPrompt;
        this.openrouterFallbackEnabled = openrouterFallbackEnabled;
        this.openrouterBaseUrl = openrouterBaseUrl;
        this.openrouterApiKey = openrouterApiKey;
        this.openrouterModel = openrouterModel;
    }

    public <T> T invoke(
        ChatClient chatClient,
        String systemPromptWithFormat,
        String userPrompt,
        BeanOutputConverter<T> outputConverter,
        ErrorCode errorCode,
        String errorPrefix,
        String logContext,
        Logger log
    ) {
        Exception lastError = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            String attemptSystemPrompt = attempt == 1
                ? systemPromptWithFormat
                : buildRetrySystemPrompt(systemPromptWithFormat, lastError);
            try {
                return chatClient.prompt()
                    .system(attemptSystemPrompt)
                    .user(userPrompt)
                    .call()
                    .entity(outputConverter);
            } catch (Exception e) {
                lastError = e;
                log.warn("{}结构化解析失败，准备重试: attempt={}, error={}", logContext, attempt, e.getMessage());
            }
        }

        if (shouldFallbackToOpenrouter(lastError)) {
            try {
                log.warn("{}主模型失败，切换 OpenRouter 兜底: model={}, error={}",
                    logContext,
                    openrouterModel,
                    lastError != null ? lastError.getMessage() : "unknown");
                return invokeWithOpenrouter(
                    systemPromptWithFormat,
                    userPrompt,
                    outputConverter,
                    logContext,
                    log
                );
            } catch (Exception fallbackError) {
                lastError = fallbackError;
                log.error("{}OpenRouter 兜底失败: {}", logContext, fallbackError.getMessage());
            }
        }

        throw new BusinessException(
            errorCode,
            errorPrefix + (lastError != null ? lastError.getMessage() : "unknown")
        );
    }

    private <T> T invokeWithOpenrouter(
        String systemPromptWithFormat,
        String userPrompt,
        BeanOutputConverter<T> outputConverter,
        String logContext,
        Logger log
    ) {
        if (!openrouterFallbackEnabled || openrouterApiKey == null || openrouterApiKey.isBlank()) {
            throw new IllegalStateException("OpenRouter fallback is disabled or API key is empty");
        }

        OpenAiApi openAiApi = OpenAiApi.builder()
            .apiKey(openrouterApiKey)
            .baseUrl(openrouterBaseUrl)
            .completionsPath("/chat/completions")
            .build();

        OpenAiChatModel fallbackModel = OpenAiChatModel.builder()
            .openAiApi(openAiApi)
            .defaultOptions(
                org.springframework.ai.openai.OpenAiChatOptions.builder()
                    .model(openrouterModel)
                    .temperature(0.2)
                    .build()
            )
            .build();

        ChatClient fallbackClient = ChatClient.builder(fallbackModel).build();

        Exception lastFallbackError = null;
        for (int attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
            String attemptSystemPrompt = attempt == 1
                ? systemPromptWithFormat
                : buildRetrySystemPrompt(systemPromptWithFormat, lastFallbackError);
            try {
                return fallbackClient.prompt()
                    .system(attemptSystemPrompt)
                    .user(userPrompt)
                    .call()
                    .entity(outputConverter);
            } catch (Exception e) {
                lastFallbackError = e;
                log.warn("{}OpenRouter 结构化解析失败，重试: attempt={}, error={}", logContext, attempt, e.getMessage());
            }
        }

        throw new IllegalStateException(lastFallbackError != null ? lastFallbackError.getMessage() : "OpenRouter fallback failed");
    }

    private boolean shouldFallbackToOpenrouter(Exception e) {
        if (!openrouterFallbackEnabled || e == null) {
            return false;
        }
        String msg = e.getMessage();
        if (msg == null) {
            return false;
        }
        String lower = msg.toLowerCase();
        return lower.contains("http 429")
            || lower.contains("http 404")
            || lower.contains("resource_exhausted")
            || (lower.contains("model") && lower.contains("not found"))
            || lower.contains("is not supported")
            || lower.contains("quota")
            || lower.contains("rate limit");
    }

    private String buildRetrySystemPrompt(String systemPromptWithFormat, Exception lastError) {
        StringBuilder prompt = new StringBuilder(systemPromptWithFormat)
            .append("\n\n")
            .append(STRICT_JSON_INSTRUCTION)
            .append("\n上次输出解析失败，请仅返回合法 JSON。");

        if (includeLastErrorInRetryPrompt && lastError != null && lastError.getMessage() != null) {
            prompt.append("\n上次失败原因：")
                .append(sanitizeErrorMessage(lastError.getMessage()));
        }
        return prompt.toString();
    }

    private String sanitizeErrorMessage(String message) {
        String oneLine = message.replace('\n', ' ').replace('\r', ' ').trim();
        if (oneLine.length() > 200) {
            return oneLine.substring(0, 200) + "...";
        }
        return oneLine;
    }
}
