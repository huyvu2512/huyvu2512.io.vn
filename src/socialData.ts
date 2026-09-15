export interface SocialItem {
  id: string;
  name: string;
  handle: string;
  url: string;
  tag: string;
  copyValue?: string;
  icon?: string;
  iconType?: 'facebook' | 'instagram' | 'tiktok' | 'telegram' | 'steam' | 'zalo' | 'discord' | 'locket' | 'bump' | 'web' | 'trending' | 'heart' | 'code';
  previewImage?: string;
  category?: 'website' | 'social';
}

// 4 Mạng xã hội hiển thị ở Footer Trang 1 (cân xứng với 4 website bên phải)
export const socialNetworks: SocialItem[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'Huy Vũ (huyvu2512)',
    url: 'https://facebook.com/huyvu2512',
    tag: 'Truy cập',
    icon: '/icons/facebook.webp',
    category: 'social',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: 'Huy Vũ (huyvu_2512)',
    url: 'https://instagram.com/huyvu_2512',
    tag: 'Truy cập',
    icon: '/icons/instagram.webp',
    category: 'social',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: 'Huy Vũ (@huyvu2512)',
    url: 'https://www.tiktok.com/@huyvu2512',
    tag: 'Truy cập',
    icon: '/icons/tiktok.webp',
    category: 'social',
  },
  {
    id: 'locket',
    name: 'Locket',
    handle: 'Huy Vũ (huyvu_2512)',
    url: 'https://locket.cam/huyvu_2512',
    tag: 'Truy cập',
    icon: '/icons/locket.webp',
    category: 'social',
  },
];

// Danh sách đầy đủ 10 Mạng xã hội cho Trang 2 (Showcase link pills dạng Beacons)
export const allSocialNetworks: SocialItem[] = [
  {
    id: 'locket',
    name: 'Locket',
    handle: 'Huy Vũ (huyvu_2512)',
    url: 'https://locket.cam/huyvu_2512',
    tag: 'Truy cập',
    icon: '/icons/locket.webp',
    category: 'social',
  },
  {
    id: 'bump',
    name: 'Bump',
    handle: 'Vũ Quang Huy',
    url: 'https://bumpmaps.com/i/j5K1tB2i1Kh8',
    tag: 'Truy cập',
    icon: '/icons/bump.webp',
    category: 'social',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'Huy Vũ (huyvu2512)',
    url: 'https://facebook.com/huyvu2512',
    tag: 'Truy cập',
    icon: '/icons/facebook.webp',
    category: 'social',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: 'Huy Vũ (huyvu_2512)',
    url: 'https://www.instagram.com/huyvu_2512',
    tag: 'Truy cập',
    icon: '/icons/instagram.webp',
    category: 'social',
  },
  {
    id: 'zalo',
    name: 'Zalo',
    handle: 'Vũ Quang Huy (0886308216)',
    url: 'https://zalo.me/0886308216',
    tag: 'Truy cập',
    icon: '/icons/zalo.webp',
    category: 'social',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: 'Huy Vũ (@huyvu2512)',
    url: 'https://www.tiktok.com/@huyvu2512',
    tag: 'Truy cập',
    icon: '/icons/tiktok.webp',
    category: 'social',
  },
  {
    id: 'discord',
    name: 'Discord',
    handle: 'Huy Vũ (@huyvu_2512)',
    url: 'https://discord.com/users/757121878904144013',
    tag: 'Truy cập',
    icon: '/icons/discord.webp',
    category: 'social',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    handle: 'Huy Vũ (@huyvu2512)',
    url: 'https://t.me/huyvu2512',
    tag: 'Truy cập',
    icon: '/icons/telegram.webp',
    category: 'social',
  },
  {
    id: 'steam',
    name: 'Steam',
    handle: 'Huy Vũ (@huyvu2512)',
    url: 'https://steamcommunity.com/id/huyvu2512',
    tag: 'Truy cập',
    icon: '/icons/steam.webp',
    category: 'social',
  },
  {
    id: 'github',
    name: 'GitHub',
    handle: 'Huy Vũ (@huyvu2512)',
    url: 'https://github.com/huyvu2512',
    tag: 'Truy cập',
    icon: '/icons/github.webp',
    category: 'social',
  },
];

// 4 Website dự án do Huy Vũ lập trình & phát triển (có preview card lớn)
export const myWebsites: SocialItem[] = [
  {
    id: 'locket-celebrity',
    name: 'Locket Celebrity',
    handle: 'locketcelebrity.app',
    url: 'https://locketcelebrity.app',
    tag: 'Truy cập',
    icon: '/icons/locketcelebrity.webp',
    previewImage: '/previews/locketcelebrity-preview.webp',
    category: 'website',
  },
  {
    id: 'truyen-hinh-so',
    name: 'Truyền Hình Số',
    handle: 'truyenhinh.huyvu2512.io.vn',
    url: 'http://truyenhinh.huyvu2512.io.vn',
    tag: 'Truy cập',
    icon: '/icons/truyenhinhso.webp',
    previewImage: '/previews/truyenhinhso-preview.webp',
    category: 'website',
  },
  {
    id: 'cookie-checker',
    name: 'Cookie Checker',
    handle: 'cookiecheckernetflix.vercel.app',
    url: 'https://cookiecheckernetflix.vercel.app',
    tag: 'Truy cập',
    icon: '/icons/cookiecheckernetflix.webp',
    previewImage: '/previews/cookiechecker-preview.webp',
    category: 'website',
  },
  {
    id: 'toptrending',
    name: 'TopTrending VN',
    handle: 'toptrendingvn.vercel.app',
    url: 'https://toptrendingvn.vercel.app',
    tag: 'Truy cập',
    icon: '/icons/toptrendingvn.webp',
    previewImage: '/previews/toptrending-preview.webp',
    category: 'website',
  },
];

export const directChats = myWebsites;
