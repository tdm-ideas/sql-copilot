import { Component, input, output, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ChatMessage } from '../../models/api.models';
import { AppSession } from '../../app.component';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="layout">

      <header class="topbar">
        <div class="brand">
          <span class="brand-icon">⚡</span>
          <span class="brand-name">SQL Copilot</span>
        </div>
        <div class="conn-badge">
          <span class="conn-db">{{ session().connection.database }}</span>
          <span class="sep">@</span>
          <span class="conn-host">{{ session().connection.host }}:{{ session().connection.port }}</span>
        </div>
        <button class="btn-disconnect" (click)="disconnect.emit()">Disconnect</button>
      </header>

      <div class="body">

        <aside class="sidebar">
          <div class="sidebar-title">
            <span>Schema</span>
            <span class="badge">{{ session().schema.tables.length }}</span>
          </div>
          <div class="tree">
            @for (table of session().schema.tables; track table.tableName) {
              <div class="table-node">
                <div class="table-row" (click)="toggleTable(table.tableName)">
                  <span class="arrow" [class.open]="expanded().has(table.tableName)">▶</span>
                  <span class="tname">{{ table.tableName }}</span>
                </div>
                @if (expanded().has(table.tableName)) {
                  <div class="cols">
                    @for (col of table.columns; track col.name) {
                      <div class="col-row">
                        <span class="cname">{{ col.name }}</span>
                        <span class="ctype">{{ col.dataType }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </aside>

        <main class="chat-panel">
          <div class="messages" #scrollAnchor>
            @if (messages().length === 0) {
              <div class="empty">
                <div class="empty-icon">💬</div>
                <div class="empty-title">Ask anything about your data</div>
                <div class="empty-hint">Try: "Show me the top 10 records from Orders this month"</div>
              </div>
            }

            @for (msg of messages(); track $index) {
              @if (msg.role === 'user') {
                <div class="msg user-msg">
                  <div class="bubble">{{ msg.text }}</div>
                </div>
              } @else {
                <div class="msg ai-msg">
                  @if (msg.isThinking) {
                    <div class="thinking">
                      <span class="dot"></span>
                      <span class="dot"></span>
                      <span class="dot"></span>
                    </div>
                  } @else {
                    @if (msg.sql) {
                      <div class="sql-block">
                        <div class="sql-header">
                          <span>SQL</span>
                          <button class="copy-btn" (click)="copySql(msg.sql!)">
                            {{ copied() === msg.sql ? 'Copied!' : 'Copy' }}
                          </button>
                        </div>
                        <pre class="sql-pre">{{ msg.sql }}</pre>
                      </div>
                    }
                    @if (msg.explanation) {
                      <p class="explanation">{{ msg.explanation }}</p>
                    }
                    @if (msg.text) {
                      <p class="ai-text">{{ msg.text }}</p>
                    }
                  }
                </div>
              }
            }
            <div #messagesEnd></div>
          </div>

          <div class="input-row">
            <textarea
              [(ngModel)]="inputText"
              (keydown)="onKeydown($event)"
              [disabled]="generating()"
              placeholder="Ask a question about your data... (Enter to send, Shift+Enter for newline)"
              rows="2"
            ></textarea>
            <button class="send-btn" (click)="send()" [disabled]="generating() || !inputText.trim()">
              Send
            </button>
          </div>
        </main>

      </div>
    </div>
  `,
  styles: [`
    .layout {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Top bar ── */
    .topbar {
      display: flex;
      align-items: center;
      gap: 16px;
      height: 52px;
      padding: 0 20px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .brand { display: flex; align-items: center; gap: 8px; }
    .brand-icon { font-size: 18px; }
    .brand-name { font-weight: 600; color: var(--text-heading); }
    .conn-badge { display: flex; align-items: center; gap: 4px; font-size: 13px; }
    .conn-db { color: var(--accent); font-weight: 500; }
    .sep { color: var(--text-muted); }
    .conn-host { color: var(--text-muted); }
    .btn-disconnect {
      margin-left: auto;
      padding: 5px 12px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 5px;
      color: var(--text-muted);
      font-size: 13px;
      transition: all 0.15s;
    }
    .btn-disconnect:hover { border-color: var(--danger); color: var(--danger); }

    /* ── Body ── */
    .body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 256px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border-right: 1px solid var(--border);
      overflow: hidden;
    }
    .sidebar-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .badge {
      background: var(--bg-elevated);
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 11px;
    }
    .tree {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0;
    }
    .table-row {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 6px 16px;
      cursor: pointer;
      user-select: none;
    }
    .table-row:hover { background: var(--bg-elevated); }
    .arrow {
      font-size: 8px;
      color: var(--text-muted);
      transition: transform 0.15s;
      display: inline-block;
      width: 10px;
    }
    .arrow.open { transform: rotate(90deg); }
    .tname { font-size: 13px; color: var(--text-primary); font-weight: 500; }
    .cols { padding-left: 33px; }
    .col-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 16px 2px 0;
    }
    .cname { font-size: 12px; color: var(--text-muted); }
    .ctype { font-size: 11px; color: var(--text-muted); opacity: 0.55; font-family: monospace; }

    /* ── Chat ── */
    .chat-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 28px 36px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-align: center;
      color: var(--text-muted);
    }
    .empty-icon { font-size: 44px; opacity: 0.35; }
    .empty-title { font-size: 16px; color: var(--text-primary); }
    .empty-hint { font-size: 13px; }

    .msg { display: flex; }
    .user-msg { justify-content: flex-end; }
    .bubble {
      max-width: 68%;
      background: var(--accent);
      color: #0d1117;
      padding: 10px 14px;
      border-radius: 14px 14px 3px 14px;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .ai-msg {
      flex-direction: column;
      gap: 10px;
      max-width: 88%;
    }
    .thinking {
      display: flex;
      gap: 5px;
      padding: 12px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 14px 14px 14px 3px;
      width: fit-content;
    }
    .dot {
      width: 7px;
      height: 7px;
      background: var(--text-muted);
      border-radius: 50%;
      animation: pulse 1.2s infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse {
      0%, 60%, 100% { opacity: 0.25; }
      30% { opacity: 1; }
    }

    .sql-block {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .sql-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 14px;
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }
    .copy-btn {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-muted);
      padding: 2px 8px;
      font-size: 11px;
      transition: all 0.15s;
    }
    .copy-btn:hover { border-color: var(--accent); color: var(--accent); }

    .sql-pre {
      padding: 14px;
      margin: 0;
      font-size: 13px;
      line-height: 1.65;
      color: #e6edf3;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .explanation, .ai-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* ── Input ── */
    .input-row {
      padding: 16px 36px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      align-items: flex-end;
      background: var(--bg-base);
    }
    textarea {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-primary);
      resize: none;
      outline: none;
      transition: border-color 0.15s;
      line-height: 1.5;
    }
    textarea:focus { border-color: var(--accent); }
    textarea::placeholder { color: var(--text-muted); }
    textarea:disabled { opacity: 0.5; }
    .send-btn {
      height: 42px;
      padding: 0 20px;
      background: var(--accent);
      border: none;
      border-radius: 7px;
      color: #0d1117;
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .send-btn:hover:not(:disabled) { background: var(--accent-hover); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class WorkspaceComponent {
  session = input.required<AppSession>();
  disconnect = output<void>();

  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

  private api = inject(ApiService);

  expanded  = signal<Set<string>>(new Set());
  messages  = signal<ChatMessage[]>([]);
  generating = signal(false);
  copied    = signal('');
  inputText = '';

  toggleTable(name: string) {
    const s = new Set(this.expanded());
    s.has(name) ? s.delete(name) : s.add(name);
    this.expanded.set(s);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  async send() {
    const text = this.inputText.trim();
    if (!text || this.generating()) return;

    const { connection, schema } = this.session();
    this.inputText = '';
    this.messages.update(m => [...m, { role: 'user', text }]);
    this.messages.update(m => [...m, { role: 'assistant', isThinking: true }]);
    this.generating.set(true);
    this.scrollToBottom();

    try {
      const result = await firstValueFrom(
        this.api.generateQuery({ connection, userMessage: text, schemaContext: schema.schemaContext })
      );
      this.messages.update(m => [
        ...m.slice(0, -1),
        { role: 'assistant', sql: result.sql, explanation: result.explanation }
      ]);
    } catch (err: any) {
      const msg = err?.error?.message ?? err?.message ?? 'Failed to generate query.';
      this.messages.update(m => [
        ...m.slice(0, -1),
        { role: 'assistant', text: `Error: ${msg}` }
      ]);
    } finally {
      this.generating.set(false);
      this.scrollToBottom();
    }
  }

  async copySql(sql: string) {
    try {
      await navigator.clipboard.writeText(sql);
      this.copied.set(sql);
      setTimeout(() => this.copied.set(''), 1500);
    } catch { /* clipboard unavailable */ }
  }

  private scrollToBottom() {
    setTimeout(() => this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }), 50);
  }
}
