namespace SqlCopilot.API.Models;

public record ConnectionRequest(
    string Host,
    int Port,
    string Database,
    string Username,
    string Password,
    bool TrustServerCertificate = true)
{
    public string ToConnectionString() =>
        $"Server={Host},{Port};Database={Database};User Id={Username};Password={Password};" +
        $"TrustServerCertificate={TrustServerCertificate};Connect Timeout=10;";
}

public record SchemaRequest(ConnectionRequest Connection);

public record GenerateRequest(
    ConnectionRequest Connection,
    string UserMessage,
    string SchemaContext);

public record TableColumn(
    string TABLE_NAME,
    string COLUMN_NAME,
    string DATA_TYPE,
    int CHARACTER_MAXIMUM_LENGTH,
    string IS_NULLABLE,
    string COLUMN_DEFAULT);

public record TableSchema(
    string TableName,
    List<ColumnInfo> Columns);

public record ColumnInfo(
    string Name,
    string DataType,
    bool IsNullable,
    string? DefaultValue);

public record GenerateResponse(
    string Sql,
    string Explanation,
    string Model);

public record OllamaRequest(
    string Model,
    string Prompt,
    bool Stream = false);

public record OllamaResponse(
    string Response,
    bool Done);
