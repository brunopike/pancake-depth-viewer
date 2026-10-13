import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import handler from '../../api/esim.js';
import holderHandler from '../../api/holders.js';
const root = resolve('dist');
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (['/api/esim','/api/holders'].includes(path)) {
    req.query = Object.fromEntries(new URL(req.url, 'http://127.0.0.1').searchParams);
    let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 4096) { res.writeHead(413); res.end(); return; } }
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { res.writeHead(400); res.end(); return; }
    res.status = status => { res.statusCode = status; return res; }; res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    return (path === '/api/holders' ? holderHandler : handler)(req, res);
  }
  const file = resolve(root, '.' + (path === '/' ? '/esim.html' : path));
  if (!file.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
  try { const data = await readFile(file); res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[extname(file)] || 'application/octet-stream'); res.end(data); }
  catch { res.writeHead(404); res.end(); }
}).listen(4317, '127.0.0.1', () => console.log('ESIM preview: http://127.0.0.1:4317/esim.html'));
