
const http = require('http');

const PORT = process.env.PORT || 9090;
const TITLE = 'OIDC Explorer';
const CONFIG = {
  TOKEN_URL: process.env.TOKEN_URL || process.env.KEYCLOAK_TOKEN_URL || '',
  CLIENT_ID: process.env.CLIENT_ID || '',
  CLIENT_SECRET: process.env.CLIENT_SECRET || '',
  REDIRECT_URI: process.env.REDIRECT_URI || `http://localhost:${PORT}/callback`,
};

const htmlPage = (title, body) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>🔐 ${title}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
  <style>
    pre { white-space: pre-wrap; word-break: break-word; max-height: 60vh; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .app-footer a { color: inherit; }
  </style>
</head>
<body class="d-flex flex-column min-vh-100">
  <nav class="navbar navbar-dark bg-dark mb-3">
    <div class="container-fluid">
      <span class="navbar-brand">🔐 ${title}</span>
    </div>
  </nav>
  <main class="flex-grow-1">${body}</main>
  <footer class="app-footer mt-4 py-3 bg-light border-top small text-muted text-center">
    Built by <a href="https://github.com/steveswinsburg" target="_blank" rel="noopener noreferrer">steveswinsburg</a>
  </footer>
</body>
</html>`;

const respondJson = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/healthz') {
    return respondJson(res, 200, { ok: true });
  }

  if (url.pathname === '/callback') {
    // Collect query params (e.g., code, state, error, error_description, iss)
    const params = Object.fromEntries(url.searchParams.entries());

    // Log to console for quick capture
    console.log('[keycloak-verifier] /callback params:', params);

    // Attempt token exchange if configured and a code is present
    const shouldExchange = !!(params.code && CONFIG.TOKEN_URL && CONFIG.CLIENT_ID);
    const exchangePromise = shouldExchange
      ? (async () => {
          try {
            const form = new URLSearchParams({
              grant_type: 'authorization_code',
              code: params.code,
              client_id: CONFIG.CLIENT_ID,
              redirect_uri: CONFIG.REDIRECT_URI,
            });
            if (CONFIG.CLIENT_SECRET) form.append('client_secret', CONFIG.CLIENT_SECRET);

            const resp = await fetch(CONFIG.TOKEN_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
              },
              body: form.toString(),
            });

            const text = await resp.text();
            let json;
            try { json = JSON.parse(text); } catch (_) { json = { raw: text }; }

            return { ok: resp.ok, status: resp.status, data: json };
          } catch (e) {
            return { ok: false, status: 0, error: String(e) };
          }
        })()
      : Promise.resolve(null);

    return exchangePromise.then((exchange) => {
      const exchangeSection = (() => {
        if (!params.code) {
          return `<div class="alert alert-info">No <code>code</code> found in query; skipping token exchange.</div>`;
        }
        if (!CONFIG.TOKEN_URL || !CONFIG.CLIENT_ID) {
          return `<div class="alert alert-warning">Token exchange disabled. Set <code>TOKEN_URL</code> and <code>CLIENT_ID</code> (and optionally <code>CLIENT_SECRET</code>, <code>REDIRECT_URI</code>).</div>`;
        }
        if (!exchange) return '';
        if (exchange.error) {
          return `<div class="alert alert-danger"><strong>Exchange Error:</strong> ${exchange.error}</div>`;
        }
        const summary = `Status: ${exchange.status}, OK: ${exchange.ok}`;
        const payload = JSON.stringify(exchange.data, null, 2);
        return `
          <div class="mb-2"><span class="text-muted">Exchange:</span> <code>${summary}</code></div>
          <label class="form-label">Token Response</label>
          <pre class="bg-body-tertiary p-3 border rounded small">${payload}</pre>`;
      })();

      const body = `
        <div class="container">
          <div class="row g-3">
            <div class="col-lg-10">
              <div class="card shadow-sm">
                <div class="card-body">
                  <h5 class="card-title mb-3">Callback Received</h5>
                  <p class="text-muted">Below are the query parameters returned by Keycloak.</p>
                  <div class="mb-2"><span class="text-muted">Path:</span> <code>${url.pathname}</code></div>
                  <div class="mb-3"><span class="text-muted">Full URL:</span> <code>${url.toString()}</code></div>
                  <label class="form-label">Query Parameters</label>
                  <pre class="bg-body-tertiary p-3 border rounded small">${JSON.stringify(params, null, 2)}</pre>
                  <hr />
                  <h6 class="mb-2">Token Exchange (optional)</h6>
                  ${exchangeSection}
                  <div class="mt-3 d-flex gap-2">
                    <a class="btn btn-outline-secondary" href="/">Home</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(htmlPage(TITLE, body));
    });
  }

  // Home page with quick info
  const home = `
    <div class="container">
      <div class="row g-3">
        <div class="col-lg-8">
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Welcome</h5>
              <p>Use this service as your <code>redirect_uri</code> for Keycloak. It will simply display whatever parameters were returned to <code>/callback</code>.</p>
              <ul>
                <li>Configure <strong>Valid Redirect URIs</strong> in your Keycloak client to include: <code>http://localhost:${PORT}/callback</code></li>
                <li>Point your auth request's <code>redirect_uri</code> to the same value.</li>
              </ul>
              <div class="mt-2"><span class="text-muted">Health:</span> <code>/healthz</code></div>
              <div class="mt-2"><span class="text-muted">Callback endpoint:</span> <code>/callback</code></div>
              <hr />
              <h6>Optional Token Exchange</h6>
              <p class="mb-1">Set the following env vars to enable exchanging <code>code</code> for tokens:</p>
              <ul class="mb-2">
                <li><code>TOKEN_URL</code> (or <code>KEYCLOAK_TOKEN_URL</code>)</li>
                <li><code>CLIENT_ID</code></li>
                <li><code>CLIENT_SECRET</code> (if required by your client)</li>
                <li><code>REDIRECT_URI</code> (defaults to <code>${CONFIG.REDIRECT_URI}</code>)</li>
              </ul>
              <div class="mb-2 small text-muted">Current config (non-secret fields only):</div>
              <pre class="bg-body-tertiary p-3 border rounded small">${JSON.stringify({
                TOKEN_URL: CONFIG.TOKEN_URL ? '[set]' : '',
                CLIENT_ID: CONFIG.CLIENT_ID,
                REDIRECT_URI: CONFIG.REDIRECT_URI,
              }, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage(TITLE, home));
});

server.listen(PORT, () => {
  console.log(`[keycloak-verifier] listening on :${PORT}`);
});
