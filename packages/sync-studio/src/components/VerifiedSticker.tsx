import React, { useState } from 'react';

export interface VerifiedStickerProps {
  tier?: 'admin' | 'contributor';
  size?: 'sm' | 'md' | 'lg';
  showLabelOnHover?: boolean;
  className?: string;
}

export const VerifiedSticker: React.FC<VerifiedStickerProps> = ({
  tier = 'contributor',
  size = 'md',
  showLabelOnHover = true,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isAdmin = tier === 'admin';

  const sizePixels = {
    sm: { dimension: 16, icon: 10, fontSize: 10, padding: '1px 5px' },
    md: { dimension: 20, icon: 12, fontSize: 11, padding: '2px 7px' },
    lg: { dimension: 26, icon: 15, fontSize: 12, padding: '3px 10px' },
  }[size];

  return (
    <span
      className={`verified-sticker-wrapper ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        position: 'relative',
        cursor: 'default',
        userSelect: 'none',
      }}
      title={isAdmin ? 'Administrator' : 'Verified Contributor'}
      aria-label={isAdmin ? 'Administrator' : 'Verified Contributor'}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: sizePixels.dimension,
          minWidth: sizePixels.dimension,
          borderRadius: 9999,
          padding: isHovered && showLabelOnHover ? sizePixels.padding : `0 ${sizePixels.dimension * 0.15}px`,
          background: isAdmin
            ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 35%, #fbbf24 70%, #f59e0b 100%)'
            : 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #38bdf8 100%)',
          boxShadow: isAdmin
            ? isHovered
              ? '0 0 14px rgba(245, 158, 11, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.6)'
              : '0 0 8px rgba(245, 158, 11, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
            : isHovered
            ? '0 0 12px rgba(56, 189, 248, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
            : '0 0 6px rgba(56, 189, 248, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
          border: isAdmin ? '1px solid #fef08a' : '1px solid #7dd3fc',
          color: isAdmin ? '#451a03' : '#082f49',
          fontWeight: 800,
          fontSize: sizePixels.fontSize,
          letterSpacing: '0.02em',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Animated Checkmark SVG */}
        <svg
          width={sizePixels.icon}
          height={sizePixels.icon}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            animation: isAdmin ? 'brusGoldCheck 2s ease-in-out infinite' : 'none',
          }}
        >
          <polyline points="3 8.5 6.5 12 13 4.5" />
        </svg>

        {/* Text revealed on hover */}
        {showLabelOnHover && (
          <span
            style={{
              maxWidth: isHovered ? 120 : 0,
              opacity: isHovered ? 1 : 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              textTransform: 'uppercase',
              fontSize: sizePixels.fontSize,
              lineHeight: 1,
            }}
          >
            {isAdmin ? 'Admin' : 'Verified'}
          </span>
        )}
      </span>

      <style>{`
        @keyframes brusGoldCheck {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.8));
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 4px rgba(255, 255, 255, 1));
          }
        }
      `}</style>
    </span>
  );
};

export default VerifiedSticker;
