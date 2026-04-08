FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app

COPY pom.xml .
COPY app/pom.xml app/
COPY security/pom.xml security/
COPY business-service/pom.xml business-service/

RUN mvn dependency:go-offline

COPY security/src security/src
COPY business-service/src business-service/src
COPY app/src app/src

RUN mvn clean install -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=builder /app/app/target/app-0.0.1-SNAPSHOT.jar ./app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]