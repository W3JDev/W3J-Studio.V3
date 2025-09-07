/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import EditToolbar from './EditToolbar';
import PhotoLabPanel from './PhotoLabPanel';
import CropPanel from './CropPanel';
import type { EditTool } from '../App';

// Props for EditToolbar
interface EditToolbarProps {
    prompt: string;
    onPromptChange: (value: string) => void;
    onGenerate: () => void;
    onRemove: () => void;
    isEnhancing: boolean;
    onEnhance: () => void;
    activeTool: EditTool;
    onToolChange: (tool: EditTool) => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    canGenerate: boolean;
    canRemove: boolean;
    activeLayer: { id: string, prompt: string } | null;
    maskImage: string | null;
}

// Props for PhotoLabPanel
interface PhotoLabPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  onApplyFilter: (prompt: string) => void;
  onApplyEffect: (prompt: string, name: string) => void;
  onApplySharpen: (intensity: number) => void;
  onApplyStyleTransfer: (styleImage: File, intensity: number) => void;
  photoLabHotspot: { x: number, y: number } | null;
  onClearPhotoLabHotspot: () => void;
}

// Props for CropPanel
interface CropPanelProps {
  onApplyCrop: () => void;
  onSetAspect: (aspect: number | undefined) => void;
  isCropping: boolean;
}

// Combined props for ProEditorPanel
interface ProEditorPanelProps extends EditToolbarProps, PhotoLabPanelProps, CropPanelProps {
    isLoading: boolean;
}

type SubTab = 'generative' | 'adjust' | 'crop';


const ProEditorPanel: React.FC<ProEditorPanelProps> = (props) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('generative');

     const subTabs: { id: SubTab, name: string }[] = [
        { id: 'generative', name: 'Generative' },
        { id: 'adjust', name: 'Adjust' },
        { id: 'crop', name: 'Crop' },
    ];

    return (
        <div className="w-full flex flex-col gap-4 animate-fade-in">
             <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-2 flex items-center justify-start sm:justify-center gap-1 backdrop-blur-xl overflow-x-auto">
                {subTabs.map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        title={tab.name}
                        className={`w-full sm:w-auto flex-shrink-0 capitalize font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-base ${
                            activeSubTab === tab.id 
                            ? 'bg-white/10 text-white shadow-lg' 
                            : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            {activeSubTab === 'generative' && <EditToolbar {...props} />}
            {activeSubTab === 'adjust' && <PhotoLabPanel {...props} />}
            {activeSubTab === 'crop' && <CropPanel {...props} />}
        </div>
    );
};

export default ProEditorPanel;