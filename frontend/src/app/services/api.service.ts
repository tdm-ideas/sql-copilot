import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ConnectionRequest, TestConnectionResponse,
  SchemaResponse, GenerateRequest, GenerateResponse
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  testConnection(req: ConnectionRequest): Observable<TestConnectionResponse> {
    return this.http.post<TestConnectionResponse>(`${this.base}/api/connection/test`, req);
  }

  getSchema(req: ConnectionRequest): Observable<SchemaResponse> {
    return this.http.post<SchemaResponse>(`${this.base}/api/schema`, { connection: req });
  }

  generateQuery(req: GenerateRequest): Observable<GenerateResponse> {
    return this.http.post<GenerateResponse>(`${this.base}/api/query/generate`, req);
  }
}
