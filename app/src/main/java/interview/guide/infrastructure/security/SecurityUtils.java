package interview.guide.infrastructure.security;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;

/**
 * 从 Spring Security 上下文读取当前登录用户
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /**
     * 必须已登录；返回用户主键 ID（users.id）
     */
    public static long requireUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "请先登录");
        }
        if (!(authentication instanceof UsernamePasswordAuthenticationToken token)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "请先登录");
        }
        if (token.getPrincipal() instanceof String s && "anonymousUser".equals(s)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "请先登录");
        }
        Object details = token.getDetails();
        if (details instanceof Long l) {
            return l;
        }
        if (details instanceof Integer i) {
            return i.longValue();
        }
        throw new BusinessException(ErrorCode.UNAUTHORIZED, "请先登录");
    }

    public static String requireUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "请先登录");
        }
        if (authentication.getPrincipal() instanceof User user) {
            return user.getUsername();
        }
        throw new BusinessException(ErrorCode.UNAUTHORIZED, "请先登录");
    }
}
