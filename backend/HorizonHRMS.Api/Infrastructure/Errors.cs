using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace HorizonHRMS.Api.Infrastructure;

public sealed class ApiException : Exception
{
    public ApiException(HttpStatusCode statusCode, string code, string message, IDictionary<string, string[]>? errors = null)
        : base(message)
    {
        StatusCode = (int)statusCode;
        Code = code;
        Errors = errors;
    }

    public int StatusCode { get; }
    public string Code { get; }
    public IDictionary<string, string[]>? Errors { get; }

    public static ApiException NotFound(string message, string code = "not_found") =>
        new(HttpStatusCode.NotFound, code, message);

    public static ApiException BadRequest(string message, string code = "invalid_request", IDictionary<string, string[]>? errors = null) =>
        new(HttpStatusCode.BadRequest, code, message, errors);

    public static ApiException Conflict(string message, string code = "conflict") =>
        new(HttpStatusCode.Conflict, code, message);

    public static ApiException Forbidden(string message = "You do not have permission to perform this action.", string code = "forbidden") =>
        new(HttpStatusCode.Forbidden, code, message);

    public static ApiException Unauthorized(string message = "Authentication is required.", string code = "unauthorized") =>
        new(HttpStatusCode.Unauthorized, code, message);
}

public sealed class ErrorResponse
{
    public string Code { get; set; } = "error";
    public string Message { get; set; } = "An unexpected error occurred.";
    public IDictionary<string, string[]>? Errors { get; set; }
    public string TraceId { get; set; } = string.Empty;
}

public sealed class ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ApiException ex)
        {
            await WriteAsync(context, ex.StatusCode, new ErrorResponse
            {
                Code = ex.Code,
                Message = ex.Message,
                Errors = ex.Errors,
                TraceId = context.TraceIdentifier,
            });
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client disconnected; nothing to report.
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteAsync(context, StatusCodes.Status500InternalServerError, new ErrorResponse
            {
                Code = "server_error",
                Message = "An unexpected error occurred. Please try again or contact support.",
                TraceId = context.TraceIdentifier,
            });
        }
    }

    private static async Task WriteAsync(HttpContext context, int statusCode, ErrorResponse body)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
    }
}

public static class ModelStateExtensions
{
    public static BadRequestObjectResult ToErrorResult(this ActionContext context)
    {
        var errors = context.ModelState
            .Where(pair => pair.Value is { Errors.Count: > 0 })
            .ToDictionary(
                pair => JsonNamingPolicy.CamelCase.ConvertName(pair.Key),
                pair => pair.Value!.Errors
                    .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage) ? "The value is invalid." : error.ErrorMessage)
                    .ToArray());

        var body = new ErrorResponse
        {
            Code = "validation_failed",
            Message = "One or more validation errors occurred.",
            Errors = errors,
            TraceId = context.HttpContext.TraceIdentifier,
        };

        return new BadRequestObjectResult(body);
    }
}
