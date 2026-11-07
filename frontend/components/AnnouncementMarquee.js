import { useEffect, useState } from 'react';
import Link from 'next/link';

function AnnouncementIcon() {
  return (
    <svg className="portal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 10v4h3l10 4V6L6 10H3Zm3 4 1.5 5h3L8 14m10-5a5 5 0 0 1 0 6m2-8a8 8 0 0 1 0 10" />
    </svg>
  );
}

export default function AnnouncementMarquee({
  announcements,
  label = '店家公告',
  ariaLabel = '店家公告',
  href,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || !announcements.length) return undefined;
    const timer = setTimeout(() => {
      setActiveIndex((index) => index + 1);
    }, 16_800);
    return () => clearTimeout(timer);
  }, [activeIndex, announcements.length, paused]);

  if (!announcements.length) return null;

  const announcement = announcements[activeIndex % announcements.length];
  const content = (
    <>
      <div className="portal-announcement-label">
        <AnnouncementIcon />
        <span>{label}</span>
      </div>
      <div className="portal-marquee">
        <div className={`portal-marquee-track${paused ? ' is-paused' : ''}`}>
          <span className="portal-marquee-item" key={`${announcement.id}-${activeIndex}`}>
            <strong>{announcement.name}</strong>
            <span>{announcement.announcement}</span>
          </span>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        className="portal-announcement"
        href={href}
        aria-label={ariaLabel}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className="portal-announcement shop-home-announcement"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {content}
    </div>
  );
}
