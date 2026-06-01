using Microsoft.Data.SqlClient;
using System.Net;

namespace SqlCopilot.API.Middleware;

public class ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (SqlException ex)
        {
            logger.LogWarning(ex, "SQL connection error");
            ctx.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            await ctx.Response.WriteAsJsonAsync(new
            {
                error = "Database connection failed",
                detail = ex.Message
            });
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Ollama service unreachable");
            ctx.Response.StatusCode = (int)HttpStatusCode.ServiceUnavailable;
            await ctx.Response.WriteAsJsonAsync(new
            {
                error = "AI service unavailable",
                detail = "Ollama is not reachable. Ensure the Ollama container is running and the model is pulled."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            ctx.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            await ctx.Response.WriteAsJsonAsync(new { error = "Internal server error" });
        }
    }
}
