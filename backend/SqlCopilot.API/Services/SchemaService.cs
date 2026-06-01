using Dapper;
using Microsoft.Data.SqlClient;
using SqlCopilot.API.Models;

namespace SqlCopilot.API.Services;

public class SchemaService
{
    private const string SchemaQuery = """
        SELECT 
            c.TABLE_NAME,
            c.COLUMN_NAME,
            c.DATA_TYPE,
            ISNULL(c.CHARACTER_MAXIMUM_LENGTH, 0) AS CHARACTER_MAXIMUM_LENGTH,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS c
        INNER JOIN INFORMATION_SCHEMA.TABLES t
            ON c.TABLE_NAME = t.TABLE_NAME AND c.TABLE_SCHEMA = t.TABLE_SCHEMA
        WHERE t.TABLE_TYPE = 'BASE TABLE'
          AND c.TABLE_SCHEMA = 'dbo'
        ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
        """;

    public async Task TestConnectionAsync(string connectionString)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
    }

    public async Task<List<TableSchema>> GetSchemaAsync(string connectionString)
    {
        await using var conn = new SqlConnection(connectionString);
        var columns = (await conn.QueryAsync<TableColumn>(SchemaQuery)).ToList();

        return columns
            .GroupBy(c => c.TABLE_NAME)
            .Select(g => new TableSchema(
                g.Key,
                g.Select(c => new ColumnInfo(
                    c.COLUMN_NAME,
                    FormatDataType(c.DATA_TYPE, c.CHARACTER_MAXIMUM_LENGTH),
                    c.IS_NULLABLE == "YES",
                    c.COLUMN_DEFAULT)).ToList()))
            .ToList();
    }

    public string BuildSchemaContext(List<TableSchema> tables) =>
        string.Join("\n", tables.Select(t =>
            $"{t.TableName} ({string.Join(", ", t.Columns.Select(c => $"{c.Name} {c.DataType}"))})"));

    private static string FormatDataType(string type, int maxLen) =>
        (type.ToUpper(), maxLen) switch
        {
            ("VARCHAR" or "NVARCHAR" or "CHAR" or "NCHAR", -1) => $"{type.ToUpper()}(MAX)",
            ("VARCHAR" or "NVARCHAR" or "CHAR" or "NCHAR", > 0) => $"{type.ToUpper()}({maxLen})",
            _ => type.ToUpper()
        };
}
