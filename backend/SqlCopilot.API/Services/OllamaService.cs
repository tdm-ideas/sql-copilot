using System.Text.Json;
using SqlCopilot.API.Models;

namespace SqlCopilot.API.Services;

public class OllamaService(HttpClient http, ILogger<OllamaService> logger)
{
    private const string Model = "defog/sqlcoder-7b-2";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public async Task<GenerateResponse> GenerateSqlAsync(string schemaContext, string userMessage)
    {
        var prompt = BuildPrompt(schemaContext, userMessage);

        var payload = new OllamaRequest(Model, prompt, Stream: false);
        var response = await http.PostAsJsonAsync("/api/generate", payload, JsonOpts);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OllamaResponse>(JsonOpts)
            ?? throw new InvalidOperationException("Empty response from Ollama");

        logger.LogInformation("Ollama generated SQL for: {Message}", userMessage[..Math.Min(60, userMessage.Length)]);

        var (sql, explanation) = ParseResponse(result.Response);
        return new GenerateResponse(sql, explanation, Model);
    }

    private static string BuildPrompt(string schema, string userMessage) => $$"""
        ### Task
        Generate a T-SQL SELECT query for SQL Server based on the schema below.

        ### Database Schema
        {{schema}}

        ### Request
        {{userMessage}}

        ### Rules
        - Only write SELECT queries. Never write DELETE, UPDATE, INSERT, DROP, TRUNCATE, or any DDL.
        - Use proper JOINs. Use table aliases.
        - Add inline comments for complex logic.
        - Return ONLY a JSON object in this exact format, nothing else:
          {"sql": "...", "explanation": "one sentence plain English summary"}

        ### Response
        """;

    private static (string sql, string explanation) ParseResponse(string raw)
    {
        try
        {
            var cleaned = raw.Trim().TrimStart('`');
            if (cleaned.StartsWith("json")) cleaned = cleaned[4..];
            cleaned = cleaned.Trim().TrimEnd('`').Trim();

            var doc = JsonDocument.Parse(cleaned);
            var sql = doc.RootElement.GetProperty("sql").GetString() ?? raw;
            var explanation = doc.RootElement.TryGetProperty("explanation", out var exp)
                ? exp.GetString() ?? string.Empty
                : string.Empty;

            return (sql, explanation);
        }
        catch
        {
            return (raw, string.Empty);
        }
    }
}
