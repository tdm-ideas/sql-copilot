export interface ConnectionRequest {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  trustServerCertificate?: boolean;
}

export interface TestConnectionResponse {
  connected: boolean;
  database: string;
  host: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

export interface SchemaResponse {
  tables: TableSchema[];
  schemaContext: string;
}

export interface GenerateRequest {
  connection: ConnectionRequest;
  userMessage: string;
  schemaContext: string;
}

export interface GenerateResponse {
  sql: string;
  explanation: string;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text?: string;
  sql?: string;
  explanation?: string;
  isThinking?: boolean;
}

export interface AppSession {
  connection: ConnectionRequest;
  schema: SchemaResponse;
}
