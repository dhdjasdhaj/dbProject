package interview.guide.infrastructure.redis;

import interview.guide.common.model.AsyncTaskStatus;
import interview.guide.modules.interview.model.InterviewSessionDTO;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InterviewCreationTaskCache {

    private static final String TASK_KEY_PREFIX = "interview:create-task:";
    private static final Duration TASK_TTL = Duration.ofHours(2);

    private final RedisService redisService;

    @Data
    public static class CachedTask implements Serializable {
        private String taskId;
        private Long userId;
        private Long resumeId;
        private AsyncTaskStatus status;
        private String stage;
        private String message;
        private String error;
        private InterviewSessionDTO session;
    }

    public void save(CachedTask task) {
        redisService.set(buildTaskKey(task.getTaskId()), task, TASK_TTL);
    }

    public Optional<CachedTask> get(String taskId) {
        CachedTask task = redisService.get(buildTaskKey(taskId));
        return Optional.ofNullable(task);
    }

    public void delete(String taskId) {
        redisService.delete(buildTaskKey(taskId));
    }

    private String buildTaskKey(String taskId) {
        return TASK_KEY_PREFIX + taskId;
    }
}
