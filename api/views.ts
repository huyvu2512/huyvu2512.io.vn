// Backend Serverless Function (Vercel & Local Vite)
// Sử dụng chuẩn Firestore REST API - Tốc độ cực nhanh, không phụ thuộc thư viện, không lỗi socket

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
 * Lưu log IP cho ngày hôm nay
 */
async function saveLog(logId: string, ip: string, targetId: string, date: string): Promise<void> {
  const url = `${BASE_URL}/daily_views?documentId=${logId}&key=${API_KEY}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        ip: { stringValue: ip },
        targetId: { stringValue: targetId },
        date: { stringValue: date },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  }).catch(() => {});
}

/**
 * Tăng số đếm nguyên tử (atomic increment) trong Firestore
 */
async function incrementStats(targetId: string): Promise<void> {
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit?key=${API_KEY}`;
  const transforms: any[] = [
    {
      fieldPath: 'total',
      increment: { integerValue: '1' },
    },
  ];

  if (targetId !== 'page') {
    transforms.push({
      fieldPath: targetId,
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

/**
 * Tự động xóa sạch toàn bộ logs của các ngày trước khi bước sang ngày mới
 */
async function cleanupOldLogs(today: string): Promise<void> {
  try {
    const checkRes = await fetch(`${BASE_URL}/views/last_cleanup?key=${API_KEY}`);
    if (checkRes.ok) {
      const data = (await checkRes.json()) as any;
      if (data && data.fields?.date?.stringValue === today) {
        return;
      }
    }

    const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
    const queryRes = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'daily_views' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'date' },
              op: 'LESS_THAN',
              value: { stringValue: today },
            },
          },
        },
      }),
    });

    if (queryRes.ok) {
      const results = (await queryRes.json()) as any[];
      if (Array.isArray(results)) {
        for (const item of results) {
          if (item && item.document?.name) {
            const docPath = item.document.name.split('/documents/')[1];
            await fetch(`${BASE_URL}/${docPath}?key=${API_KEY}`, { method: 'DELETE' }).catch(() => {});
          }
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const targetId = body.targetId || 'page';

      // Trích xuất IP trực tiếp từ Request Header
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket?.remoteAddress) || '127.0.0.1';
      const ip = rawIp.trim();

      // Ngày hiện tại theo giờ VN (UTC+7)
      const now = new Date();
      const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
      const today = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

      // Dọn dẹp log ngày cũ nếu vừa sang ngày mới
      void cleanupOldLogs(today);

      // Kiểm tra IP hôm nay đã click mục này chưa
      const safeIp = ip.replace(/[^a-zA-Z0-9]/g, '_');
      const logDocId = `${today}_${safeIp}_${targetId}`;
      const exists = await checkLogExists(logDocId);

      if (!exists) {
        // Lưu log cho IP và tăng view
        await saveLog(logDocId, ip, targetId, today);
        await incrementStats(targetId);
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
