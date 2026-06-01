using SqlCopilot.API.Models;
using SqlCopilot.API.Services;

namespace SqlCopilot.API.Controllers;

public static class ConnectionEndpoints
{
    public static IEndpointRouteBuilder MapConnectionEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/test", async (ConnectionRequest req, SchemaService svc) =>
        {
            await svc.TestConnectionAsync(req.ToConnectionString());
            return Results.Ok(new { connected = true, database = req.Database, host = req.Host });
        })
        .WithName("TestConnection")
        .WithTags("Connection");

        return app;
    }
}

public static class SchemaEndpoints
{
    public static IEndpointRouteBuilder MapSchemaEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/", async (SchemaRequest req, SchemaService svc) =>
        {
            var tables = await svc.GetSchemaAsync(req.Connection.ToConnectionString());
            var context = svc.BuildSchemaContext(tables);
            return Results.Ok(new { tables, schemaContext = context });
        })
        .WithName("GetSchema")
        .WithTags("Schema");

        return app;
    }
}

public static class QueryEndpoints
{
    public static IEndpointRouteBuilder MapQueryEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/generate", async (GenerateRequest req, OllamaService ollama) =>
        {
            var result = await ollama.GenerateSqlAsync(req.SchemaContext, req.UserMessage);
            return Results.Ok(result);
        })
        .WithName("GenerateQuery")
        .WithTags("Query");

        return app;
    }
}
