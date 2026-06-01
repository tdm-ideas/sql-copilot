# Stage 1 — build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY SqlCopilot.API/SqlCopilot.API.csproj SqlCopilot.API/
RUN dotnet restore SqlCopilot.API/SqlCopilot.API.csproj

COPY SqlCopilot.API/ SqlCopilot.API/
RUN dotnet publish SqlCopilot.API/SqlCopilot.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Stage 2 — runtime (non-root, OpenShift compatible)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

# OpenShift runs containers with arbitrary UIDs — ensure /app is group-writable
WORKDIR /app
COPY --from=build /app/publish .

RUN chown -R 1001:0 /app && chmod -R g=u /app

# OpenShift assigns a random UID but always GID 0
USER 1001

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "SqlCopilot.API.dll"]
