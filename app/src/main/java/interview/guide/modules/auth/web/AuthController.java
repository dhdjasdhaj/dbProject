package interview.guide.modules.auth.web;

import interview.guide.common.result.Result;
import interview.guide.modules.auth.model.AuthDtos.AuthResponse;
import interview.guide.modules.auth.model.AuthDtos.LoginRequest;
import interview.guide.modules.auth.model.AuthDtos.RegisterRequest;
import interview.guide.modules.auth.service.AuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "认证", description = "注册与登录（JWT）")
public class AuthController {

    private final AuthService authService;
    private final interview.guide.modules.auth.repository.UserAccountRepository users;

    @org.springframework.web.bind.annotation.GetMapping("/api/auth/me")
    public Result<java.util.Map<String, Object>> me() {
        var user = users.findById(interview.guide.infrastructure.security.SecurityUtils.requireUserId()).orElseThrow();
        return Result.success(java.util.Map.of("userId", user.getId(), "username", user.getUsername(), "role", user.getRole()));
    }

    @PostMapping("/api/auth/register")
    public Result<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return Result.success(authService.register(request));
    }

    @PostMapping("/api/auth/login")
    public Result<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(authService.login(request));
    }

    @PostMapping("/api/auth/admin/login")
    public Result<AuthResponse> adminLogin(@Valid @RequestBody LoginRequest request) {
        return Result.success(authService.loginAsAdministrator(request));
    }
}
