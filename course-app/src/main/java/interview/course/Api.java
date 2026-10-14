package interview.course;

import java.util.List;
import java.util.Map;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class Api {
    private Api() {}
    public record Result<T>(int code, String message, T data) {
        public static <T> Result<T> ok(T data) { return new Result<>(200,"success",data); }
    }
    public record Page(List<Map<String,Object>> items,long total,int page,int size) {}
    public static class Failure extends RuntimeException {
        final int code;
        public Failure(int code,String message) { super(message); this.code=code; }
    }
    public record Student(@NotBlank @Size(max=32) String studentNo,@NotBlank @Size(max=64) String fullName,
        @NotBlank @Size(max=100) String college,@NotBlank @Size(max=100) String major,
        @Min(2000) @Max(2100) int graduationYear,@Size(max=100) String contact) {}
    public record Company(@NotBlank @Size(max=32) String code,@NotBlank @Size(max=120) String name,
        @NotBlank @Size(max=64) String industry,@NotBlank @Size(max=100) String contact,
        @Size(max=5000) String description,boolean enabled) {}
    public record Job(@Positive long companyId,@NotBlank @Size(max=120) String title,
        @NotBlank @Size(max=64) String category,@NotBlank @Size(max=64) String city,
        @NotBlank @Size(max=5000) String description,@Min(1) @Max(100000) int plannedCount,
        @NotNull OffsetDateTime deadline,@Pattern(regexp="OPEN|CLOSED|ARCHIVED") @NotNull String status) {}
    public record Application(@Positive long jobId,Long resumeFileId,@Size(max=1000) String note) {}
    public record Note(@Size(max=1000) String note) {}
    public record Interview(@Positive long applicationId,@NotNull OffsetDateTime scheduledAt,
        @NotBlank @Size(max=200) String location,@NotBlank @Size(max=64) String interviewer) {}
    public record Scores(@NotNull @Min(0) @Max(30) Integer communication,
        @NotNull @Min(0) @Max(40) Integer professional,@NotNull @Min(0) @Max(30) Integer fit,
        @Size(max=1000) String comment) {}
    public record Employment(@Positive long applicationId,@NotNull LocalDate startDate,@Size(max=1000) String remarks) {}
    public record Account(@Pattern(regexp="USER|STAFF") @NotNull String role,boolean enabled) {}
    public record Grants(@NotNull @Size(max=20) List<String> permissions) {}
}
