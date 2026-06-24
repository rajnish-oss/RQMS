import React, { useId } from 'react';

const Loading = () => {
  const gradientId = useId();

  return (
    <div className="flex h-24 w-24 items-center justify-center" aria-label="Loading">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 200 200"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="0%" stopColor="#2E00FF" stopOpacity="0" />
            <stop offset="100%" stopColor="#2E00FF" stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="24"
          strokeLinecap="round"
          strokeDasharray="0 44 0 44 0 44 0 44 0 360"
          cx="100"
          cy="100"
          r="70"
          transformOrigin="100 100"
        >
          <animateTransform
            type="rotate"
            attributeName="transform"
            calcMode="discrete"
            dur="2s"
            values="360;324;288;252;216;180;144;108;72;36"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
};

export default Loading;