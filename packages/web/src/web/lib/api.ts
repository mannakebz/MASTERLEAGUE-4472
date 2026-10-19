import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "../../api";
import { sessionToken } from "./auth";

const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`,
  fetch: (request, init) => {
    const controller = new AbortController();
    const original = init?.signal || request.signal;
    const abort = () => controller.abort();
    if (original?.aborted) abort();
    original?.addEventListener("abort", abort, { once: true });
    // Bound reads only. A timed-out write may still succeed on the server.
    const timer = request.method === "GET" ? setTimeout(abort, 20000) : undefined;
    return fetch(request, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timer);
      original?.removeEventListener("abort", abort);
    });
  },
  headers: () => {
    const token = sessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

/** Direct typed client: await client.ping() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.ping.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);
