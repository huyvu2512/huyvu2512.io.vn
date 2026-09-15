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

function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'alphabetic';
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('HuyVu_2512_@!#$', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('HuyVu_2512_@!#$', 4, 17);
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';
    const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return `${vendor}~${renderer}`;
  } catch {
    return '';
  }
}

/**
 * Lấy hoặc khởi tạo Client ID định danh thiết bị vật lý duy nhất (Hardware Fingerprint)
 * Kết hợp: GPU Renderer + Canvas 2D + Màn hình + CPU cores + Múi giờ
 * Dù mở Tab thường, Tab ẩn danh (Incognito) hay đổi Wi-Fi sang 4G, ID này vẫn giữ nguyên trên cùng 1 máy
 */
export function getClientId(): string {
  try {
    const cached = localStorage.getItem('hv_client_id');
    if (cached && cached.startsWith('cid_fp_')) {
      return cached;
    }
  } catch {}

  const canvasFp = getCanvasFingerprint();
  const webgl = getWebGLRenderer();
  const screenInfo = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}x${window.devicePixelRatio || 1}`;
  const cpu = navigator.hardwareConcurrency || 4;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const lang = navigator.language || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  const raw = `${canvasFp}|${webgl}|${screenInfo}|${cpu}|${tz}|${lang}|${platform}`;
  const hash = hashString(raw);
  const id = `cid_fp_${hash}`;

  try {
    localStorage.setItem('hv_client_id', id);
  } catch {}

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

  // Bước 1: Lấy token xác thực từ API /api/verify
  const token = await getVerificationToken();
  if (!token) {
    return null;
  }

  const clientId = getClientId();

  try {
    // Bước 2: Gửi yêu cầu đếm view kèm clientId và token đã xác thực
    // Quyền quyết định tăng hay không hoàn toàn do Firestore daily_views kiểm soát
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

    if (res.ok) {
      const data = (await res.json()) as any;
      return data.views || null;
    }
  } catch (err) {
    console.warn(`Lỗi ghi nhận view ${targetId} lên server:`, err);
  }

  return null;
}
