const ALLOWED_METHODS = new Set([
  "GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
]);

export default {
  async fetch(request) {
    if (!ALLOWED_METHODS.has(request.method)) {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const excludedHeaders = new Set([
      "content-encoding",
      "content-length",
      "transfer-encoding",
      "connection",
      "host"
    ]);

    const incomingUrl = new URL(request.url);
    const path = incomingUrl.pathname.replace(/^\/+/, "");
    const targetUrl = new URL(`https://mactimflash.github.io/tocbien/${path}${incomingUrl.search}`);

    const headers = new Headers();
    for (const [k, v] of request.headers.entries()) {
      if (!excludedHeaders.has(k.toLowerCase())) {
        headers.set(k, v);
      }
    }

    headers.set("x-proxied-by", "cloudflare-pages");

    const upstreamReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual"
    });

    let resp;
    try {
      resp = await fetch(upstreamReq);
    } catch (e) {
      return new Response(`Proxy error: ${e?.message || e}`, { status: 502 });
    }

    const outHeaders = new Headers();
    for (const [k, v] of resp.headers.entries()) {
      if (!excludedHeaders.has(k.toLowerCase())) {
        outHeaders.set(k, v);
      }
    }

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: outHeaders
    });
  }
};
