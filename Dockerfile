FROM node:14-slim
WORKDIR /usr/src/app
COPY . .
RUN npm install
LABEL traefik.http.routers.monitor.rule="Host(`monitor.nixi.pw`)"
LABEL traefik.http.routers.monitor.tls.certresolver="myresolver"
LABEL traefik.http.services.monitor.loadbalancer.server.port="5555"
# Label para control de flujo y limites
LABEL traefik.http.middlewares.monitor-ratelimit.ratelimit.average="100"
LABEL traefik.http.middlewares.monitor-inflightreq.inflightreq.amount="100"
LABEL traefik.http.middlewares.monitor-compress.compress="true"
# Label para acceso de CORS
LABEL traefik.http.middlewares.monitor-headers.headers.accessControlAllowHeaders="*"
LABEL traefik.http.middlewares.monitor-headers.headers.accessControlAllowMethods="GET,OPTIONS,POST,PUT,DELETE,HEAD"
LABEL traefik.http.middlewares.monitor-headers.headers.accesscontrolalloworiginlist="*"
# Carga de middlewares
LABEL traefik.http.routers.irvin.middlewares="monitor-ratelimit,monitor-compress,monitor-inflightreq,monitor-headers"
# Env para configurar conexiones
CMD [ "node", "pong.js" ]
