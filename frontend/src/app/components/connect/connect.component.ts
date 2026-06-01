import { Component, output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ConnectionRequest } from '../../models/api.models';
import { AppSession } from '../../app.component';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="card">
        <div class="header">
          <div class="logo">
            <span class="logo-icon">⚡</span>
            <span class="logo-text">SQL Copilot</span>
          </div>
          <p class="subtitle">Connect to your SQL Server database</p>
        </div>

        <form (ngSubmit)="connect()">
          <div class="row">
            <div class="field grow">
              <label>Host / Server</label>
              <input type="text" [(ngModel)]="host" name="host" placeholder="localhost" required />
            </div>
            <div class="field port">
              <label>Port</label>
              <input type="number" [(ngModel)]="port" name="port" required />
            </div>
          </div>

          <div class="field">
            <label>Database</label>
            <input type="text" [(ngModel)]="database" name="database" placeholder="master" required />
          </div>

          <div class="row">
            <div class="field grow">
              <label>Username</label>
              <input type="text" [(ngModel)]="username" name="username" placeholder="sa" required autocomplete="username" />
            </div>
            <div class="field grow">
              <label>Password</label>
              <input type="password" [(ngModel)]="password" name="password" required autocomplete="current-password" />
            </div>
          </div>

          <div class="checkbox-row">
            <input type="checkbox" id="tsc" [(ngModel)]="trustServerCertificate" name="tsc" />
            <label for="tsc">Trust server certificate</label>
          </div>

          @if (error()) {
            <div class="error">{{ error() }}</div>
          }

          <button type="submit" [disabled]="loading()">
            {{ loading() ? 'Connecting...' : 'Connect' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-base);
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 460px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 36px;
    }
    .header { margin-bottom: 28px; }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .logo-icon { font-size: 26px; }
    .logo-text { font-size: 22px; font-weight: 600; color: var(--text-heading); }
    .subtitle { color: var(--text-muted); font-size: 13px; }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    .field.grow { flex: 1; }
    .field.port { width: 88px; }
    .row { display: flex; gap: 12px; }

    label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }
    input[type=text], input[type=password], input[type=number] {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 9px 12px;
      color: var(--text-primary);
      outline: none;
      width: 100%;
      transition: border-color 0.15s;
    }
    input:focus { border-color: var(--accent); }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }
    .checkbox-row label {
      text-transform: none;
      letter-spacing: 0;
      font-size: 13px;
      color: var(--text-primary);
      cursor: pointer;
      font-weight: 400;
    }

    .error {
      background: var(--danger-bg);
      border: 1px solid rgba(248,81,73,0.3);
      border-radius: 6px;
      padding: 10px 12px;
      color: var(--danger);
      font-size: 13px;
      margin-bottom: 16px;
    }

    button[type=submit] {
      width: 100%;
      padding: 10px;
      background: var(--accent);
      border: none;
      border-radius: 6px;
      color: #0d1117;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.15s;
    }
    button[type=submit]:hover:not(:disabled) { background: var(--accent-hover); }
    button[type=submit]:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class ConnectComponent {
  connected = output<AppSession>();

  private api = inject(ApiService);

  host = '';
  port = 1433;
  database = '';
  username = '';
  password = '';
  trustServerCertificate = true;

  loading = signal(false);
  error = signal('');

  async connect() {
    if (this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    const connection: ConnectionRequest = {
      host: this.host,
      port: this.port,
      database: this.database,
      username: this.username,
      password: this.password,
      trustServerCertificate: this.trustServerCertificate
    };

    try {
      await firstValueFrom(this.api.testConnection(connection));
      const schema = await firstValueFrom(this.api.getSchema(connection));
      this.connected.emit({ connection, schema });
    } catch (err: any) {
      this.error.set(toUserMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}

function toUserMessage(err: any): string {
  if (err?.status === 0)
    return 'Cannot reach the server. Make sure Docker Compose is running (docker-compose up).';
  const body = err?.error;
  if (body?.detail) return body.detail;
  if (body?.error)  return body.error;
  return err?.message ?? 'Connection failed. Check your credentials and try again.';
}
