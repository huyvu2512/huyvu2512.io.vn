/**
 * Quản lý lượt xem thông qua Backend Server API (/api/views)
 * - Server tự động trích xuất IP và chống spam F5 theo ngày
 * - Tự động dọn dẹp log ngày cũ khi bước sang ngày mới
 * - Frontend siêu nhẹ, không cần nạp Firebase SDK, không spam Network
 */

export async function fetchViews(): Promise<Record<string, number>> {
  try {
    const res = await fetch('/api/views');
    if (res.ok) {
      const data = (await res.json()) as any;
      return data.views || {};
    }
  } catch (err) {
    console.warn('Lỗi khi tải số view từ server:', err);
  }
  return {};
}

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Lấy hoặc khởi tạo Client ID định danh thiết bị duy nhất (UUID)
 * Dù đổi IP (Wi-Fi, 4G, VPN), máy vẫn giữ nguyên ID này để chống tính view ảo
 */
export function getClientId(): string {
  let id = localStorage.getItem('hv_client_id');
  if (!id) {
    id = 'cid_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('hv_client_id', id);
  }
  return id;
}

let cachedToken: string | null = null;
let cachedTokenDate = '';

/**
 * Gọi API xác thực người dùng thật trước khi ghi nhận view
 */
export async function getVerificationToken(): Promise<string | null> {
  const today = getTodayKey();
  if (cachedToken && cachedTokenDate === today) {
    return cachedToken;
  }

  // Chặn nếu chạy trong môi trường automation / headless bot
  if (typeof navigator !== 'undefined' && (navigator as any).webdriver) {
    return null;
  }

  const clientId = getClientId();
  const screenWidth = window.screen?.width || window.innerWidth || 390;
  const screenHeight = window.screen?.height || window.innerHeight || 844;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-human': '1',
      },
      body: JSON.stringify({
        clientId,
        screenWidth,
        screenHeight,
        timezone,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.token) {
        cachedToken = data.token;
        cachedTokenDate = today;
        return data.token;
      }
    }
  } catch (err) {
    console.warn('Lỗi xác thực thiết bị:', err);
  }

  return null;
}

export async function trackTargetView(targetId: string): Promise<Record<string, number> | null> {
  // Chặn nếu chạy trong môi trường automation / headless bot
  if (typeof navigator !== 'undefined' && (navigator as any).webdriver) {
    return null;
  }

  const today = getTodayKey();
  const localKey = `hv_viewed_${today}_${targetId}`;

  // Chặn ngay từ client nếu hôm nay người dùng đã xem: 0 request gửi đi!
  if (localStorage.getItem(localKey)) {
    return null;
  }

  // Bước 1: Lấy token xác thực từ API /api/verify
  const token = await getVerificationToken();
  if (!token) {
    return null;
  }

  const clientId = getClientId();

  try {
    // Bước 2: Gửi yêu cầu đếm view kèm clientId và token đã xác thực
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-human': '1',
      },
      body: JSON.stringify({
        targetId,
        clientId,
        token,
      }),
    });

    // Đánh dấu client đã ghi nhận hôm nay
    localStorage.setItem(localKey, '1');

    if (res.ok) {
      const data = (await res.json()) as any;
      return data.views || null;
    }
  } catch (err) {
    console.warn(`Lỗi ghi nhận view ${targetId} lên server:`, err);
  }

  return null;
}
