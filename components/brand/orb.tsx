type OrbProps = {
  size?: number;
  className?: string;
};

/**
 * AlphaCatcher 브랜드 마크(점 궤도).
 * 색은 디자인 토큰 기준: 안쪽 코어 = primary(--signal), 바깥 궤도 = foreground(--ink).
 */
export function Orb({ size = 32, className }: OrbProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <g className="fill-primary">
        <circle cx="16" cy="16" r="4" />
        <circle cx="19.7" cy="17.5" r="1.7" />
        <circle cx="17.5" cy="19.7" r="1.7" />
        <circle cx="14.5" cy="19.7" r="1.7" />
        <circle cx="12.3" cy="17.5" r="1.7" />
        <circle cx="12.3" cy="14.5" r="1.7" />
        <circle cx="14.5" cy="12.3" r="1.7" />
        <circle cx="17.5" cy="12.3" r="1.7" />
        <circle cx="19.7" cy="14.5" r="1.7" />
      </g>
      <g className="fill-foreground opacity-50">
        <circle cx="24" cy="18.2" r="1.2" />
        <circle cx="21.9" cy="21.9" r="1.1" />
        <circle cx="18" cy="24.1" r="1.15" />
        <circle cx="13.6" cy="23.9" r="1.2" />
        <circle cx="10" cy="21.4" r="1.1" />
        <circle cx="8" cy="17.7" r="1.1" />
        <circle cx="8.1" cy="13.3" r="1.15" />
        <circle cx="10.4" cy="9.8" r="1.15" />
        <circle cx="14.1" cy="7.9" r="1.1" />
        <circle cx="18.4" cy="8.1" r="1.05" />
        <circle cx="22" cy="10.4" r="1.15" />
        <circle cx="24" cy="14.2" r="1.1" />
      </g>
    </svg>
  );
}
