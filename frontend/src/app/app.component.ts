import { Component, signal, effect } from '@angular/core';
import { ConnectComponent } from './components/connect/connect.component';
import { WorkspaceComponent } from './components/workspace/workspace.component';
import { ConnectionRequest, SchemaResponse } from './models/api.models';

export interface AppSession {
  connection: ConnectionRequest;
  schema: SchemaResponse;
}

const SESSION_KEY = 'sql-copilot-session';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ConnectComponent, WorkspaceComponent],
  template: `
    @if (session()) {
      <app-workspace [session]="session()!" (disconnect)="session.set(null)" />
    } @else {
      <app-connect (connected)="session.set($event)" />
    }
  `
})
export class AppComponent {
  session = signal<AppSession | null>(loadSession());

  constructor() {
    effect(() => {
      const s = this.session();
      if (s) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    });
  }
}

function loadSession(): AppSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
