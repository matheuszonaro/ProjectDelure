import { useId } from 'react';

/**
 * Delure brand mark — a white "D" letterform on an ember gradient square.
 * The right curve of the D has a circular notch (like a game-controller button)
 * making the mark distinctive at any size.
 *
 * Each instance uses a unique gradient ID to avoid SVG conflicts when rendered
 * more than once on the same page.
 */
export function DelureLogo({ size = 32 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gId = `dlr-g-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Delure"
    >
      <defs>
        <linearGradient id={gId} x1="1" y1="1" x2="31" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59060" />
          <stop offset="1" stopColor="#B83C0E" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="32" height="32" rx="8" fill={`url(#${gId})`} />

      {/* Subtle top highlight */}
      <rect x="0" y="0" width="32" height="14" rx="8" fill="white" fillOpacity="0.11" />

      {/*
        D letterform — three subpaths, fill-rule evenodd:
          1. Outer D boundary        → fills white
          2. Inner hollow            → cancels (shows orange)
          3. Right-curve button notch → cancels (shows orange)
        The notch sits perfectly centred in the right wall, referencing a
        game-controller face button and the price-tracker "alert dot" concept.
      */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={[
          // outer D
          'M8,7 H14 C21,7 26,11.5 26,16 C26,20.5 21,25 14,25 H8 Z',
          // inner hollow
          'M11,10 H14 C18.5,10 21,12.5 21,16 C21,19.5 18.5,22 14,22 H11 Z',
          // button notch — circle r=2 centred at (23.5, 16)
          'M21.5,16 a2,2,0,0,1,4,0 a2,2,0,0,1,-4,0 Z',
        ].join(' ')}
        fill="white"
      />
    </svg>
  );
}
