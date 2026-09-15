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

export async function trackTargetView(targetId: string): Promise<Record<string, number> | null> {
  const today = getTodayKey();
  const localKey = `hv_viewed_${today}_${targetId}`;

  // Chặn ngay từ client nếu hôm nay người dùng đã xem: 0 request gửi đi!
  if (localStorage.getItem(localKey)) {
    return null;
  }

  try {
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetId }),
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
