/**
 * SSE Connection Manager
 *
 * Manages Server-Sent Events connections per user/tab.
 * Ensures only 1 active connection per user per tab.
 */

import { Types } from "mongoose";

export interface SSEClient {
  id: string;
  employeeId: string;
  tabId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  createdAt: number;
}

type SSEMessage = {
  event: string;
  data: string;
};

export class SSEConnectionManager {
  private clients: Map<string, SSEClient> = new Map();
  private employeeClients: Map<string, Set<string>> = new Map();

  private generateConnectionId(employeeId: string, tabId: string): string {
    return `${employeeId}:${tabId}`;
  }

  register(
    employeeId: string,
    tabId: string,
    controller: ReadableStreamDefaultController<Uint8Array>
  ): string {
    const connectionId = this.generateConnectionId(employeeId, tabId);

    const existingClient = this.clients.get(connectionId);
    if (existingClient) {
      this.unregister(connectionId);
    }

    const client: SSEClient = {
      id: connectionId,
      employeeId,
      tabId,
      controller,
      createdAt: Date.now(),
    };

    this.clients.set(connectionId, client);

    if (!this.employeeClients.has(employeeId)) {
      this.employeeClients.set(employeeId, new Set());
    }
    this.employeeClients.get(employeeId)!.add(connectionId);

    console.log(`[SSE] Client connected: ${connectionId}. Total: ${this.clients.size}`);

    return connectionId;
  }

  unregister(connectionId: string): void {
    const client = this.clients.get(connectionId);
    if (!client) return;

    try {
      client.controller.close();
    } catch {
      // Controller already closed
    }

    this.clients.delete(connectionId);

    const employeeSet = this.employeeClients.get(client.employeeId);
    if (employeeSet) {
      employeeSet.delete(connectionId);
      if (employeeSet.size === 0) {
        this.employeeClients.delete(client.employeeId);
      }
    }

    console.log(`[SSE] Client disconnected: ${connectionId}. Total: ${this.clients.size}`);
  }

  unregisterByEmployee(employeeId: string): void {
    const connectionIds = this.employeeClients.get(employeeId) || new Set();
    for (const connId of connectionIds) {
      this.unregister(connId);
    }
  }

  send(connectionId: string, message: SSEMessage): boolean {
    const client = this.clients.get(connectionId);
    if (!client) return false;

    try {
      const encoder = new TextEncoder();
      const data = `event: ${message.event}\ndata: ${message.data}\n\n`;
      client.controller.enqueue(encoder.encode(data));
      return true;
    } catch {
      this.unregister(connectionId);
      return false;
    }
  }

  broadcastToEmployee(employeeId: string, message: SSEMessage): number {
    const connectionIds = this.employeeClients.get(employeeId) || new Set();
    let successCount = 0;

    for (const connId of connectionIds) {
      if (this.send(connId, message)) {
        successCount++;
      }
    }

    return successCount;
  }

  broadcast(message: SSEMessage): number {
    let successCount = 0;
    const encoder = new TextEncoder();
    const data = `event: ${message.event}\ndata: ${message.data}\n\n`;
    const encoded = encoder.encode(data);

    for (const [connId, client] of this.clients) {
      try {
        client.controller.enqueue(encoded);
        successCount++;
      } catch {
        this.unregister(connId);
      }
    }

    return successCount;
  }

  heartbeat(): void {
    this.broadcast({ event: "heartbeat", data: JSON.stringify({ time: Date.now() }) });
  }

  getConnectionCount(): number {
    return this.clients.size;
  }

  getEmployeeConnectionCount(employeeId: string): number {
    return this.employeeClients.get(employeeId)?.size || 0;
  }

  isConnected(employeeId: string, tabId: string): boolean {
    const connectionId = this.generateConnectionId(employeeId, tabId);
    return this.clients.has(connectionId);
  }

  getClient(connectionId: string): SSEClient | undefined {
    return this.clients.get(connectionId);
  }
}

export const sseManager = new SSEConnectionManager();

// Periodic heartbeat to keep connections alive (only in non-test environment)
const HEARTBEAT_INTERVAL = 30000;

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat(): void {
  if (heartbeatInterval === null && typeof setInterval !== "undefined") {
    heartbeatInterval = setInterval(() => {
      sseManager.heartbeat();
    }, HEARTBEAT_INTERVAL);
  }
}

export function stopHeartbeat(): void {
  if (heartbeatInterval !== null) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
