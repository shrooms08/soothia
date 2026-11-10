// Total Recall: Sui through Tatum's gRPC gateway, using only fetch so it can also
// run in a Worker. Tatum's Sui JSON-RPC URL returns 404. Its gRPC gateway accepts a
// gRPC-web request and returns valid message frames, but labels them
// application/grpc, which the SDK's default transport refuses. This transport reads
// those frames for unary calls, and SuiGrpcClient works unchanged on top of it.

import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  mergeRpcOptions,
  RpcError,
  UnaryCall,
  type ClientStreamingCall,
  type DuplexStreamingCall,
  type MethodInfo,
  type RpcMetadata,
  type RpcOptions,
  type RpcStatus,
  type RpcTransport,
  type ServerStreamingCall,
} from "@protobuf-ts/runtime-rpc";

export const TATUM_SUI_GRPC = "https://sui-mainnet-grpc.gateway.tatum.io";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RATE_LIMIT_RETRIES = 5;
const RATE_LIMIT_WAIT_MS = 500;
const TRAILER_FLAG = 0x80;
const COMPRESSED_FLAG = 0x01;

/** Wraps a message in the 5-byte gRPC frame header: flags, then big-endian length. */
export function encodeFrame(payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(5 + payload.length);
  new DataView(frame.buffer).setUint32(1, payload.length);
  frame.set(payload, 5);
  return frame;
}

/** The first data frame's payload, or null when the body holds no message. */
export function firstMessage(body: Uint8Array): Uint8Array | null {
  let offset = 0;
  while (offset + 5 <= body.length) {
    const flags = body[offset];
    const length = new DataView(body.buffer, body.byteOffset + offset + 1, 4).getUint32(0);
    const end = offset + 5 + length;
    if (end > body.length) throw new RpcError("tatum_grpc_truncated_frame", "INTERNAL");
    if ((flags & TRAILER_FLAG) === 0) {
      if (flags & COMPRESSED_FLAG) throw new RpcError("tatum_grpc_compressed_frame", "UNIMPLEMENTED");
      return body.slice(offset + 5, end);
    }
    offset = end;
  }
  return null;
}

type Fetcher = typeof fetch;

export class TatumGrpcTransport implements RpcTransport {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
  ) {}

  mergeOptions(options?: Partial<RpcOptions>): RpcOptions {
    return mergeRpcOptions({}, options);
  }

  private async call<I extends object, O extends object>(
    method: MethodInfo<I, O>,
    input: I,
    options: RpcOptions,
  ): Promise<O> {
    const body = encodeFrame(method.I.toBinary(input, options.binaryOptions));
    let response: Response;
    // A 429 means the gateway rejected the call unprocessed, so resending is safe.
    for (let attempt = 0; ; attempt++) {
      response = await this.fetcher(`${this.baseUrl}/${method.service.typeName}/${method.name}`, {
        method: "POST",
        headers: { "content-type": "application/grpc-web+proto", "x-grpc-web": "1", "x-api-key": this.apiKey },
        body,
        signal: options.abort ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS * (attempt + 1)));
    }
    if (!response.ok) throw new RpcError(`tatum_grpc_http_${response.status}`, "UNKNOWN");
    const status = response.headers.get("grpc-status");
    if (status && status !== "0") {
      const detail = decodeURIComponent(response.headers.get("grpc-message") ?? "").slice(0, 200);
      throw new RpcError(`tatum_grpc_status_${status}: ${detail}`, status);
    }
    const message = firstMessage(new Uint8Array(await response.arrayBuffer()));
    if (!message) throw new RpcError("tatum_grpc_empty_response", "UNKNOWN");
    return method.O.fromBinary(message, options.binaryOptions);
  }

  unary<I extends object, O extends object>(method: MethodInfo<I, O>, input: I, options: RpcOptions): UnaryCall<I, O> {
    const response = this.call(method, input, options);
    // Callers usually await only `response`; the others must not reject unhandled.
    const follow = <T>(value: T): Promise<T> => {
      const derived = response.then(() => value);
      derived.catch(() => undefined);
      return derived;
    };
    return new UnaryCall(
      method,
      options.meta ?? {},
      input,
      follow<RpcMetadata>({}),
      response,
      follow<RpcStatus>({ code: "OK", detail: "" }),
      follow<RpcMetadata>({}),
    );
  }

  serverStreaming<I extends object, O extends object>(): ServerStreamingCall<I, O> {
    throw new RpcError("tatum_grpc_streaming_unsupported", "UNIMPLEMENTED");
  }

  clientStreaming<I extends object, O extends object>(): ClientStreamingCall<I, O> {
    throw new RpcError("tatum_grpc_streaming_unsupported", "UNIMPLEMENTED");
  }

  duplex<I extends object, O extends object>(): DuplexStreamingCall<I, O> {
    throw new RpcError("tatum_grpc_streaming_unsupported", "UNIMPLEMENTED");
  }
}

export function tatumSuiClient(apiKey: string): SuiGrpcClient {
  return new SuiGrpcClient({ network: "mainnet", transport: new TatumGrpcTransport(TATUM_SUI_GRPC, apiKey) });
}
