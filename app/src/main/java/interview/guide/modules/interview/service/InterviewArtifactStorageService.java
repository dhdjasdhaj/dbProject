package interview.guide.modules.interview.service;

import interview.guide.common.config.StorageConfigProperties;
import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.InterviewRoundDTO;
import interview.guide.modules.interview.model.TextToSpeechResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewArtifactStorageService {

    private final S3Client s3Client;
    private final StorageConfigProperties storageConfig;

    public void writeSessionResume(Long userId, String sessionId, String resumeText) {
        putText(buildSessionPrefix(userId, sessionId) + "/resume.txt", resumeText == null ? "" : resumeText, "text/plain");
    }

    public void writeRoundQuestion(Long userId, String sessionId, String roundPrefix, InterviewQuestionDTO question) {
        if (question == null) return;
        putText(buildSessionPrefix(userId, sessionId) + "/" + roundPrefix + "/question.txt", question.question(), "text/plain");
    }

    public void writeRoundAnswer(Long userId, String sessionId, String roundPrefix, String answer) {
        putText(buildSessionPrefix(userId, sessionId) + "/" + roundPrefix + "/answer.txt", answer == null ? "" : answer, "text/plain");
    }

    public void writeRoundTranscript(Long userId, String sessionId, String roundPrefix, String transcript) {
        putText(buildSessionPrefix(userId, sessionId) + "/" + roundPrefix + "/transcript.txt", transcript == null ? "" : transcript, "text/plain");
    }

    public void writeRoundEvaluation(Long userId, String sessionId, String roundPrefix, String evaluationJson) {
        putText(buildSessionPrefix(userId, sessionId) + "/" + roundPrefix + "/evaluation.json", evaluationJson == null ? "{}" : evaluationJson, "application/json");
    }

    public void writeFinalReport(Long userId, String sessionId, String reportJson) {
        putText(buildSessionPrefix(userId, sessionId) + "/final_report.json", reportJson == null ? "{}" : reportJson, "application/json");
    }

    public void writeTtsQuestionAudio(Long userId, String sessionId, String roundPrefix, TextToSpeechResult ttsResult) {
        if (ttsResult == null || ttsResult.audioFileKey() == null) return;
        putText(buildSessionPrefix(userId, sessionId) + "/" + roundPrefix + "/question_tts_ref.txt", ttsResult.audioFileKey(), "text/plain");
    }

    public String buildRoundPrefix(InterviewRoundDTO round) {
        if (round.followUpDepth() != null && round.followUpDepth() > 0 && round.parentRoundId() != null) {
            return "q" + (round.rootQuestionIndex() + 1) + "/followups/q" + (round.rootQuestionIndex() + 1) + "_" + round.followUpDepth();
        }
        return "q" + (round.rootQuestionIndex() + 1);
    }

    private String buildSessionPrefix(Long userId, String sessionId) {
        return "interview/" + userId + "/" + sessionId;
    }

    private void putText(String key, String text, String contentType) {
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(storageConfig.getBucket())
                .key(key)
                .contentType(contentType)
                .build(),
            RequestBody.fromBytes(text.getBytes(StandardCharsets.UTF_8))
        );
        log.info("Interview artifact stored: {}", key);
    }
}
