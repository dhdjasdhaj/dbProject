package interview.guide.modules.interview.model;

import interview.guide.common.model.AsyncTaskStatus;

/**
 * 创建面试异步任务状态响应
 */
public record InterviewCreationTaskStatusResponse(
    String taskId,
    AsyncTaskStatus status,
    String stage,
    String message,
    String error,
    InterviewSessionDTO session
) {
}
