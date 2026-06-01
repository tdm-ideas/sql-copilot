using SqlCopilot.API.Controllers;
using SqlCopilot.API.Middleware;
using SqlCopilot.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddHttpClient<OllamaService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["OLLAMA_BASE_URL"] ?? "http://ollama:11434");
    var timeoutSeconds = int.TryParse(builder.Configuration["OLLAMA_TIMEOUT_SECONDS"], out var t) ? t : 300;
    client.Timeout = TimeSpan.FromSeconds(timeoutSeconds);
});
builder.Services.AddScoped<SchemaService>();

var allowedOrigins = (builder.Configuration["ALLOWED_ORIGINS"] ?? "http://localhost:4200")
    .Split(',', StringSplitOptions.RemoveEmptyEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .WithTags("Health");

app.MapGroup("/api/connection").MapConnectionEndpoints();
app.MapGroup("/api/schema").MapSchemaEndpoints();
app.MapGroup("/api/query").MapQueryEndpoints();

app.Run();
