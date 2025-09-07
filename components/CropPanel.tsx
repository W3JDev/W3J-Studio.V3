/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface CropPanelProps {
  onApplyCrop: () => void;
  onSetAspect: (aspect: number | undefined) => void;
  isLoading: boolean;
  isCropping: boolean;
}

const CropPanel: React.FC<CropPanelProps> = ({ onApplyCrop, onSetAspect, isLoading, isCropping }) => {
  const [activeAspect, setActiveAspect] = useState<string>('Free');
  
  const handleAspectChange = (name: string, value: number | undefined) => {
    setActiveAspect(name);
    onSetAspect(value);
  }

  const aspects: { name: string, value: number | undefined }[] = [
    { name: 'Free', value: undefined },
    { name: 'Square', value: 1 / 1 },
    { name: 'Portrait', value: 4 / 5 },
    { name: 'Landscape', value: 16 / 9 },
    { name: 'Story', value: 9 / 16 },
  ];

  return (
    <div className="w-full bg-black/20 rounded-xl p-6 flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Crop Image</h3>
      <p className="text-sm text-[var(--text-secondary)] -mt-2 text-center">Select an aspect ratio, then drag the handles on the image to crop.</p>
      
      <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg flex-wrap justify-center">
        {aspects.map(({ name, value }) => (
          <button
            key={name}
            onClick={() => handleAspectChange(name, value)}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-sm sm:text-base font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
              activeAspect === name 
              ? 'bg-white/10 text-white shadow-md' 
              : 'bg-transparent hover:bg-white/5 text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <button
        onClick={onApplyCrop}
        disabled={isLoading || !isCropping}
        className="w-full max-w-xs mt-2 bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-50 disabled:bg-green-500/50 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        Apply Crop
      </button>
    </div>
  );
};

export default CropPanel;