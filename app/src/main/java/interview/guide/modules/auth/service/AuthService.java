package interview.guide.modules.auth.service;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.auth.model.AuthDtos.AuthResponse;
import interview.guide.modules.auth.model.AuthDtos.LoginRequest;
import interview.guide.modules.auth.model.AuthDtos.RegisterRequest;
import interview.guide.modules.auth.model.UserAccountEntity;
import interview.guide.modules.auth.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim();
        if (userAccountRepository.existsByUsername(username)) {
            throw new BusinessException(ErrorCode.AUTH_USERNAME_TAKEN);
        }
        UserAccountEntity entity = new UserAccountEntity();
        entity.setUsername(username);
        entity.setPasswordHash(passwordEncoder.encode(request.password()));
        UserAccountEntity saved = userAccountRepository.save(entity);
        String token = jwtService.generateToken(saved.getUsername(), saved.getId());
        return new AuthResponse(token, saved.getId(), saved.getUsername(), saved.getRole());
    }

    public AuthResponse login(LoginRequest request) {
        return response(authenticate(request));
    }

    public AuthResponse loginAsAdministrator(LoginRequest request) {
        UserAccountEntity user = authenticate(request);
        if (!"ADMIN".equals(user.getRole())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "该账号不是管理员，请使用用户登录");
        }
        return response(user);
    }

    private UserAccountEntity authenticate(LoginRequest request) {
        String username = request.username().trim();
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, request.password())
            );
        } catch (BadCredentialsException e) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }
        return userAccountRepository.findByUsername(username)
            .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS));
    }

    private AuthResponse response(UserAccountEntity user) {
        String token = jwtService.generateToken(user.getUsername(), user.getId());
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getRole());
    }
}
