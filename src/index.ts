type Env = {};
import { Hono } from "hono";
import { logger } from "hono/logger";
import * as HAR from "har-format";
import { prettyJSON } from "hono/pretty-json";

const app = new Hono<{ Bindings: Env; Variables: {} }>();

let global;

app.use("*", prettyJSON()); // With options: prettyJSON({ space: 4 })
app.use("*", logger());

// c.header('Content-Security-Policy', "default-src 'none'; base-uri 'none'; sandbox allow-downloads; form-action 'none'; frame-ancestors 'none'; navigate-to 'none'; require-trusted-types-for 'script'")
// c.header('X-Robots-Tag', 'noindex, nofollow, notranslate, noarchive, noimageindex, nosnippet, nositelinkssearchbox, nocache, nopagereadaloud')
// c.header('cache-control', 'no-cache, no-store, private, no-transform, max-age=0, s-maxage=0')

app.use("*", async (c, next) => {
  console.debug(`${c.req.headers.get("cf-connecting-ip")} [cf-connecting-ip]`);
  console.debug(`${c.req.headers.get("user-agent")} [user-agent]`);

  c.header(
    "X-Forwarded-For",
    c.req.headers.get("cf-connecting-ip") ?? "failed"
  );

  const url = new URL(c.req.url);
  const [leftmostSubdomain] = url.hostname.split(".");
  // const upstreamHost = hexDecode(leftmostSubdomain);
  const upstreamHost = "moda.enterprise.corellium.com";

  const upstreamUrl = new URL(url.pathname, `https://${upstreamHost}`);
  upstreamUrl.search = url.search;
  console.debug(`${upstreamUrl.toString()} [upstreamUrl]`);

  const upstreamRequestHeaders = new Headers(c.req.headers);
  upstreamRequestHeaders.set("Host", upstreamHost);

  const arraybuffer_bod_req = await c.req.arrayBuffer();

  // Forward the request to the upstream host
  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: c.req.method,
    headers: upstreamRequestHeaders,
    body:
      c.req.method === "POST" ||
      c.req.method === "PUT" ||
      c.req.method === "PATCH"
        ? arraybuffer_bod_req
        : undefined,
  });

  const cleaned_res_headers = new Headers(upstreamResponse.headers);
  cleaned_res_headers.delete('cf-cache-status');
  cleaned_res_headers.delete('cf-ray');
  cleaned_res_headers.delete('server');

  // Copy the upstream response headers and status
  const responseHeaders: HAR.Header[] = [];
  cleaned_res_headers.forEach((value, name) => {
    c.header(name, value);
    responseHeaders.push({ name, value });
  });

  // Send the upstream response body back to the client
  const responseBody = await upstreamResponse.text();
  // c.body = responseBody;

  // clone headers
  const cleaned_req_headers = new Headers(c.req.headers);
  cleaned_req_headers.delete('cf-access-jwt-assertion');
  cleaned_req_headers.delete('cookie');
  cleaned_req_headers.delete('cf-ray');
  cleaned_req_headers.delete('cf-connecting-ip');
  cleaned_req_headers.delete('cf-ipcountry');
  cleaned_req_headers.delete('x-real-ip');
  cleaned_req_headers.delete('cf-ew-preview-server');
  cleaned_req_headers.delete('cf-visitor');
  cleaned_req_headers.delete('x-forwarded-proto');

  cleaned_req_headers.set('host', upstreamHost);

  const har: HAR.Log = {
    version: "1.2",
    creator: {
      name: "HAR Generator",
      version: "1.0.0",
    },
    entries: [
      {
        startedDateTime: new Date().toISOString(),
        time: 0,
        request: {
          method: c.req.method,
          url: upstreamUrl.toString(),
          httpVersion: "HTTP/1.1",
          headers: Array.from(cleaned_req_headers).map(([name, value]) => ({
            name,
            value,
          })),
          queryString: Array.from(url.searchParams).map(([name, value]) => ({
            name,
            value,
          })),
          headersSize: -1,
          bodySize: -1,
          cookies: [], // You can fill this in if needed
          postData:
            c.req.method === "POST" ||
            c.req.method === "PUT" ||
            c.req.method === "PATCH"
              ? {
                  mimeType: c.req.headers.get("content-type") || "",
                  text: new TextDecoder().decode(arraybuffer_bod_req),
                }
              : undefined,
        },
        response: {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          httpVersion: "HTTP/1.1",
          headers: responseHeaders,
          content: {
            size: responseBody.length,
            mimeType: upstreamResponse.headers.get("content-type") || "",
            text: responseBody,
          },
          headersSize: -1,
          bodySize: -1,
          cookies: [], // You can fill this in if needed
          redirectURL: "",
        },
        cache: {},
        timings: {
          blocked: -1,
          dns: -1,
          connect: -1,
          send: 0,
          wait: 0,
          receive: 0,
          ssl: -1,
        },
      },
    ],
  };

  // const postData: HAR.PostData = {
  //     mimeType: 'application/json',
  //     text: JSON.stringify({
  //         key: 'value',
  //     }),
  // };

  // const request: HAR.Request = {
  //     method: 'GET',
  //     url: 'https://example.com',
  //     httpVersion: 'HTTP/1.1',
  //     headers: [
  //       { name: 'User-Agent', value: 'Mozilla/5.0' },
  //       { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
  //     ],
  //     queryString: [],
  //     headersSize: -1,
  //     bodySize: -1,
  //     cookies: [],
  //     postData: postData
  // };

  // const response: HAR.Response = {
  //     status: 200,
  //     statusText: 'OK',
  //     httpVersion: 'HTTP/1.1',
  //     headers: [
  //         { name: 'Content-Type', value: 'text/html' },
  //         { name: 'Content-Length', value: '42' },
  //     ],
  //     content: {
  //         size: 42,
  //         mimeType: 'text/html',
  //         text: '<html><body>Hello, World!</body></html>',
  //     },
  //     headersSize: -1,
  //     bodySize: -1,
  //     cookies: [],
  //     redirectURL: '',
  // };

  // const har: HAR.Log = {
  //     version: '1.2',
  //         creator: {
  //         name: 'Node.js HAR Generator',
  //         version: '1.0.0',
  //     },
  //     entries: [
  //         {
  //             startedDateTime: new Date().toISOString(),
  //             time: 0,
  //             request,
  //             response,
  //             cache: {},
  //             timings: {
  //                 blocked: -1,
  //                 dns: -1,
  //                 connect: -1,
  //                 send: 0,
  //                 wait: 0,
  //                 receive: 0,
  //                 ssl: -1,
  //             },
  //         },
  //     ],
  // };

  return c.json(har);

  await next();
});

app.get("/robots.txt", (c) => {
  c.header("clear-site-data", '"cache", "storage"');
  return c.text("User-agent: *\nDisallow: /\n");
});

app.get("/", async (c) => {
  // c.header('clear-site-data', '"cache", "storage"')
  const cf_xray = c.req.headers.get("cf-ray") ?? "failed";

  return c.redirect(
    `https://www.ai.moda/?source=noisys3&cf_xray=${cf_xray}`,
    307
  );
});

// app.use('*', async (c, next) => {
//     const auth = basicAuth({ username: c.env.USERNAME, password: c.env.PASSWORD })
//     return auth(c, next) // Older: `await auth(c, next)`
// })

export default app;
// export default {
//     fetch: app.fetch,
//     async scheduled(_: ScheduledEvent, env: Env, ctx: ExecutionContext) {
//         // ctx.waitUntil(someFunction(env, ctx))
//     },
// }
