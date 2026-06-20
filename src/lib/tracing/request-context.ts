import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(callback: () => T, requestId = randomUUID()) {
  return storage.run({ requestId }, callback);
}

export function getRequestId() {
  return storage.getStore()?.requestId;
}

export function requestIdHeaderName() {
  return "x-request-id";
}
