import React from 'react';

export default function ChatWatermark() {
  return (
    <div className="wm" aria-hidden="true">
      <div className="wm-grid" />
      <div className="wm-glow" />
      <div className="wm-beam" />
      <div className="wm-text">VELOX</div>

      <div className="wm-vwrap">
        <svg viewBox="0 0 320 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wmg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2dd4bf" />
              <stop offset=".5" stopColor="#6366f1" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
            <polygon id="wmv" points="20,70 82,70 160,254 238,70 300,70 190,330 130,330" />
          </defs>
          <g fill="none" stroke="url(#wmg)" strokeLinejoin="round" strokeWidth="2.5">
            <use href="#wmv" className="wm-e wm-e1" transform="translate(0,-66)" strokeOpacity=".16" />
            <use href="#wmv" className="wm-e wm-e2" transform="translate(0,-44)" strokeOpacity=".26" />
            <use href="#wmv" className="wm-e wm-e3" transform="translate(0,-22)" strokeOpacity=".38" />
            <use href="#wmv" className="wm-e wm-e4" fill="url(#wmg)" fillOpacity=".08" strokeOpacity=".55" />
          </g>
        </svg>
      </div>
    </div>
  );
}
