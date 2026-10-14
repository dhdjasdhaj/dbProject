package interview.course;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final Identity identity;
    public WebConfig(Identity identity) { this.identity=identity; }
    public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(identity).addPathPatterns("/api/course/**"); }
}
