package interview.course;

import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class Errors {
    @ExceptionHandler(Api.Failure.class)
    public Api.Result<Void> failure(Api.Failure e) { return new Api.Result<>(e.code,e.getMessage(),null); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public Api.Result<Void> integrity(Exception e) { return new Api.Result<>(409,"数据重复、引用无效或不符合数据库约束，请刷新后重试",null); }
    @ExceptionHandler(org.springframework.jdbc.UncategorizedSQLException.class)
    public Api.Result<Void> sqlConstraint(org.springframework.jdbc.UncategorizedSQLException e) {
        // MySQL 8 CHECK violations use HY000/3819 and are not classified as integrity errors by the default translator.
        if (e.getSQLException().getErrorCode() == 3819) return new Api.Result<>(409,"数据不符合数据库检查约束，请检查评分和招聘名额",null);
        LoggerFactory.getLogger(Errors.class).error("Course SQL operation failed: errorCode={}",e.getSQLException().getErrorCode());
        return new Api.Result<>(500,"就业数据服务暂不可用，请稍后重试",null);
    }
    @ExceptionHandler(org.springframework.dao.CannotAcquireLockException.class)
    public Api.Result<Void> concurrent(Exception e) { return new Api.Result<>(409,"同时操作产生冲突，请刷新后重试",null); }
    @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class})
    public Api.Result<Void> validation(Exception e) { return new Api.Result<>(400,"请检查必填字段、日期格式和数值范围",null); }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public Api.Result<Void> size(Exception e) { return new Api.Result<>(400,"附件不能超过 10MB",null); }
    @ExceptionHandler(Exception.class)
    public Api.Result<Void> unknown(Exception e) {
        LoggerFactory.getLogger(Errors.class).error("Course request failed: {}",e.getClass().getSimpleName());
        return new Api.Result<>(500,"就业服务暂不可用，请稍后重试",null);
    }
}
