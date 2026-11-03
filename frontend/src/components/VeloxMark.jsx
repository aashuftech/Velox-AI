import React from 'react';

// VeloxMark.jsx - Modern sliced V brand logo
export default function VeloxMark({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Velox AI"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        <linearGradient
          id="vsg"
          gradientUnits="userSpaceOnUse"
          x1="8"
          y1="6"
          x2="40"
          y2="42"
        >
          <stop offset="0" stopColor="#2fb8a8" />
          <stop offset=".5" stopColor="#5b5ed6" />
          <stop offset="1" stopColor="#8b52cc" />
        </linearGradient>

        {/* ye mask V me diagonal cut (slash) banata hai */}
        <mask id="vsmask">
          <rect width="48" height="48" fill="#fff" />
          <path d="M27.5 4L18.5 44" stroke="#000" strokeWidth="3" />
        </mask>
      </defs>

      <polygon
        points="6,9 17.5,9 24,25 30.5,9 42,9 28.5,40 19.5,40"
        fill="url(#vsg)"
        mask="url(#vsmask)"
      />
    </svg>
  );
}
