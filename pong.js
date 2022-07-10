const dgram = require("dgram");
const server = dgram.createSocket("udp4");
const http = require("http");
// Opciones del servidor
const port = process.env.port || 5555; // Puerto por defecto
const port_api = process.env.port_api || 5555; // Puerto por defecto
const ping_prom = process.env.ping_prom || 15; // promedio de ping
const time_to_offline = process.env.time_to_offline || 60; // tiempo para offline

let ids = {};
server.on("message", (msg, rinfo) => {
  server.send("pong\r\n", rinfo.port, rinfo.address);
  read(msg, rinfo);
});
server.bind(port);

function read(msg, rinfo) {
  if (
    msg.toString().split("-")[0] == "ping" &&
    msg.toString().split("*").length == 2
  ) {
    let mac = msg.toString().split("-")[1].split("*")[0].replace(/\x00/g, "");
    let ping = parseInt(msg.toString().split("-")[1].split("*")[1]);
    if (typeof ids[mac] == "undefined") {
      ids[mac] = {
        ping: [ping],
        mac: mac,
        ip: rinfo.address,
        port: rinfo.port,
        restart: 0,
        last_restart: 0,
        first: Math.round(new Date().getTime() / 1000),
        history: [
          {
            status: "online",
            time: Math.round(new Date().getTime() / 1000),
            ping: ping,
          },
          {
            status: "online",
            time: Math.round(new Date().getTime() / 1000),
            ping: ping,
          },
        ],
      };
    } else {
      ids[mac].ping.push(ping);
      if (ids[mac].ping.length > ping_prom) {
        ids[mac].ping.shift();
      }
      ids[mac].ip = rinfo.address;
      ids[mac].port = rinfo.port;
      // Control de historial
      if (ids[mac].history[ids[mac].history.length - 1].status == "online") {
        ids[mac].history[ids[mac].history.length - 1].time = Math.round(
          new Date().getTime() / 1000
        );
        ids[mac].history[ids[mac].history.length - 1].ping = Math.round(
          ids[mac].ping.reduce((a, b) => a + b, 0) / ids[mac].ping.length
        );
      } else {
        ids[mac].history.push({
          status: "online",
          time: Math.round(new Date().getTime() / 1000),
          ping: ping,
        });
        ids[mac].history.push({
          status: "online",
          time: Math.round(new Date().getTime() / 1000),
          ping: ping,
        });
      }
    }
    // Restart event
    if (ping == 0) {
      ids[mac].restart = ids[mac].restart + 1;
      ids[mac].last_restart = Math.round(new Date().getTime() / 1000);
    }
    metrics(ids[mac]);
    console.log(new Date().toISOString(), mac, ping);
    console.log(JSON.stringify(ids[mac]));
  }
}

function off_line() {
  for (let i of Object.keys(ids)) {
    if (
      ids[i].history[ids[i].history.length - 1].status != "offline" &&
      Math.round(new Date().getTime() / 1000) -
        ids[i].history[ids[i].history.length - 1].time >
        time_to_offline
    ) {
      ids[i].history[ids[i].history.length - 1].status = "offline";
      ids[i].history[ids[i].history.length - 1].time = Math.round(
        new Date().getTime() / 1000
      );
      console.log(JSON.stringify(ids[i]));
    }
  }
}
off_line();
setInterval(off_line, 10 * 1000);

function metrics(data) {
  let time_online = 0;
  let time_offline = 0;
  if (data.history.length > 1) {
    let last_status = data.history[0].status;
    let last_time = data.history[0].time;
    for (let i = 1; i < data.history.length; i++) {
      if (last_status == "offline") {
        time_offline = time_offline + (data.history[i].time - last_time);
      } else if (last_status == "online") {
        time_online = time_online + (data.history[i].time - last_time);
      }
      last_status = data.history[i].status;
      last_time = data.history[i].time;
    }
  }
  return {
    time_online: time_online,
    time_offline: time_offline,
    up_time:
      time_online + time_offline == 0
        ? 0
        : Math.round((time_online / (time_online + time_offline)) * 1000) / 10,
    ...data,
  };
}

// Server
http
  .createServer(async (req, res) => {
    let url = new URL(req.url, `http://${req.headers.host}`);
    let path = url.pathname;
    let method = req.method;
    let params = url.searchParams;
    let body = [];
    req.on("data", (chunk) => {
      body.push(chunk);
    });
    req.on("end", async () => {
      body = Buffer.concat(body).toString();
      let respuesta = await service_api(path, method, params, body);
      res.writeHead(respuesta.status, respuesta.headers);
      res.end(respuesta.data);
    });
  })
  .listen(port_api);

async function service_api(path, method, params, body) {
  let res = { headers: {}, data: "", status: 200 };
  let DB;
  switch (path) {
    case "/api/v1/info":
      if (method === "GET" && params.has("mac")) {
        res.status = 200;
        res.headers = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        };
        res.data = JSON.stringify(metrics(ids[params.get("mac")]));
      } else {
        res.status = 400;
      }
      break;
    default:
      res.status = 404;
      res.headers = { "Content-Type": "text/plain" };
      res.data = "Not found";
      break;
  }
  return res;
}
