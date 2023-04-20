type Env = {
}
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import * as HAR from 'har-format';


const app = new Hono<{ Bindings: Env, Variables: {

} }>()

let global
app.use('*', logger())

app.use('*', async (c, next) => {
    console.debug(`${c.req.headers.get('cf-connecting-ip')} [cf-connecting-ip]`)
    console.debug(`${c.req.headers.get('user-agent')} [user-agent]`)
    
    // c.header('cache-control', 'no-cache, no-store, private, no-transform, max-age=0, s-maxage=0')
    c.header('X-Robots-Tag', 'noindex, nofollow, notranslate, noarchive, noimageindex, nosnippet, nositelinkssearchbox, nocache, nopagereadaloud')
    c.header('Retry-After', '1')
    // c.header('Pragma', 'no-cache')
    // c.header('clear-site-data', '"cache", "storage"')

    const request: HAR.Request = {
        method: 'GET',
        url: 'https://example.com',
        httpVersion: 'HTTP/1.1',
        headers: [
          { name: 'User-Agent', value: 'Mozilla/5.0' },
          { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        ],
        queryString: [],
        headersSize: -1,
        bodySize: -1,
        cookies: [],
    };
      
    const response: HAR.Response = {
        status: 200,
        statusText: 'OK',
        httpVersion: 'HTTP/1.1',
        headers: [
            { name: 'Content-Type', value: 'text/html' },
            { name: 'Content-Length', value: '42' },
        ],
        content: {
            size: 42,
            mimeType: 'text/html',
            text: '<html><body>Hello, World!</body></html>',
        },
        headersSize: -1,
        bodySize: -1,
        cookies: [],
        redirectURL: '',
    };
      
    const har: HAR.Log = {
        version: '1.2',
            creator: {
            name: 'Node.js HAR Generator',
            version: '1.0.0',
        },
        entries: [
            {
                startedDateTime: new Date().toISOString(),
                time: 0,
                request,
                response,
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

    return c.json(har)
      

    await next()
})


app.get('/robots.txt', (c) => {
    c.header('clear-site-data', '"cache", "storage"')
    return c.text("User-agent: *\nDisallow: /\n")
})

app.get('/', async (c) => {
    // c.header('clear-site-data', '"cache", "storage"')
    const cf_xray = c.req.headers.get('cf-ray') ?? 'failed';

    return c.redirect(`https://www.ai.moda/?source=noisys3&cf_xray=${cf_xray}`, 307);
})

// app.use('*', async (c, next) => {
//     const auth = basicAuth({ username: c.env.USERNAME, password: c.env.PASSWORD })
//     return auth(c, next) // Older: `await auth(c, next)`
// })

export default app
// export default {
//     fetch: app.fetch,
//     async scheduled(_: ScheduledEvent, env: Env, ctx: ExecutionContext) {
//         // ctx.waitUntil(someFunction(env, ctx))
//     },
// }