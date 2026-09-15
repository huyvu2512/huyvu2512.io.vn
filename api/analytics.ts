// Backend Analytics & Log Viewer Endpoint (/api/analytics)
// Cung cấp số liệu thống kê lượt truy cập, người dùng hôm nay và lịch sử click

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'huyvu2512-d7bae';
const API_KEY = process.env.VITE_FIREBASE_API_KEY || '';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    // 1. Lấy toàn bộ số lượt view tích lũy
    let views: Record<string, number> = {};
    const statsRes = await fetch(`${BASE_URL}/views/stats?key=${API_KEY}`);
    if (statsRes.ok) {
      const data = (await statsRes.json()) as any;
      if (data && data.fields) {
        for (const [key, val] of Object.entries<any>(data.fields)) {
          views[key] = parseInt(val.integerValue ?? val.doubleValue ?? '0', 10);
        }
      }
    }

    // 2. Lấy ngày hiện tại theo giờ VN (UTC+7)
    const now = new Date();
    const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const today = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

    // 3. Đếm số lượng logs tương tác của ngày hôm nay
    let todayInteractionsCount = 0;
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
              op: 'EQUAL',
              value: { stringValue: today },
            },
          },
        },
      }),
    });

    if (queryRes.ok) {
      const results = (await queryRes.json()) as any[];
      if (Array.isArray(results)) {
        todayInteractionsCount = results.filter((item) => item?.document?.name).length;
      }
    }

    // 4. Phân loại theo nhóm Social & Websites
    const totalViews = views.total || 0;
    const pageViews = views.page || 0;

    const summary = {
      status: 'healthy',
      projectId: PROJECT_ID,
      serverTime: vnTime.toISOString(),
      today,
      metrics: {
        totalClicks: totalViews,
        pageViews,
        todayUniqueInteractions: todayInteractionsCount,
      },
      linkBreakdown: views,
    };

    res.statusCode = 200;
    res.end(JSON.stringify(summary, null, 2));
  } catch (err: any) {
    console.error('Lỗi API Analytics:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
  }
}
