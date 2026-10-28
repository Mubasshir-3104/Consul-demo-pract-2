# Consul registration demo

Two tiny microservices register **themselves** in HashiCorp Consul when they start, and remove themselves when they stop. A small web page shows what Consul currently knows. No Docker.

```
consul-demo/
├── product-service/index.js    port 4001   GET /products   (registers itself)
├── customer-service/index.js   port 4002   GET /customers  (registers itself)
├── ui/server.js                port 3000   reads Consul, serves the page
├── ui/public/index.html        the web page (plain HTML, no build step)
├── scripts/consul.mjs          downloads (first run) and starts the Consul server
└── scripts/start-all.mjs       optional: starts both services and the UI in one terminal
```

## Requirements

- Node.js 22 or newer (`node -v`)
- Internet access once, so the project can download Consul the first time.

You do **not** need to install Consul yourself. `npm run consul` downloads the official Consul program into this project's `consul/` folder the first time, then starts it. (If Consul is already installed on your computer, it uses that instead.)

## Run it

```sh
npm install
```

Open four terminals in this folder, one command in each:

| Terminal | Command | Then |
|---|---|---|
| 1 | `npm run consul` | The Consul server starts. Its web UI: http://localhost:8500/ui |
| 2 | `npm run product` | |
| 3 | `npm run customer` | |
| 4 | `npm run ui` | Web page: http://localhost:3000 |

Shortcut: keep Consul running in terminal 1, then run `npm start` in terminal 2. It runs both services and the UI together, and Ctrl+C stops all three and deregisters the services. Stop Consul last.

Where is Consul? It is the program started by `npm run consul`: a separate server process listening on port 8500. The services never contain Consul; they send it HTTP requests (see below).

## 5-step classroom demo

1. Start Consul with `npm run consul` (terminal 1) and the UI (terminal 4). Open http://localhost:3000. The table is empty.
2. Run `npm run product`. The terminal prints `✔ REGISTERED in Consul as "product-service"`. Within a few seconds the row appears on the page and turns green once Consul's first health check passes.
3. Run `npm run customer`. A second row appears.
4. Open http://localhost:4001/products and http://localhost:4002/customers. Each service answers on its own port.
5. Press Ctrl+C in the product terminal. It prints `✔ DEREGISTERED`, and the row disappears from the page and from the Consul UI.

## Where the registration happens

Open `product-service/index.js` and find the two comment blocks:

- **STEP 1: REGISTER WITH CONSUL** sends `PUT /v1/agent/service/register` with `ID`, `Name`, `Address`, `Port` and a health check (`GET /health` every 5 seconds).
- **STEP 2: DEREGISTER ON SHUTDOWN** sends `PUT /v1/agent/service/deregister/<ID>` when you press Ctrl+C.

`customer-service/index.js` is the same code with a different name, port and data.

## Things worth knowing

- If you start a service before Consul, it keeps retrying every 5 seconds until Consul is up.
- If you restart Consul, it forgets everything (dev mode keeps everything in memory). Restart the services so they register again.
- Closing the terminal window or killing the process does not run Step 2, so the service stays listed and turns red. Only Ctrl+C removes it cleanly.
- Everything listens on 127.0.0.1 only, so it is not reachable from other machines.
- If the first download is blocked (school or office network), download the Consul zip for your system from https://developer.hashicorp.com/consul/install and unzip `consul.exe` (or `consul`) into a folder named `consul` in this project. `npm run consul` will then use it.
