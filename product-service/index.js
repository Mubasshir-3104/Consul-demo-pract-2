// product-service — listens on port 4001 and registers ITSELF in Consul.
import express from 'express';

const NAME = 'product-service';
const PORT = 4001;
const ADDRESS = '127.0.0.1';          // address other programs should use to reach us
const ID = `${NAME}-1`;               // unique id of this instance
const CONSUL = 'http://127.0.0.1:8500';

const app = express();

// Consul calls this URL every 5 seconds. 200 = healthy.
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// The one business endpoint of this service.
app.get('/products', (req, res) => res.json([
  { id: 1, name: 'Laptop', price: 900 },
  { id: 2, name: 'Headphones', price: 60 },
  { id: 3, name: 'Keyboard', price: 45 },
]));

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`${NAME} is running on http://${ADDRESS}:${PORT}`);
  register();
});

// ============ STEP 1: REGISTER WITH CONSUL ============
// We tell Consul: who we are (Name), where we are (Address + Port),
// and how to check that we are alive (an HTTP check on /health).
async function register() {
  try {
    const response = await fetch(`${CONSUL}/v1/agent/service/register`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID: ID,
        Name: NAME,
        Address: ADDRESS,
        Port: PORT,
        Check: {
          HTTP: `http://${ADDRESS}:${PORT}/health`,
          Interval: '5s',
        },
      }),
    });
    if (!response.ok) throw new Error(`Consul answered ${response.status}`);
    console.log(`✔ REGISTERED in Consul as "${NAME}" (${ADDRESS}:${PORT})`);
  } catch (error) {
    console.log(`Could not register (${error.message}). Is Consul running? Retrying in 5 seconds...`);
    setTimeout(register, 5000);
  }
}

// ============ STEP 2: DEREGISTER ON SHUTDOWN ============
// Ctrl+C sends SIGINT. Before exiting we remove ourselves from Consul.
async function deregister() {
  try {
    await fetch(`${CONSUL}/v1/agent/service/deregister/${ID}`, { method: 'PUT' });
    console.log(`✔ DEREGISTERED "${NAME}" from Consul`);
  } catch (error) {
    console.log(`Could not deregister: ${error.message}`);
  }
  server.close();
  process.exit(0);
}
process.on('SIGINT', deregister);
process.on('SIGTERM', deregister);
