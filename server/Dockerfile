# Build Stage
FROM gradle:jdk21-jammy AS builder
WORKDIR /app
COPY . .

RUN chmod +x gradlew 

RUN ./gradlew bootJar --no-daemon

# Run Stage
FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]