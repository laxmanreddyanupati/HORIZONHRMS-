using System.Security.Claims;
using System.Text;
using System.Text.Json;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context => context.ToErrorResult();
    });

builder.Services.AddProblemDetails();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is not configured. Set ConnectionStrings__DefaultConnection.");

var dbProvider = builder.Configuration.GetValue<string>("Database:Provider") ?? "SqlServer";
builder.Services.AddDbContext<HrmsDbContext>(options =>
{
    if (string.Equals(dbProvider, "Postgres", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(dbProvider, "PostgreSQL", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure(3));
    }
});

var authSettings = builder.Configuration.GetSection(AuthSettings.SectionName).Get<AuthSettings>() ?? new AuthSettings();
if (string.IsNullOrWhiteSpace(authSettings.SigningKey))
{
    if (builder.Environment.IsDevelopment())
    {
        authSettings.SigningKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));
        Console.WriteLine("WARNING: Auth:SigningKey was not configured. Generated an ephemeral development key; existing tokens will be invalid after restart.");
    }
    else
    {
        throw new InvalidOperationException(
            "Auth:SigningKey is required outside Development. Provide it via Auth__SigningKey or a secret store (minimum 32 characters).");
    }
}

if (authSettings.SigningKey.Length < 32)
{
    throw new InvalidOperationException("Auth:SigningKey must be at least 32 characters long.");
}

builder.Services.Configure<AuthSettings>(settings =>
{
    settings.Issuer = authSettings.Issuer;
    settings.Audience = authSettings.Audience;
    settings.SigningKey = authSettings.SigningKey;
    settings.AccessTokenMinutes = authSettings.AccessTokenMinutes;
    settings.RefreshTokenDays = authSettings.RefreshTokenDays;
});

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddSingleton<DemoClock>();

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authSettings.SigningKey));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = authSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
            RoleClaimType = "role",
        };

        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new ErrorResponse
                {
                    Code = "unauthorized",
                    Message = "A valid access token is required.",
                    TraceId = context.HttpContext.TraceIdentifier,
                }, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new ErrorResponse
                {
                    Code = "forbidden",
                    Message = "You do not have permission to perform this action.",
                    TraceId = context.HttpContext.TraceIdentifier,
                }, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
            },
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Policies.HrStaff, policy => policy.RequireRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.HrExecutive));
    options.AddPolicy(Policies.HrAdmin, policy => policy.RequireRole(Roles.SuperAdmin, Roles.HrAdmin));
    options.AddPolicy(Policies.SuperAdmin, policy => policy.RequireRole(Roles.SuperAdmin));
    options.AddPolicy(Policies.PeopleManagers, policy => policy.RequireRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.HrExecutive, Roles.Manager));
    options.AddPolicy(Policies.PayrollStaff, policy => policy.RequireRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.PayrollAdmin));
    options.AddPolicy(Policies.Operations, policy => policy.RequireRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.HrExecutive, Roles.Manager, Roles.PayrollAdmin));
    options.AddPolicy(Policies.RecruitmentEdit, policy => policy.RequireRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.HrExecutive));
    options.AddPolicy(Policies.Settings, policy => policy.RequireRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.PayrollAdmin));
    options.AddPolicy(Policies.AnyEmployee, policy => policy.RequireRole(Roles.All));
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Horizon HRMS API",
        Version = "v1",
        Description = "HRMS API for the Horizon HRMS frontend. All endpoints except /api/auth/login require a bearer token.",
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter the access token returned by POST /api/auth/login.",
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = [],
    });
});

var seedOptions = builder.Configuration.GetSection(SeedOptions.SectionName).Get<SeedOptions>() ?? new SeedOptions();
builder.Services.AddSingleton(seedOptions);

var app = builder.Build();

app.UseMiddleware<ApiExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/v1/swagger.json", "Horizon HRMS API v1"));
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "HorizonHRMS.Api",
    utc = DateTime.UtcNow,
})).AllowAnonymous();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    var db = services.GetRequiredService<HrmsDbContext>();

    if (app.Configuration.GetValue<bool>("Database:ApplyMigrations"))
    {
        logger.LogInformation("Applying pending EF Core migrations...");
        await db.Database.MigrateAsync();
    }

    try
    {
        await SeedDataLoader.SeedAsync(db, seedOptions, app.Environment, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database seeding failed.");
        throw;
    }
}

app.Run();

/// <summary>Exposed so integration tests can target the application entry point.</summary>
public partial class Program
{
}

public static class Policies
{
    public const string HrStaff = "HrStaff";
    public const string HrAdmin = "HrAdmin";
    public const string SuperAdmin = "SuperAdmin";
    public const string PeopleManagers = "PeopleManagers";
    public const string PayrollStaff = "PayrollStaff";
    public const string Operations = "Operations";
    public const string RecruitmentEdit = "RecruitmentEdit";
    public const string Settings = "Settings";
    public const string AnyEmployee = "AnyEmployee";
}
