<div align="center">

# Huy Vũ (@huyvu2512)

**Trang cá nhân chính thức của Huy Vũ (@huyvu2512) — Nơi tổng hợp các kênh mạng xã hội và dự án nổi bật.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firestore-REST%20API-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

[![Stars](https://img.shields.io/github/stars/huyvu2512/huyvu2512.io.vn?style=flat-square&label=Stars&color=FFCC00)](https://github.com/huyvu2512/huyvu2512.io.vn/stargazers)
[![Forks](https://img.shields.io/github/forks/huyvu2512/huyvu2512.io.vn?style=flat-square&label=Forks&color=6e7681)](https://github.com/huyvu2512/huyvu2512.io.vn/forks)
[![Issues](https://img.shields.io/github/issues/huyvu2512/huyvu2512.io.vn?style=flat-square&label=Issues&color=f85149)](https://github.com/huyvu2512/huyvu2512.io.vn/issues)
[![Last Commit](https://img.shields.io/github/last-commit/huyvu2512/huyvu2512.io.vn?style=flat-square&label=Last%20Commit&color=3fb950)](https://github.com/huyvu2512/huyvu2512.io.vn/commits/main)
![Visitors](https://visitor-badge.laobi.icu/badge?page_id=huyvu2512.huyvu2512.io.vn&left_text=Visitors&left_color=6e7681&right_color=00B4C8)

[Xem Website](https://huyvu2512.io.vn/) · [Báo Lỗi](https://github.com/huyvu2512/huyvu2512.io.vn/issues) · [Yêu Cầu Tính Năng](https://github.com/huyvu2512/huyvu2512.io.vn/issues)

</div>

---

## Giới thiệu

Website cá nhân và trang liên kết hồ sơ của **Huy Vũ (@huyvu2512)**. Dự án được xây dựng với mục tiêu tối ưu hiệu năng tải trang, trải nghiệm tương tác trực quan và giao diện thích ứng linh hoạt trên mọi kích thước thiết bị.

Hệ thống kết hợp giữa giao diện người dùng thời gian thực và backend serverless để theo dõi lưu lượng truy cập mà không làm chậm tốc độ tải trang ban đầu.

---

## Tính năng chính

- **Mắt nhân vật tương tác trực quan:** Tính toán góc vector thời gian thực từ vị trí con trỏ chuột hoặc cử chỉ chạm, kết hợp thuật toán làm mượt chuyển động (linear interpolation) và tua frame video qua `fastSeek`.
- **Hệ thống theo dõi lượt truy cập Serverless:**
  - Giao tiếp trực tiếp với Google Firestore qua REST API v1, không phụ thuộc vào Firebase Client SDK nhằm giảm kích thước bundle.
  - Tự động nhận diện địa chỉ IP tại tầng server để chống spam lượt xem theo ngày (mỗi IP chỉ được tính một lượt truy cập cho mỗi liên kết trong 24 giờ).
  - Tự động quét và dọn dẹp các bản ghi log cũ khi bước sang ngày mới nhằm tiết kiệm tài nguyên lưu trữ.
- **Tối ưu hiển thị đa thiết bị:**
  - **Desktop:** Khung video toàn cảnh với hiệu ứng chuyển màu mềm mại.
  - **Tablet & iPad:** Tự động điều chỉnh khoảng cách lề, kích thước badge và áp dụng cắt gọn chuỗi (ellipsis) chống vỡ khung.
  - **Mobile:** Video mở rộng sát viền màn hình, bố cục phân cấp liền mạch và cho phép cuộn trang tự nhiên.
- **Tiêu chuẩn SEO & Web Standards:** Đầy đủ metadata Open Graph, Twitter Cards, Sitemap XML, Robots.txt và Web App Manifest.

---

## Công nghệ sử dụng

| Thành phần | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite | Xây dựng giao diện đơn trang với hiệu năng cao |
| **Styling** | CSS3 Thuần | Kiểm soát bố cục chính xác, không phát sinh runtime overhead |
| **Backend API** | Vercel Serverless Functions | Xử lý logic đếm lượt xem và xác thực IP độc lập |
| **Cơ sở dữ liệu** | Google Cloud Firestore | Lưu trữ thống kê số lượt xem qua REST API |
| **Hạ tầng** | Vercel | Phân phối nội dung tĩnh trên mạng lưới Edge Network |

---

## Cấu trúc thư mục

```text
huyvu2512/
├── api/
│   ├── views.ts          # Serverless function xử lý ghi nhận và đồng bộ lượt xem
│   └── analytics.ts      # Endpoint xem thống kê dữ liệu và số lượng truy cập
├── public/
│   ├── footer-scrub.mp4  # Video tương tác của nhân vật
│   ├── header-logo.webp  # Hình ảnh xem trước khi chia sẻ liên kết
│   ├── logo.png          # Biểu tượng ứng dụng
│   ├── robots.txt        # Tệp chỉ thị cho công cụ tìm kiếm
│   ├── sitemap.xml       # Sơ đồ trang web chuẩn XML
│   └── site.webmanifest  # Cấu hình cài đặt Web App (PWA)
├── src/
│   ├── App.tsx           # Component gốc của ứng dụng
│   ├── BrandLogo.tsx     # Chữ ký nhận diện thương hiệu
│   ├── FooterBackground.tsx # Logic điều khiển khung video theo tọa độ mắt
│   ├── gaze-frames.json  # Bộ dữ liệu map góc nhìn và mốc thời gian video
│   ├── icons.tsx         # Hệ thống biểu tượng SVG tối ưu
│   ├── index.css         # Hệ thống biến thiết kế và media queries
│   ├── main.tsx          # Khởi tạo React DOM
│   ├── socialData.ts     # Dữ liệu cấu hình các liên kết và dự án
│   └── viewTracker.ts    # Module gửi request theo dõi lượt xem từ client
├── vercel.json           # Cấu hình định tuyến, cache và tiêu đề bảo mật
└── vite.config.ts        # Thiết lập Vite và middleware giả lập API local
```

---

## Khởi chạy dự án

### Yêu cầu tiên quyết
- [Node.js](https://nodejs.org/) (phiên bản 18 trở lên)
- Trình quản lý gói `npm` (hoặc `pnpm` / `yarn`)

### Các bước cài đặt

1. **Sao chép mã nguồn:**
   ```bash
   git clone https://github.com/huyvu2512/huyvu2512.io.vn.git
   cd huyvu2512.io.vn
   ```

2. **Cài đặt các thư viện phụ thuộc:**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường:**
   Tạo tệp `.env` tại thư mục gốc dựa theo `.env.example`:
   ```env
   VITE_FIREBASE_PROJECT_ID=huyvu2512-d7bae
   VITE_FIREBASE_API_KEY=your_firebase_web_api_key_here
   ```

4. **Chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ khả dụng tại địa chỉ `http://localhost:5173`.

---

## Triển khai lên Vercel

1. Đẩy dự án lên tài khoản GitHub cá nhân.
2. Tại bảng điều khiển Vercel, chọn **Add New Project** và nhập repository.
3. Thiết lập các biến môi trường trong phần **Environment Variables**:
   - `VITE_FIREBASE_PROJECT_ID`: ID dự án Firebase.
   - `VITE_FIREBASE_API_KEY`: Khóa API Web của Firebase.
4. Chọn **Deploy** để hoàn tất quy trình phát hành.

---

## API Reference

### 1. Ghi nhận & Lấy số lượt xem (`/api/views`)

- **GET `/api/views`**
  - Trả về danh sách số lượt xem hiện tại của tất cả các liên kết.
  - Phản hồi: `{ "views": { "page": 100, "facebook": 45, "total": 145 } }`

- **POST `/api/views`**
  - Ghi nhận một tương tác mới. Server tự động lấy IP từ request header để kiểm tra chống trùng lặp trong ngày.
  - Body: `{ "targetId": "facebook" }`

### 2. Xem thống kê & Lượng người dùng (`/api/analytics`)

- **GET `/api/analytics`**
  - Cung cấp báo cáo tổng quan về trạng thái hệ thống, số lượt tương tác trong ngày và phân bố click trên từng danh mục.

---

## Giấy phép

Dự án được phát hành theo giấy phép [MIT License](./LICENSE). Bản quyền thuộc về **Huy Vũ (@huyvu2512)**.
