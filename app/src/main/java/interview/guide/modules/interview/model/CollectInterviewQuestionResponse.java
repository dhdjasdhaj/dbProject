package interview.guide.modules.interview.model;

public record CollectInterviewQuestionResponse(
    Long knowledgeBaseId,
    String knowledgeBaseName,
    String knowledgeBaseCategory,
    Integer questionIndex,
    boolean alreadyCollected,
    boolean collected
) {
}
