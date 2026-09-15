import { useState, useEffect, useRef } from 'react';
import FooterBackground from './FooterBackground';
import BrandLogo from './BrandLogo';
import { socialNetworks, allSocialNetworks, myWebsites, type SocialItem } from './socialData';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  TwitterXIcon,
  WebIcon,
  TrendingIcon,
  HeartIcon,
  CodeIcon,
  ExternalLinkIcon,
  EyeIcon,
} from './icons';
import { fetchViews, trackTargetView, getTodayKey } from './viewTracker';

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'social' | 'website'>('all');

  // Quản lý số lượt xem / click (100% nạp từ Firestore DB)
  const [views, setViews] = useState<Record<string, number>>({});
  const initialFetched = useRef(false);

  // Chỉ gọi ĐÚNG 1 request duy nhất khi mở trang / F5
  useEffect(() => {
    if (initialFetched.current) return;
    initialFetched.current = true;

    const today = getTodayKey();
    const localKey = `hv_viewed_${today}_page`;

    if (!localStorage.getItem(localKey)) {
      // Nếu hôm nay chưa ghi nhận: gọi 1 request POST (server check IP, tăng view và trả về toàn bộ views mới nhất)
      void trackTargetView('page').then((updated) => {
        if (updated) setViews(updated);
      });
    } else {
      // Nếu hôm nay đã ghi nhận rồi: chỉ gọi 1 request GET lấy số views mới nhất
      void fetchViews().then((latestViews) => {
        if (latestViews) setViews(latestViews);
      });
    }
  }, []);

  const incrementView = (id: string) => {
    // Tăng tức thì trên giao diện client nếu chưa click hôm nay
    const today = getTodayKey();
    if (!localStorage.getItem(`hv_viewed_${today}_${id}`)) {
      setViews((prev) => ({
        ...prev,
        [id]: (prev[id] || 0) + 1,
      }));
    }
    // Ghi nhận vào Server API với logic kiểm tra IP và reset theo ngày
    void trackTargetView(id).then((updated) => {
      if (updated) setViews(updated);
    });
  };

  // Hiệu ứng gõ chữ (Typewriter effect) cho tiêu đề tab trình duyệt
  // Sử dụng Web Worker để không bị Chrome bóp nghẹt tốc độ (1s/lần) khi chuyển tab khác
  useEffect(() => {
    const text = 'Huy Vũ (@huyvu2512)';
    let charIndex = 0;
    let isDeleting = false;
    let blinkCount = 0;
    let isBlinking = false;

    // Worker chạy luồng riêng, không bao giờ bị Chrome giảm tốc khi tab ở chế độ nền
    const workerCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data.action === 'schedule') {
          clearTimeout(timer);
          timer = setTimeout(function() {
            self.postMessage('tick');
          }, e.data.delay);
        } else if (e.data.action === 'stop') {
          clearTimeout(timer);
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    let worker: Worker | null = null;

    try {
      worker = new Worker(workerUrl);
    } catch {
      worker = null;
    }

    const scheduleNext = (delay: number) => {
      if (worker) {
        worker.postMessage({ action: 'schedule', delay });
      } else {
        window.setTimeout(tick, delay);
      }
    };

    const tick = () => {
      if (isBlinking) {
        blinkCount++;
        const show = blinkCount % 2 === 1;
        document.title = text + (show ? '|' : '');

        if (blinkCount >= 6) {
          isBlinking = false;
          isDeleting = true;
          scheduleNext(350);
        } else {
          scheduleNext(350);
        }
        return;
      }

      if (!isDeleting) {
        charIndex++;
        document.title = text.slice(0, charIndex) + '|';

        if (charIndex === text.length) {
          isBlinking = true;
          blinkCount = 0;
          scheduleNext(400);
        } else {
          scheduleNext(120);
        }
      } else {
        charIndex--;
        document.title = (charIndex > 0 ? text.slice(0, charIndex) : '') + '|';

        if (charIndex === 0) {
          isDeleting = false;
          scheduleNext(500);
        } else {
          scheduleNext(45);
        }
      }
    };

    if (worker) {
      worker.onmessage = () => {
        tick();
      };
    }

    document.title = '|';
    scheduleNext(300);

    return () => {
      if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
      }
      URL.revokeObjectURL(workerUrl);
      document.title = 'Huy Vũ (@huyvu2512)';
    };
  }, []);

  // Đảm bảo khi tải lại trang luôn bắt đầu từ đầu trang 1
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // Hàm cuộn trang mượt mà với thời gian tùy chỉnh (êm ái, chậm rãi và sang trọng)
  const smoothScrollTo = (targetY: number, duration = 900) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    if (Math.abs(diff) < 2) return;

    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: easeInOutCubic (trượt êm ái, không bị nhanh đột ngột)
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      window.scrollTo(0, startY + diff * ease);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  useEffect(() => {
    let isAnimating = false;
    let reachedTopTimestamp = 0;

    const handleWheel = (e: WheelEvent) => {
      // Tắt hoàn toàn tự kéo trên mobile để cuộn trang tự do, tự nhiên
      if (window.innerWidth <= 768) return;

      if (isAnimating) {
        e.preventDefault();
        return;
      }

      // Bỏ qua các chuyển động lăn chuột quá nhỏ (chống rung)
      if (Math.abs(e.deltaY) < 16) return;

      const moreSection = document.getElementById('more-section');
      const section2Top = moreSection ? moreSection.offsetTop : window.innerHeight;
      const scrollY = window.scrollY;

      // 1. Đang ở Trang 1 (phía trên, scrollY gần 0)
      if (scrollY <= 50) {
        if (e.deltaY > 0) {
          // Lăn chuột xuống -> Trượt êm ái xuống Trang 2
          e.preventDefault();
          isAnimating = true;
          smoothScrollTo(section2Top, 900);
          setTimeout(() => {
            isAnimating = false;
          }, 950);
        }
        return;
      }

      // 2. Đang ở trong Trang 2 (scrollY > section2Top + 10)
      if (scrollY > section2Top + 10) {
        // Nếu lăn xuống: cuộn tự nhiên tự do xem các thẻ
        if (e.deltaY > 0) return;

        // Nếu lăn lên và cú cuộn này chạm tới hoặc vượt qua mốc đầu Trang 2:
        // Căn chỉnh dừng đúng tại đầu Trang 2 (section2Top), không để bị vọt lố về Trang 1
        if (scrollY - Math.abs(e.deltaY) < section2Top) {
          e.preventDefault();
          window.scrollTo(0, section2Top);
          reachedTopTimestamp = Date.now();
          return;
        }

        // Còn lại: Cho phép cuộn tự do bên trong Trang 2 để xem các thẻ bên trên
        return;
      }

      // 3. Đang ở sát đầu Trang 2 (chạm ranh giới giữa Trang 1 và Trang 2)
      if (Math.abs(scrollY - section2Top) <= 10 || (scrollY >= section2Top - 20 && scrollY <= section2Top + 10)) {
        // Nếu người dùng lăn chuột xuống -> Cho phép cuộn tự do xuống phía dưới trang 2
        if (e.deltaY > 0) return;

        // Nếu người dùng lăn chuột lên:
        // Nếu vừa mới cuộn từ dưới lên tới ranh giới trong vòng 650ms -> Chặn triệt để quán tính của cú lướt cũ
        if (Date.now() - reachedTopTimestamp < 650) {
          e.preventDefault();
          return;
        }

        // Người dùng đã ở trên đỉnh Trang 2, chạm ranh giới và chủ động lướt thêm cú mới -> Trượt êm về Trang 1
        e.preventDefault();
        isAnimating = true;
        smoothScrollTo(0, 900);
        setTimeout(() => {
          isAnimating = false;
        }, 950);
        return;
      }

      // 4. Trường hợp lơ lửng ở giữa (50px < scrollY < section2Top - 20px)
      if (e.deltaY > 0) {
        e.preventDefault();
        isAnimating = true;
        smoothScrollTo(section2Top, 900);
        setTimeout(() => {
          isAnimating = false;
        }, 950);
      } else if (e.deltaY < 0) {
        e.preventDefault();
        isAnimating = true;
        smoothScrollTo(0, 900);
        setTimeout(() => {
          isAnimating = false;
        }, 950);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleCardClick = (item: SocialItem) => {
    incrementView(item.id);
    if (item.copyValue) {
      navigator.clipboard.writeText(item.copyValue);
      showToast(`Đã sao chép: ${item.copyValue} ✨`);
    } else if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'facebook':
        return <FacebookIcon />;
      case 'instagram':
        return <InstagramIcon />;
      case 'tiktok':
        return <TikTokIcon />;
      case 'twitter':
        return <TwitterXIcon />;
      case 'trending':
        return <TrendingIcon />;
      case 'web':
        return <WebIcon />;
      case 'heart':
        return <HeartIcon />;
      case 'code':
        return <CodeIcon />;
      default:
        return <WebIcon />;
    }
  };

  const scrollToMore = () => {
    const moreSection = document.getElementById('more-section');
    const targetY = moreSection ? moreSection.offsetTop : window.innerHeight;
    smoothScrollTo(targetY, 900);
  };

  return (
    <>
      <footer className="footer" aria-label="Footer">
        {/* Video Scrubbing Eye-Following Background */}
        <FooterBackground />

        {/* Cột Trái: Mạng Xã Hội */}
        <div className="jobs">
          <span className="headline job-title">
            social<br />networks
          </span>
          <div className="footer-nav">
            {socialNetworks.map((item) => (
              <div
                key={item.id}
                className="bio-card"
                onClick={() => handleCardClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCardClick(item)}
                title={`Mở ${item.name}`}
              >
                <div className="card-left">
                  {item.icon ? (
                    <span className="card-icon">
                      <img src={item.icon} alt={item.name} />
                    </span>
                  ) : item.iconType ? (
                    <span className="card-icon">{renderIcon(item.iconType)}</span>
                  ) : null}
                  <div className="card-info">
                    <span className="card-title">{item.name}</span>
                    <span className="card-handle">{item.handle}</span>
                  </div>
                </div>
                <div className="card-right">
                  <div className="view-count-badge" title="Lượt xem">
                    <EyeIcon />
                    <span>{views[item.id] || 0}</span>
                  </div>
                  <ExternalLinkIcon />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Brand Logo Huy Vũ */}
        <div className="logo" role="img" aria-label="Studio logo">
          <BrandLogo />
        </div>

        {/* Cột Phải: Các Website Do Tôi Code */}
        <div className="contact">
          <div className="headline contact-links">
            <span>featured</span>
            <span>websites</span>
          </div>
          <div className="footer-nav" style={{ marginTop: '1.3vw' }}>
            {myWebsites.map((item) => (
              <div
                key={item.id}
                className="bio-card"
                onClick={() => handleCardClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCardClick(item)}
                title={`Truy cập ${item.name}`}
              >
                <div className="card-left">
                  {item.icon ? (
                    <span className="card-icon">
                      <img src={item.icon} alt={item.name} />
                    </span>
                  ) : item.iconType ? (
                    <span className="card-icon">{renderIcon(item.iconType)}</span>
                  ) : null}
                  <div className="card-info">
                    <span className="card-title">{item.name}</span>
                    <span className="card-handle">{item.handle}</span>
                  </div>
                </div>
                <div className="card-right">
                  <div className="view-count-badge" title="Lượt xem">
                    <EyeIcon />
                    <span>{views[item.id] || 0}</span>
                  </div>
                  <ExternalLinkIcon />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nút Xem thêm */}
        <div className="bottom-bar">
          <button
            className="interaction-pill see-more-btn"
            onClick={scrollToMore}
            aria-label="Xem thêm"
          >
            <span>Xem thêm</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="toast" role="status">
            <span>{toastMessage}</span>
          </div>
        )}
      </footer>

      {/* Trang thứ 2: Visual Showcase (Bento Cards trực quan) */}
      <section id="more-section" className="more-section">
        <div className="more-section-content">
          {/* Header & Filter Tabs */}
          <div className="showcase-header">
            <span className="showcase-tag">OFFICIAL LINKS</span>
            <h2 className="showcase-title">Thông Tin Liên Hệ & Dự Án Nổi Bật</h2>
            <p className="showcase-desc">
              Tổng hợp các kênh mạng xã hội chính thức và sản phẩm cá nhân.
            </p>

            <div className="total-views-badge" title="Lượt xem trang">
              <EyeIcon />
              <span>{(views.page || views.total || 0).toLocaleString('vi-VN')} lượt xem</span>
            </div>

            {/* Category Filter Tabs: Tất cả -> Mạng xã hội -> Dự án Website */}
            <div className="category-tabs" role="tablist" aria-label="Bộ lọc danh mục">
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'all'}
                className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                Tất cả ({allSocialNetworks.length + myWebsites.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'social'}
                className={`category-tab ${activeCategory === 'social' ? 'active' : ''}`}
                onClick={() => setActiveCategory('social')}
              >
                Mạng xã hội ({allSocialNetworks.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'website'}
                className={`category-tab ${activeCategory === 'website' ? 'active' : ''}`}
                onClick={() => setActiveCategory('website')}
              >
                Dự án Website ({myWebsites.length})
              </button>
            </div>
          </div>

          {/* Mạng xã hội dạng Pill Link Buttons (Ảnh 1 / Beacons Style) */}
          {activeCategory === 'social' && (
            <div className="social-pills-container">
              {allSocialNetworks.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-pill-link"
                  onClick={() => incrementView(item.id)}
                  title={`Mở ${item.name}`}
                >
                  <div className="social-pill-icon-wrap">
                    <img src={item.icon} alt={item.name} loading="lazy" />
                  </div>
                  <div className="social-pill-content">
                    <span className="social-pill-name">{item.name}</span>
                    <span className="social-pill-handle">{item.handle}</span>
                  </div>
                  <div className="social-pill-right">
                    <div className="view-count-badge" title="Lượt xem">
                      <EyeIcon />
                      <span>{views[item.id] || 0}</span>
                    </div>
                    <div className="social-pill-arrow">
                      <ExternalLinkIcon />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Website dự án dạng thẻ to có Preview (Ảnh 2 / LinkMe Style) */}
          {activeCategory === 'website' && (
            <div className="visual-grid">
              {myWebsites.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="visual-card"
                  onClick={() => incrementView(item.id)}
                  title={`Truy cập ${item.name}`}
                >
                  {item.previewImage && (
                    <img
                      src={item.previewImage}
                      alt={item.name}
                      className="visual-card-bg"
                      loading="lazy"
                    />
                  )}
                  <div className="visual-card-scrim" />
                  <div className="visual-card-top">
                    <div className="visual-badge-logo">
                      <img src={item.icon} alt={item.name} />
                    </div>
                    <div className="view-count-badge visual-view-badge" title="Lượt xem">
                      <EyeIcon />
                      <span>{views[item.id] || 0}</span>
                    </div>
                  </div>
                  <div className="visual-card-bottom">
                    <span className="visual-card-name">{item.name}</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Tab Tất cả: Hiển thị cả Mạng xã hội và Website Dự án */}
          {activeCategory === 'all' && (
            <div style={{ width: '100%' }}>
              <div className="section-subheading">
                Mạng Xã Hội ({allSocialNetworks.length})
              </div>
              <div className="social-pills-container">
                {allSocialNetworks.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill-link"
                    onClick={() => incrementView(item.id)}
                    title={`Mở ${item.name}`}
                  >
                    <div className="social-pill-icon-wrap">
                      <img src={item.icon} alt={item.name} loading="lazy" />
                    </div>
                    <div className="social-pill-content">
                      <span className="social-pill-name">{item.name}</span>
                      <span className="social-pill-handle">{item.handle}</span>
                    </div>
                    <div className="social-pill-right">
                      <div className="view-count-badge" title="Lượt xem">
                        <EyeIcon />
                        <span>{views[item.id] || 0}</span>
                      </div>
                      <div className="social-pill-arrow">
                        <ExternalLinkIcon />
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              <div className="section-subheading" style={{ marginTop: '4rem' }}>
                Dự Án Website ({myWebsites.length})
              </div>
              <div className="visual-grid">
                {myWebsites.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="visual-card"
                    onClick={() => incrementView(item.id)}
                    title={`Truy cập ${item.name}`}
                  >
                    {item.previewImage && (
                      <img
                        src={item.previewImage}
                        alt={item.name}
                        className="visual-card-bg"
                        loading="lazy"
                      />
                    )}
                    <div className="visual-card-scrim" />
                    <div className="visual-card-top">
                      <div className="visual-badge-logo">
                        <img src={item.icon} alt={item.name} />
                      </div>
                      <div className="view-count-badge visual-view-badge" title="Lượt xem">
                        <EyeIcon />
                        <span>{views[item.id] || 0}</span>
                      </div>
                    </div>
                    <div className="visual-card-bottom">
                      <span className="visual-card-name">{item.name}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Footer Navigation: Back to Home */}
          <div className="showcase-footer">
            <button
              className="interaction-pill"
              onClick={() => smoothScrollTo(0, 900)}
              aria-label="Quay lại trang chính"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: 'rotate(180deg)' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Quay lại trang chính</span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
