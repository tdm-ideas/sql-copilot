import { Component, signal } from '@angular/core';
import { ConnectComponent } from './components/connect/connect.component';
import { WorkspaceComponent } from './components/workspace/workspace.component';
import { ConnectionRequest, SchemaResponse } from './models/api.models';

export interface AppSession {
  connection: ConnectionRequest;
  schema: SchemaResponse;
}

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
  session = signal<AppSession | null>(null);
}
