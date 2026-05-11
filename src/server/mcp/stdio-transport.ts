// [META] since:2026-05-11 | owner:server-team | stable:false
// [WHY] Own the MCP stdio transport seam so blank-line noise is filtered and malformed frames fail explicitly

import process from 'node:process';
import { StringDecoder } from 'node:string_decoder';
import type { Readable, Writable } from 'node:stream';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  ErrorCode,
  JSONRPCMessageSchema,
  JSONRPC_VERSION,
  type JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js';

function serializeFrame(message: unknown): string {
  return `${JSON.stringify(message)}\n`;
}

function buildParseErrorFrame(line: string, error: Error): Record<string, unknown> {
  return {
    jsonrpc: JSONRPC_VERSION,
    id: null,
    error: {
      code: ErrorCode.ParseError,
      message: 'Parse error',
      data: {
        reason: error.message,
        line,
      },
    },
  };
}

export class CodeMapStdioServerTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T) => void;

  private readonly decoder = new StringDecoder('utf8');
  private bufferedText = '';
  private started = false;

  constructor(
    private readonly stdin: Readable = process.stdin,
    private readonly stdout: Writable = process.stdout,
  ) {}

  private readonly onData = (chunk: Buffer | string): void => {
    this.bufferedText += typeof chunk === 'string' ? chunk : this.decoder.write(chunk);
    this.processBufferedLines();
  };

  private readonly onInputError = (error: Error): void => {
    this.onerror?.(error);
  };

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('CodeMapStdioServerTransport already started.');
    }

    this.started = true;
    this.stdin.on('data', this.onData);
    this.stdin.on('error', this.onInputError);
  }

  async close(): Promise<void> {
    this.stdin.off('data', this.onData);
    this.stdin.off('error', this.onInputError);

    if (this.stdin.listenerCount('data') === 0) {
      this.stdin.pause();
    }

    this.bufferedText = '';
    this.decoder.end();
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    await this.writeFrame(message);
  }

  private processBufferedLines(): void {
    while (true) {
      const newlineIndex = this.bufferedText.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const rawLine = this.bufferedText.slice(0, newlineIndex);
      this.bufferedText = this.bufferedText.slice(newlineIndex + 1);
      void this.processLine(rawLine);
    }
  }

  private async processLine(rawLine: string): Promise<void> {
    const normalizedLine = rawLine.replace(/\r$/, '');
    if (normalizedLine.trim().length === 0) {
      return;
    }

    try {
      const parsed = JSON.parse(normalizedLine);
      const message = JSONRPCMessageSchema.parse(parsed);
      this.onmessage?.(message);
    } catch (error) {
      const parseError = error instanceof Error ? error : new Error(String(error));
      this.onerror?.(parseError);
      await this.writeFrame(buildParseErrorFrame(normalizedLine, parseError));
    }
  }

  private writeFrame(message: unknown): Promise<void> {
    return new Promise((resolve) => {
      if (this.stdout.write(serializeFrame(message))) {
        resolve();
        return;
      }

      this.stdout.once('drain', resolve);
    });
  }
}
