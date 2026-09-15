// Backend Verification Endpoint (/api/verify)
// Xác thực thiết bị người dùng thật trước khi cho phép ghi nhận lượt xem

import crypto from 'crypto';

const SECRET_SALT = process.env.VITE_FIREBASE_API_KEY || 'hv_secret_salt_2026';

export function generateToken(clientId: string, date: string): string {
  return crypto
    .createHmac('sha256', SECRET_SALT)
    .update(`${clientId}_${date}`)
    .digest('hex')
    .slice(0, 32);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-client-human');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();

    // 1. Chặn bot, crawler, headless, cURL, Facebook crawler, v.v.
    const botSignatures = [
      'bot',
      'crawl',
      'spider',
      'slurp',
      'facebookexternalhit',
      'facebot',
      'meta',
      'vercel',
      'aws',
      'amazon',
      'google',
      'headless',
      'lighthouse',
      'curl',
      'wget',
      'python',
      'postman',
      'axios',
      'node-fetch',
      'undici',
    ];

    if (!userAgent || userAgent.length < 16 || botSignatures.some((sig) => userAgent.includes(sig))) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Automated agent blocked' }));
      return;
    }

    // 2. Kiểm tra header xác thực người thật
    if (req.headers['x-client-human'] !== '1') {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Invalid client headers' }));
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { clientId, screenWidth, screenHeight, timezone } = body;

    // 3. Kiểm tra định dạng clientId hợp lệ của client thật
    if (!clientId || typeof clientId !== 'string' || !clientId.startsWith('cid_') || clientId.length < 10) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid client ID' }));
      return;
    }

    // 4. Kiểm tra thông số phần cứng thật (kích thước màn hình, múi giờ)
    if (!screenWidth || !screenHeight || screenWidth < 200 || screenHeight < 200 || !timezone) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid device parameters' }));
      return;
    }

    // Ngày hiện tại theo giờ VN (UTC+7)
    const now = new Date();
    const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const today = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

    // Tạo token xác thực có chữ ký bảo mật
    const token = generateToken(clientId, today);

    res.statusCode = 200;
    res.end(JSON.stringify({ verified: true, token, clientId }));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || 'Internal error' }));
  }
}
