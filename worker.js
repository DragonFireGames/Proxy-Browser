
export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "*",
      "Access-Control-Max-Age": "86400"
    };

    // ============================================================
    // CORS PREFLIGHT
    // ============================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // ============================================================
    // 1. GET AND DECODE TARGET URL
    // ============================================================

    const url = new URL(request.url);

    let targetUrl = url.searchParams.get("url");
    const base64Param = url.searchParams.get("base64_url");

    if (!targetUrl && base64Param) {
      try {
        // Undo URL-safe Base64 replacements
        let normalizedBase64 = base64Param
          .replace(/-/g, "+")
          .replace(/_/g, "/");

        // Restore Base64 padding
        while (normalizedBase64.length % 4) {
          normalizedBase64 += "=";
        }

        // Decode Base64
        const decodedBinary = atob(normalizedBase64);

        // Safely decode UTF-8
        const bytes = Uint8Array.from(
          decodedBinary,
          c => c.charCodeAt(0)
        );

        targetUrl = new TextDecoder().decode(bytes);

      } catch (e) {
        return new Response(
          "Invalid base64 encoding",
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }
    }

    if (!targetUrl) {
      return new Response(
        "Missing url or base64_url parameter",
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // ============================================================
    // 2. VALIDATE TARGET URL
    // ============================================================

    let target;

    try {
      target = new URL(targetUrl);

      if (
        target.protocol !== "http:" &&
        target.protocol !== "https:"
      ) {
        return new Response(
          "Invalid target protocol",
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

    } catch (e) {
      return new Response(
        "Invalid target URL",
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // ============================================================
    // 3. CLONE INCOMING REQUEST HEADERS
    // ============================================================

    const newHeaders = new Headers(request.headers);

    // ============================================================
    // 4. REMOVE HEADERS THAT SHOULD NOT BE FORWARDED
    // ============================================================

    [
      "host",
      "origin",

      // Cloudflare
      "cf-connecting-ip",
      "cf-ray",
      "cf-visitor",
      "cf-ipcountry",
      "cf-worker",

      // Proxy headers
      "x-forwarded-for",
      "x-forwarded-proto",
      "x-real-ip"
    ].forEach(header => {
      newHeaders.delete(header);
    });

    // ============================================================
    // 5. FORCE A REALISTIC USER-AGENT IF MISSING
    // ============================================================

    if (!newHeaders.has("user-agent")) {
      newHeaders.set(
        "user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/141.0.0.0 Safari/537.36"
      );
    }

    // ============================================================
    // 6. WEBSOCKET INTERCEPTION
    // ============================================================

    const isWebSocket =
      request.headers.get("Upgrade")?.toLowerCase() ===
      "websocket";

    if (isWebSocket) {
      try {
        /*
         * Cloudflare handles the WebSocket tunnel when the
         * Upgrade request is forwarded through fetch().
         */

        return await fetch(target.toString(), {
          method: request.method,
          headers: newHeaders
        });

      } catch (err) {
        return new Response(
          `WebSocket Proxy Error: ${err.message}`,
          {
            status: 502,
            headers: corsHeaders
          }
        );
      }
    }

    // ============================================================
    // 7. NORMAL HTTP REQUEST
    // ============================================================

    const init = {
      method: request.method,
      headers: newHeaders,
      redirect: "follow"
    };

    // Forward POST/PUT/PATCH/DELETE bodies
    if (
      request.method !== "GET" &&
      request.method !== "HEAD"
    ) {
      init.body = await request.arrayBuffer();
    }

    // ============================================================
    // 8. FETCH TARGET
    // ============================================================

    let response;

    try {
      response = await fetch(target.toString(), init);

    } catch (err) {
      return new Response(
        `Proxy Error: ${err.message}`,
        {
          status: 502,
          headers: corsHeaders
        }
      );
    }

    // ============================================================
    // 9. COPY RESPONSE HEADERS
    //    BUT REMOVE UPSTREAM CORS HEADERS
    // ============================================================

    const responseHeaders = new Headers();

    for (const [key, value] of response.headers) {
      const lower = key.toLowerCase();

      if (
        lower === "access-control-allow-origin" ||
        lower === "access-control-allow-credentials" ||
        lower === "access-control-allow-methods" ||
        lower === "access-control-allow-headers" ||
        lower === "access-control-expose-headers" ||
        lower === "access-control-max-age"
      ) {
        continue;
      }

      responseHeaders.set(key, value);
    }

    // ============================================================
    // 10. ADD OUR OWN CORS HEADERS
    // ============================================================

    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    // ============================================================
    // 11. RETURN ORIGINAL RESPONSE
    // ============================================================

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }
};