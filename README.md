# OIDC Explorer

A tiny Node based HTTP server that acts as a `redirect_uri` target for Keycloak or any OIDC provider. It displays the query parameters returned to `/callback` and can optionally exchange an authorisation code for tokens.

## Requirements

- Node.js 20+
- Docker/Podman (optional)

## Quick Start

### Locally
```
npm start
```

### Via Docker
```
docker run --rm -p 9090:9090 ghcr.io/steveswinsburg/oidc-explorer:latest
```

### Via Podman
```
podman run --rm -p 9090:9090 ghcr.io/steveswinsburg/oidc-explorer:latest
```

## Quick check

Click "http://localhost:8080/callback?code=ping" and view the app.

## Now What?
Configure your IdP (e.g., Keycloak) client with a Redirect URI of:

```
http://localhost:9090/callback
```

Use your IdP, authenticate and the OIDC Explorer app will receive the token data and display it on-screen.

