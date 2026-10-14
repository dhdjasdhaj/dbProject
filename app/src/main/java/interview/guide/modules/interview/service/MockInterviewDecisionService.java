package interview.guide.modules.interview.service;

import interview.guide.common.ai.StructuredOutputInvoker;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.interview.model.InterviewFlowDecisionDTO;
import interview.guide.modules.interview.model.InterviewNextAction;
import interview.guide.modules.interview.model.InterviewRoundDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
public class MockInterviewDecisionService implements InterviewDecisionService {

    private record DecisionDTO(String action, String reason, String nextQuestion) {}

    private final ChatClient chatClient;
    private final StructuredOutputInvoker structuredOutputInvoker;
    private final ObjectMapper objectMapper;
    private final PromptTemplate systemPromptTemplate;
    private final PromptTemplate userPromptTemplate;
    private final BeanOutputConverter<DecisionDTO> outputConverter;

    public MockInterviewDecisionService(
        ChatClient.Builder chatClientBuilder,
        StructuredOutputInvoker structuredOutputInvoker,
        ObjectMapper objectMapper,
        @Value("classpath:prompts/interview-decision-system.st") Resource systemPromptResource,
        @Value("classpath:prompts/interview-decision-user.st") Resource userPromptResource
    ) throws IOException {
        this.chatClient = chatClientBuilder.build();
        this.structuredOutputInvoker = structuredOutputInvoker;
        this.objectMapper = objectMapper;
        this.systemPromptTemplate = new PromptTemplate(systemPromptResource.getContentAsString(StandardCharsets.UTF_8));
        this.userPromptTemplate = new PromptTemplate(userPromptResource.getContentAsString(StandardCharsets.UTF_8));
        this.outputConverter = new BeanOutputConverter<>(DecisionDTO.class);
    }

    @Override
    public InterviewFlowDecisionDTO decideNextAction(
        String resumeSummary,
        InterviewRoundDTO currentRound,
        List<InterviewRoundDTO> history
    ) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("resumeSummary", resumeSummary == null ? "" : resumeSummary);
            vars.put("currentRoundId", currentRound.roundId());
            vars.put("rootQuestionIndex", currentRound.rootQuestionIndex());
            vars.put("followUpDepth", currentRound.followUpDepth());
            vars.put("currentQuestion", currentRound.questionText());
            vars.put("currentCategory", currentRound.questionCategory());
            vars.put("currentAnswer", currentRound.transcript() == null ? "" : currentRound.transcript());
            vars.put("historyJson", objectMapper.writeValueAsString(history));

            DecisionDTO dto = structuredOutputInvoker.invoke(
                chatClient,
                systemPromptTemplate.render() + "\n\n" + outputConverter.getFormat(),
                userPromptTemplate.render(vars),
                outputConverter,
                ErrorCode.AI_SERVICE_ERROR,
                "面试流程决策失败：",
                "面试流程决策",
                log
            );

            InterviewNextAction action = parseAction(dto.action());
            if (action == InterviewNextAction.END) {
                return new InterviewFlowDecisionDTO(InterviewNextAction.END, safeReason(dto.reason()), null);
            }

            String generatedQuestion = safeQuestion(dto.nextQuestion(), action);
            if (isNoIdeaAnswer(currentRound.transcript())) {
                generatedQuestion = appendAnswerHint(generatedQuestion);
            }

            InterviewRoundDTO nextRound = new InterviewRoundDTO(
                null,
                currentRound.sessionId(),
                action == InterviewNextAction.FOLLOW_UP ? currentRound.roundId() : null,
                currentRound.rootQuestionIndex(),
                action == InterviewNextAction.FOLLOW_UP ? (currentRound.followUpDepth() == null ? 1 : currentRound.followUpDepth() + 1) : 0,
                generatedQuestion,
                currentRound.questionCategory(),
                null,
                null,
                null,
                "PENDING"
            );
            return new InterviewFlowDecisionDTO(action, safeReason(dto.reason()), nextRound);
        } catch (Exception e) {
            log.warn("面试流程决策失败，使用兜底策略: {}", e.getMessage());
            return fallbackDecision(currentRound, history);
        }
    }

    private InterviewFlowDecisionDTO fallbackDecision(InterviewRoundDTO currentRound, List<InterviewRoundDTO> history) {
        String answer = currentRound.transcript() == null ? "" : currentRound.transcript().trim();
        boolean shortAnswer = answer.length() < 80;
        boolean tooManyFollowUps = currentRound.followUpDepth() != null && currentRound.followUpDepth() >= 1;
        if (shortAnswer && !tooManyFollowUps) {
            String followUpQuestion = "你刚才的回答还不够具体，请结合实际项目细节、你的职责以及最终结果再详细展开一下。";
            if (isNoIdeaAnswer(answer)) {
                followUpQuestion = appendAnswerHint(followUpQuestion);
            }
            InterviewRoundDTO nextRound = new InterviewRoundDTO(
                null,
                currentRound.sessionId(),
                currentRound.roundId(),
                currentRound.rootQuestionIndex(),
                currentRound.followUpDepth() == null ? 1 : currentRound.followUpDepth() + 1,
                followUpQuestion,
                currentRound.questionCategory(),
                null,
                null,
                null,
                "PENDING"
            );
            return new InterviewFlowDecisionDTO(InterviewNextAction.FOLLOW_UP, "当前回答较短，先进行追问", nextRound);
        }
        if (history.size() >= 4) {
            return new InterviewFlowDecisionDTO(InterviewNextAction.END, "主要能力点已覆盖，结束本次面试", null);
        }
        String nextMainQuestion = "请继续介绍一个能体现你核心能力的项目，并重点说明你在其中做出的关键决策。";
        if (isNoIdeaAnswer(answer)) {
            nextMainQuestion = appendAnswerHint(nextMainQuestion);
        }
        InterviewRoundDTO nextRound = new InterviewRoundDTO(
            null,
            currentRound.sessionId(),
            null,
            currentRound.rootQuestionIndex() + 1,
            0,
            nextMainQuestion,
            "项目经验",
            null,
            null,
            null,
            "PENDING"
        );
        return new InterviewFlowDecisionDTO(InterviewNextAction.NEXT_QUESTION, "进入下一题", nextRound);
    }

    private InterviewNextAction parseAction(String action) {
        if (action == null || action.isBlank()) {
            return InterviewNextAction.NEXT_QUESTION;
        }
        try {
            return InterviewNextAction.valueOf(action.trim().toUpperCase());
        } catch (Exception e) {
            return InterviewNextAction.NEXT_QUESTION;
        }
    }

    private String safeReason(String reason) {
        return reason == null || reason.isBlank() ? "根据当前回答自动决策下一步" : reason.trim();
    }

    private String safeQuestion(String nextQuestion, InterviewNextAction action) {
        if (nextQuestion != null && !nextQuestion.isBlank()) {
            return nextQuestion.trim();
        }
        return action == InterviewNextAction.FOLLOW_UP
            ? "请你结合刚才这段回答，再补充一下具体细节、你的职责和最终结果。"
            : "请继续介绍一个能体现你核心能力的项目，并重点说明你在其中做出的关键决策。";
    }

    private boolean isNoIdeaAnswer(String answer) {
        if (answer == null || answer.isBlank()) {
            return false;
        }
        String normalized = answer.trim().toLowerCase(Locale.ROOT).replace(" ", "");
        return normalized.contains("我不知道")
            || normalized.contains("不知道")
            || normalized.contains("我忘记")
            || normalized.contains("忘了")
            || normalized.contains("不太清楚")
            || normalized.contains("不清楚")
            || normalized.contains("不会")
            || normalized.contains("没学过")
            || normalized.contains("想不起来")
            || normalized.contains("记不清了")
            || normalized.contains("idontknow")
            || normalized.contains("dontknow")
            || normalized.contains("don'tknow");
    }

    private String appendAnswerHint(String question) {
        String hint = "如果一时想不起来，可以按“背景-任务-行动-结果（STAR）”来回答，先说你当时负责什么、做了什么、结果怎样。";
        if (question == null || question.isBlank()) {
            return hint;
        }
        if (question.contains("STAR") || question.contains("背景-任务-行动-结果")) {
            return question;
        }
        return question + " " + hint;
    }
}
