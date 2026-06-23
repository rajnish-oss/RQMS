import React from 'react';

const Loading = () => {
  return (
    <div className="flex h-24 w-24 items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <linearGradient id="a10">
          <stop offset="0" stopColor="#2E00FF" stopOpacity="0" />
          <stop offset="1" stopColor="#2E00FF" />
        </linearGradient>
        <circle
          fill="none"
          stroke="url(#a10)"
          strokeWidth="24"
          strokeLinecap="round"
          strokeDasharray="0 44 0 44 0 44 0 44 0 360"
          cx="100"
          cy="100"
          r="70"
          transformOrigin="center"
        >
          <animateTransform
            type="rotate"
            attributeName="transform"
            calcMode="discrete"
            dur="2"
            values="360;324;288;252;216;180;144;108;72;36"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
};

export default Loading;
