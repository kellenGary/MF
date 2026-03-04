# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore dependencies (cached layer)
COPY api/petalAPI/PetalAPI.csproj api/petalAPI/
RUN dotnet restore api/petalAPI/PetalAPI.csproj

# Copy source and publish
COPY api/petalAPI/ api/petalAPI/
WORKDIR /src/api/petalAPI
RUN dotnet publish PetalAPI.csproj -c Release -o /app/publish --no-restore

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Include SQL view scripts (read at runtime from ContentRootPath)
COPY api/petalAPI/scripts/ ./scripts/

EXPOSE 8080
ENTRYPOINT ["dotnet", "PetalAPI.dll"]
