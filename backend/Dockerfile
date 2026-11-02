# Use the .NET 10 SDK to build, then the ASP.NET runtime image to run.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore
COPY backend/HorizonHRMS.Api/HorizonHRMS.Api.csproj backend/HorizonHRMS.Api/
RUN dotnet restore backend/HorizonHRMS.Api/HorizonHRMS.Api.csproj

# Copy the rest of the backend source
COPY backend/ backend/
RUN dotnet publish backend/HorizonHRMS.Api/HorizonHRMS.Api.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "HorizonHRMS.Api.dll"]