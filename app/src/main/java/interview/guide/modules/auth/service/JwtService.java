package interview.guide.modules.auth.service;

import interview.guide.modules.auth.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 签发与校验（HS256）
 */
@Service
@RequiredArgsConstructor
public class JwtService {

    private static final String CLAIM_UID = "uid";

    private final JwtProperties jwtProperties;

    private SecretKey secretKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String username, Long userId) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + jwtProperties.getExpirationMs());
        return Jwts.builder()
            .subject(username)
            .claim(CLAIM_UID, userId)
            .issuedAt(now)
            .expiration(exp)
            .signWith(secretKey())
            .compact();
    }

    public Claims parseAndValidate(String token) throws JwtException {
        return Jwts.parser()
            .verifyWith(secretKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public Long extractUserId(Claims claims) {
        Object raw = claims.get(CLAIM_UID);
        if (raw instanceof Number n) {
            return n.longValue();
        }
        if (raw instanceof String s) {
            return Long.parseLong(s);
        }
        throw new JwtException("Missing uid claim");
    }
}
