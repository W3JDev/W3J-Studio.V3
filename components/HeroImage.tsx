/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';

const HeroImage: React.FC = () => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);
    
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) handleMove(e.clientX);
    }
    const handleTouchMove = (e: TouchEvent) => {
        if (isDragging) handleMove(e.touches[0].clientX);
    }
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove]);

  return (
    <div className="mt-8 w-full max-w-4xl mx-auto animate-fade-in">
      <div 
        ref={containerRef}
        className="relative w-full aspect-[4/3] sm:aspect-video select-none rounded-2xl overflow-hidden shadow-2xl shadow-black/50 cursor-ew-resize bg-[#2a2a2a]"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
                <filter id="old-photo-filter" x="-20%" y="-20%" width="140%" height="140%">
                    <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0" />
                    <feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0" result="sepia" />
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="noise"/>
                    <feDiffuseLighting in="noise" lightingColor="#8d7f6b" surfaceScale="2" result="light">
                        <feDistantLight azimuth="45" elevation="60" />
                    </feDiffuseLighting>
                    <feComposite in="sepia" in2="light" operator="arithmetic" k1="1" k2="0" k3="0.5" k4="0" result="faded"/>
                    <feGaussianBlur in="faded" stdDeviation="0.5" />
                </filter>
                <clipPath id="slider-clip">
                    <rect x="0" y="0" width={sliderPosition * 8} height="600" />
                </clipPath>
                 <radialGradient id="bg-gradient-after">
                    <stop offset="0%" stopColor="#6a7a8c" />
                    <stop offset="100%" stopColor="#303841" />
                </radialGradient>
                 <linearGradient id="skin-gradient-after" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde0d0" />
                    <stop offset="100%" stopColor="#e5b39e" />
                </linearGradient>
                <linearGradient id="hair-gradient-after" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3d2c1d" />
                    <stop offset="100%" stopColor="#1a120b" />
                </linearGradient>
                 <linearGradient id="dress-gradient-after" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2c5282" />
                    <stop offset="100%" stopColor="#1a365d" />
                </linearGradient>
            </defs>
            
            {/* Base Image (Before) */}
            <g filter="url(#old-photo-filter)">
                <rect width="800" height="600" fill="url(#bg-gradient-after)" />
                {/* Simplified Portrait for 'before' */}
                <path d="M400,150 Q400,300 300,320 L280,550 H520 L500,320 Q400,300 400,150 Z" fill="url(#skin-gradient-after)" />
                <path d="M400,130 Q300,100 280,200 Q350,250 400,230 Q450,250 520,200 Q500,100 400,130 Z" fill="url(#hair-gradient-after)" />
                <path d="M280,550 Q400,500 520,550 V600 H280 Z" fill="url(#dress-gradient-after)" />
                <path d="M380,550 L420,550 L400,500 Z" fill="#f0f0f0" />
            </g>

            {/* Scratches and Dust Overlay */}
            <g opacity="0.3" pointerEvents="none">
              <path d="M100 0 L 150 600" stroke="white" strokeWidth="0.7" opacity="0.5" />
              <path d="M650 0 L 580 600" stroke="#f0f0f0" strokeWidth="0.5" opacity="0.6" />
              <path d="M0 250 L 800 230" stroke="white" strokeWidth="0.4" opacity="0.4" />
              <circle cx="250" cy="180" r="1.5" fill="white" opacity="0.8" />
              <circle cx="530" cy="450" r="1" fill="white" opacity="0.7" />
              <circle cx="400" cy="300" r="2" fill="white" opacity="0.6" />
              <circle cx="150" cy="500" r="1.2" fill="#f0f0f0" opacity="0.7" />
            </g>

            {/* Clipped Image (After) */}
            <g clipPath="url(#slider-clip)">
                <rect width="800" height="600" fill="url(#bg-gradient-after)" />
                
                {/* Detailed Portrait for 'after' */}
                <g>
                    {/* Neck and Body */}
                    <path d="M360,320 C360,370 380,410 400,420 C420,410 440,370 440,320 L480,580 H320Z" fill="url(#skin-gradient-after)" />
                    <path d="M320,580 L480,580 C470,540 440,500 400,490 C360,500 330,540 320,580 Z" fill="url(#dress-gradient-after)" />
                    <path d="M380,495 L420,495 L400,460 Z" fill="#ffffff" />
                    
                    {/* Head */}
                    <ellipse cx="400" cy="270" rx="100" ry="130" fill="url(#skin-gradient-after)" />

                    {/* Hair */}
                    <path d="M400,120 C300,120 280,220 300,300 C330,230 350,200 400,200 C450,200 470,230 500,300 C520,220 500,120 400,120Z" fill="url(#hair-gradient-after)" />
                    <path d="M310,140 C330,150 350,140 360,120" stroke="#5a3d2d" strokeWidth="3" fill="none" />
                    <path d="M490,140 C470,150 450,140 440,120" stroke="#5a3d2d" strokeWidth="3" fill="none" />

                    {/* Eyes */}
                    <ellipse cx="360" cy="260" rx="18" ry="12" fill="white" />
                    <circle cx="360" cy="260" r="8" fill="#5D4037" />
                    <circle cx="363" cy="257" r="3" fill="white" />
                    <path d="M340,255 C350,245 370,245 380,255" stroke="#795548" strokeWidth="3" fill="none" />

                    <ellipse cx="440" cy="260" rx="18" ry="12" fill="white" />
                    <circle cx="440" cy="260" r="8" fill="#5D4037" />
                    <circle cx="443" cy="257" r="3" fill="white" />
                    <path d="M420,255 C430,245 450,245 460,255" stroke="#795548" strokeWidth="3" fill="none" />
                    
                    {/* Nose */}
                    <path d="M400,280 C395,300 405,300 400,280 L400,310" stroke="#d4a38c" strokeWidth="2" fill="none"/>
                    
                    {/* Mouth */}
                    <path d="M380,335 C390,345 410,345 420,335" stroke="#c27a7a" strokeWidth="4" fill="none" />
                </g>
            </g>
        </svg>

        {/* Slider Handle */}
        <div 
            className="absolute top-0 bottom-0 w-1 bg-white/50 backdrop-blur-sm shadow-lg pointer-events-none"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-sm ring-2 ring-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
            </div>
        </div>
        
        {/* Labels */}
        <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 rounded-full text-white font-semibold text-sm pointer-events-none backdrop-blur-sm">
            Before
        </div>
        <div 
            className="absolute top-4 right-4 px-3 py-1 bg-black/60 rounded-full text-white font-semibold text-sm pointer-events-none backdrop-blur-sm"
            style={{ 
                opacity: sliderPosition > 70 ? 1 : 0, 
                transition: 'opacity 0.3s ease-in-out' 
            }}
        >
            After
        </div>
      </div>
    </div>
  );
};

export default HeroImage;