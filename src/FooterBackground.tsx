import { useEffect, useRef } from 'react';
import gazeFrames from './gaze-frames.json';

const TAU = Math.PI * 2;
const wrappedAngle = (angle: number) => ((angle % TAU) + TAU) % TAU;

// Tính khoảng cách góc ngắn nhất trên vòng tròn [-PI, PI]
function angleDifference(target: number, current: number) {
  let diff = (target - current) % TAU;
  if (diff > Math.PI) diff -= TAU;
  if (diff < -Math.PI) diff += TAU;
  return diff;
}

// Tra cứu thời gian video tương ứng với góc mắt
function timeForAngle(angle: number) {
  const target = wrappedAngle(angle);
  let nearestTime = gazeFrames[0][1];
  let nearestDistance = Infinity;
  for (const [sampleAngle, time] of gazeFrames) {
    const difference = Math.abs(target - sampleAngle);
    const distance = Math.min(difference, TAU - difference);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTime = time;
    }
  }
  return nearestTime + 1 / 240;
}

export default function FooterBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let frame = 0;
    let desiredTime = 0;
    let currentAngle = 0;
    let targetAngle = 0;
    let initialized = false;
    let pointer: { x: number; y: number } | null = null;
    let disposed = false;
    let eyeCenterX = 0;
    let eyeCenterY = 0;

    const mobile = window.matchMedia('(max-width: 768px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Sửa triệt để lỗi Safari / iOS WebKit React muted bug
    video.defaultMuted = true;
    video.muted = true;

    // Cập nhật vị trí tâm mắt khi tải / resize / cuộn trang
    const updateMetrics = () => {
      if (!video) return;
      const rect = video.getBoundingClientRect();
      const scale = Math.max(rect.width / 1920, rect.height / 1080);
      eyeCenterX = rect.left + rect.width / 2 + (948 - 960) * scale;
      eyeCenterY = rect.top + rect.height / 2 + (418 - 540) * scale;
    };

    const applySeek = () => {
      frame = 0;
      if (disposed || mobile.matches || !video || video.readyState < 2) return;

      if (pointer) {
        const dx = pointer.x - eyeCenterX;
        const dy = pointer.y - eyeCenterY;
        if (dx * dx + dy * dy > 64) {
          // Bán kính tối thiểu 8px quanh tâm mắt
          targetAngle = wrappedAngle(Math.atan2(dy, dx));
          if (!initialized) {
            currentAngle = targetAngle;
            initialized = true;
          }
        }
      }

      // Giảm tốc chuyển động (Damping/Lerp): tạo độ mượt êm dịu, không giật cục
      const diff = angleDifference(targetAngle, currentAngle);
      const isDamping = Math.abs(diff) > 0.008;

      if (isDamping) {
        // Hệ số 0.16 giúp mắt lướt đằm, tự nhiên và êm dịu hơn
        currentAngle = wrappedAngle(currentAngle + diff * 0.16);
      } else {
        currentAngle = targetAngle;
      }

      desiredTime = timeForAngle(currentAngle);

      // Tua video đến vị trí thời gian đã làm mượt
      if (!video.seeking) {
        const timeDiff = Math.abs(video.currentTime - desiredTime);
        if (timeDiff > 1 / 48) {
          const maxTime = (video.duration || 7.04) - 1 / 24;
          const target = Math.min(Math.max(0, desiredTime), maxTime);

          if ('fastSeek' in video && typeof video.fastSeek === 'function') {
            video.fastSeek(target);
          } else {
            video.currentTime = target;
          }
        }
      }

      // Nếu mắt vẫn đang lướt tới đích, tiếp tục lên lịch frame tiếp theo
      if (isDamping && !frame && !disposed) {
        frame = requestAnimationFrame(applySeek);
      }
    };

    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(applySeek);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (mobile.matches) return;
      pointer = { x: e.clientX, y: e.clientY };
      schedule();
    };

    const onSeeked = () => {
      if (!disposed && !mobile.matches) {
        schedule();
      }
    };

    const onReady = () => {
      updateMetrics();
      video.loop = mobile.matches;

      if (mobile.matches && !reducedMotion.matches) {
        void video.play().catch(() => {});
      } else {
        video.pause();
        if (!mobile.matches) {
          schedule();
        }
      }
    };

    const handleFirstTouch = () => {
      if (video && video.paused && mobile.matches) {
        void video.play().catch(() => {});
      }
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('pointerdown', handleFirstTouch);
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadeddata', onReady);
    mobile.addEventListener('change', onReady);
    reducedMotion.addEventListener('change', onReady);

    window.addEventListener('touchstart', handleFirstTouch, { passive: true });
    window.addEventListener('pointerdown', handleFirstTouch, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', updateMetrics, { passive: true });
    window.addEventListener('scroll', updateMetrics, { passive: true });

    if (video.readyState >= 2) {
      onReady();
    }

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onReady);
      mobile.removeEventListener('change', onReady);
      reducedMotion.removeEventListener('change', onReady);
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('pointerdown', handleFirstTouch);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('scroll', updateMetrics);
    };
  }, []);

  return (
    <div className="footer-background" aria-hidden="true">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        poster="/footer-poster.webp"
        src="/footer-scrub.mp4#t=0.001"
      />
    </div>
  );
}
