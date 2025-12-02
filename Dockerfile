# Keycloak Verifier - minimal callback viewer
FROM node:20-alpine

WORKDIR /app

# No dependencies to install, copy source directly
COPY server.js ./

ENV NODE_ENV=production
ENV PORT=9090

EXPOSE 9090
CMD ["node", "server.js"]
