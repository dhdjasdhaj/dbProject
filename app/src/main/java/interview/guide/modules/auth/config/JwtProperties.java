package interview.guide.modules.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 签发配置
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    /**
     * HMAC 密钥（原文，内部会转为 SecretKey）
     */
    private String secret = "dev-jwt-secret-change-me-in-production-32chars-min!!";

    /**
     * Access Token 有效期（毫秒）
     */
    private long expirationMs = 604_800_000L;
}
