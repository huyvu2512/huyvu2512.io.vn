// Backend Serverless Function (Vercel & Local Vite)
// Sử dụng chuẩn Firestore REST API - Tốc độ cực nhanh, không phụ thuộc thư viện, không lỗi socket

import crypto from 'crypto';

const SECRET_SALT = process.env.VITE_FIREBASE_API_KEY || 'hv_secret_salt_2026';

function generateToken(clientId: string, date: string): string {
  return crypto
    .createHmac('sha256', SECRET_SALT)
    .update(`${clientId}_${date}`)
    .digest('hex')
    .slice(0, 32);
}

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'huyvu2512-d7bae';
const API_KEY = process.env.VITE_FIREBASE_API_KEY || '';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Lấy toàn bộ lượt view hiện tại từ Firestore
 */
async function getStats(): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${BASE_URL}/views/stats?key=${API_KEY}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      const views: Record<string, number> = {};
      if (data && data.fields) {
        for (const [key, val] of Object.entries<any>(data.fields)) {
          views[key] = parseInt(val.integerValue ?? val.doubleValue ?? '0', 10);
        }
      }
      return views;
    }
  } catch (err) {
    console.error('Lỗi lấy stats từ Firestore REST:', err);
  }
  return {};
}

/**
 * Kiểm tra xem IP này hôm nay đã click vào mục này chưa
 */
async function checkLogExists(logId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/daily_views/${logId}?key=${API_KEY}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Lưu log thiết bị & IP cho ngày hôm nay
 */
async function saveLog(logId: string, ip: string, targetId: string, date: string, clientId?: string): Promise<void> {
  const url = `${BASE_URL}/daily_views?documentId=${logId}&key=${API_KEY}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        ip: { stringValue: ip },
        targetId: { stringValue: targetId },
        date: { stringValue: date },
        clientId: { stringValue: clientId || 'unknown' },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  }).catch(() => {});
}

/**
 * Kiểm tra xem request có phải bot, crawler hoặc AWS/Vercel deploy checker không
 */
function isAutomatedBot(req: any): boolean {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();

  // 1. Không có User-Agent hoặc quá ngắn -> Không phải trình duyệt người dùng
  if (!userAgent || userAgent.length < 16) return true;

  // 2. Danh sách các bot, crawler và công cụ kiểm tra tự động
  const botSignatures = [
    'bot',
    'crawl',
    'spider',
    'slurp',
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
    'pingdom',
    'uptimerobot',
  ];

  if (botSignatures.some((sig) => userAgent.includes(sig))) {
    return true;
  }

  // 3. Header prefetch tự động
  if (req.headers['purpose'] === 'prefetch' || req.headers['sec-purpose'] === 'prefetch') {
    return true;
  }

  // 4. Request chuẩn từ frontend client thật luôn có header x-client-human
  if (req.headers['x-client-human'] !== '1') {
    return true;
  }

  return false;
}

/**
 * Tăng số đếm nguyên tử (atomic increment) trong Firestore
 */
async function incrementStats(targetId: string): Promise<void> {
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit?key=${API_KEY}`;
  // Firestore REST API quy định: Nếu tên field có dấu gạch ngang (-) hoặc ký tự đặc biệt, bắt buộc phải bọc trong backtick `
  const safeFieldPath = targetId.includes('-') ? `\`${targetId}\`` : targetId;
  const transforms: any[] = [
    {
      fieldPath: safeFieldPath,
      increment: { integerValue: '1' },
    },
  ];

  // Nếu là lượt xem trang thì đồng bộ luôn với total ban đầu
  if (targetId === 'page') {
    transforms.push({
      fieldPath: 'total',
      increment: { integerValue: '1' },
    });
  }

  await fetch(commitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          transform: {
            document: `projects/${PROJECT_ID}/databases/(default)/documents/views/stats`,
            fieldTransforms: transforms,
          },
        },
      ],
    }),
  }).catch(() => {});
}

let inMemoryCleanedDate = '';

/**
 * Tự động xóa sạch toàn bộ logs của các ngày trước khi bước sang ngày mới
 */
async function cleanupOldLogs(today: string): Promise<void> {
  // 1. Tối ưu bộ nhớ đệm Lambda: Bỏ qua ngay nếu container đã kiểm tra trong ngày hôm nay
  if (inMemoryCleanedDate === today) {
    return;
  }

  try {
    const checkRes = await fetch(`${BASE_URL}/views/last_cleanup?key=${API_KEY}`);
    if (checkRes.ok) {
      const data = (await checkRes.json()) as any;
      if (data && data.fields?.date?.stringValue === today) {
        inMemoryCleanedDate = today;
        return;
      }
    }

    inMemoryCleanedDate = today;

    // Lấy danh sách tài liệu trong daily_views để xóa sạch các ngày trước
    const listRes = await fetch(`${BASE_URL}/daily_views?pageSize=300&key=${API_KEY}`);
    if (listRes.ok) {
      const data = (await listRes.json()) as any;
      if (data && Array.isArray(data.documents)) {
        const deletePromises: Promise<any>[] = [];
        for (const doc of data.documents) {
          if (doc && doc.name) {
            const docPath = doc.name.split('/documents/')[1];
            const docDate = doc.fields?.date?.stringValue;
            const docId = docPath.split('/').pop() || '';
            // Xóa nếu ngày ghi nhận nhỏ hơn hôm nay hoặc tiền tố document ID nhỏ hơn hôm nay
            if ((docDate && docDate < today) || (docId && docId.substring(0, 10) < today)) {
              deletePromises.push(
                fetch(`${BASE_URL}/${docPath}?key=${API_KEY}`, { method: 'DELETE' }).catch(() => {})
              );
            }
          }
        }
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      }
    }

    await fetch(`${BASE_URL}/views/last_cleanup?documentId=last_cleanup&key=${API_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          date: { stringValue: today },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    }).catch(() => {});
  } catch (e) {
    console.warn('Lỗi dọn log cũ:', e);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-client-human');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    // 1. GET: Lấy số views hiện tại
    if (req.method === 'GET') {
      const views = await getStats();
      res.statusCode = 200;
      res.end(JSON.stringify({ views }));
      return;
    }

    // 2. POST: Ghi nhận view (Server tự trích xuất IP, tự check chống spam và dọn dẹp ngày cũ)
    if (req.method === 'POST') {
      // Bỏ qua bot, crawler hoặc các lần ping kiểm tra tự động của AWS / Vercel
      if (isAutomatedBot(req)) {
        const views = await getStats();
        res.statusCode = 200;
        res.end(JSON.stringify({ views, counted: false }));
        return;
      }

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const targetId = body.targetId || 'page';
      const clientId = body.clientId;
      const token = body.token;

      // Trích xuất IP trực tiếp từ Request Header
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket?.remoteAddress) || '127.0.0.1';
      const ip = rawIp.trim();

      // Ngày hiện tại theo giờ VN (UTC+7)
      const now = new Date();
      const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
      const today = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

      // Bắt buộc phải có token hợp lệ được cấp từ API /api/verify
      if (!clientId || !token || token !== generateToken(clientId, today)) {
        const views = await getStats();
        res.statusCode = 200;
        res.end(JSON.stringify({ views, counted: false }));
        return;
      }

      // 1. Người đầu tiên trong ngày vào: AWAIT dọn dẹp sạch toàn bộ log ngày hôm trước trước khi tiếp tục
      await cleanupOldLogs(today);

      // 2. Định danh thiết bị: Dùng clientId duy nhất của máy (dù đổi Wi-Fi sang 4G hay VPN vẫn là 1 máy)
      const safeKey = clientId.replace(/[^a-zA-Z0-9]/g, '_');
      const logDocId = `${today}_${safeKey}_${targetId}`;
      const exists = await checkLogExists(logDocId);

      if (!exists) {
        // Lưu log và tăng view đồng thời (song song) để giảm thời gian phản hồi API
        await Promise.all([
          saveLog(logDocId, ip, targetId, today, clientId),
          incrementStats(targetId),
        ]);
      }

      const views = await getStats();
      res.statusCode = 200;
      res.end(JSON.stringify({ views, counted: !exists }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  } catch (err: any) {
    console.error('Lỗi API views:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
  }
}
