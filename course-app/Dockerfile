FROM gradle:8.14-jdk21 AS builder
WORKDIR /workspace
COPY settings.gradle gradlew ./
COPY gradle gradle
COPY app/build.gradle app/
COPY course-app/build.gradle course-app/
COPY course-app/src course-app/src
RUN --mount=type=cache,target=/gradle-cache,sharing=locked gradle :course-app:bootJar --no-daemon --gradle-user-home /gradle-cache -x test
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /workspace/course-app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
