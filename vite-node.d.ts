declare interface Buffer extends Uint8Array {
  indexOf(value: string | Buffer, byteOffset?: number): number;
  subarray(start?: number, end?: number): Buffer;
  toString(encoding?: string): string;
}

declare const Buffer: {
  from(value: string): Buffer;
  concat(chunks: Buffer[]): Buffer;
};

declare module "node:fs/promises" {
  export function access(path: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function readdir(path: string): Promise<string[]>;
  export function writeFile(path: string, data: Buffer, options?: { flag?: string }): Promise<void>;
}

declare module "node:http" {
  export type IncomingMessage = {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    on(event: "data", callback: (chunk: Buffer) => void): void;
    on(event: "end", callback: () => void): void;
    on(event: "error", callback: (error: Error) => void): void;
    destroy(): void;
  };

  export type ServerResponse = {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(value?: string): void;
  };
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
}
