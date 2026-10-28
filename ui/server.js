// Tiny server for the web page. It only READS from Consul; it registers nothing.
import express from 'express';
import { fileURLToPath } from 'node:url';

const CONSUL = 'http://127.0.0.1:8500';
const app = express();

// Ask Consul which services it knows, and whether each one is healthy.
app.get('/api/services', async (req, res) => {
  try {
    const catalog = await get('/v1/catalog/services');               // { "product-service": [], "consul": [] }
    const names = Object.keys(catalog).filter(name => name !== 'consul');
    const rows = [];
    for (const name of names) {
      const instances = await get(`/v1/health/service/${encodeURIComponent(name)}`);
      for (const { Service, Checks } of instances) {
        const status = Checks.some(c => c.Status === 'critical') ? 'critical'
                     : Checks.every(c => c.Status === 'passing') ? 'passing' : 'warning';
        rows.push({ name, address: Service.Address, port: Service.Port, status });
      }
    }
    res.json({ services: rows });
  } catch (error) {
    res.status(502).json({ error: 'Cannot reach Consul on port 8500. Start it with: consul agent -dev' });
  }
});

async function get(path) {
  const response = await fetch(CONSUL + path, { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`Consul answered ${response.status}`);
  return response.json();
}

app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
app.listen(3000, '127.0.0.1', () => console.log('UI is running on http://localhost:3000'));
