import React from 'react';

interface LogoIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  size = 24,
  className = '',
  style,
  color,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill={color || 'currentColor'}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 264,126 L 385,127 L 386,406 L 396,393 L 430,362 L 461,343 L 487,334 L 516,329 L 555,328 L 594,333 L 628,343 L 662,360 L 688,379 L 711,401 L 732,428 L 743,446 L 760,484 L 768,512 L 774,552 L 774,599 L 771,624 L 760,667 L 744,703 L 720,739 L 693,767 L 678,779 L 649,797 L 612,812 L 580,819 L 564,821 L 521,821 L 499,818 L 466,809 L 434,793 L 414,778 L 396,760 L 385,746 L 371,810 L 264,810 L 264,127 Z M 651,560 L 652,573 L 650,599 L 645,625 L 640,638 L 626,661 L 618,672 L 598,691 L 574,705 L 561,710 L 547,713 L 520,716 L 492,714 L 479,711 L 454,702 L 432,688 L 414,670 L 400,649 L 391,627 L 385,604 L 383,560 L 386,539 L 396,509 L 406,490 L 427,466 L 435,459 L 464,443 L 484,437 L 517,433 L 551,437 L 562,440 L 593,456 L 612,471 L 634,500 L 647,535 L 649,547 Z"
      />
    </svg>
  );
};

export default LogoIcon;
