/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CreditIcon, UploadIcon } from './icons';

interface PhotoLabPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  onApplyFilter: (prompt: string) => void;
  onApplyEffect: (prompt: string, name: string) => void;
  onApplySharpen: (intensity: number) => void;
  onApplyStyleTransfer: (styleImage: File, intensity: number) => void;
  isLoading: boolean;
  photoLabHotspot: { x: number, y: number } | null;
  onClearPhotoLabHotspot: () => void;
}

type SubTab = 'adjust' | 'sharpen' | 'style' | 'filters' | 'effects';

interface AdjustmentComponentProps {
    onApplyAdjustment: (prompt: string) => void;
    isLoading: boolean;
    hotspot: { x: number, y: number } | null;
    onClearHotspot: () => void;
}

const AdjustmentComponent: React.FC<AdjustmentComponentProps> = ({ onApplyAdjustment, isLoading, hotspot, onClearHotspot }) => {
    const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const presets = [
        { name: 'Blur Background', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
        { name: 'Enhance Details', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.' },
        { name: 'Warmer Lighting', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
        { name: 'Studio Light', prompt: 'Add dramatic, professional studio lighting to the main subject.' },
    ];
    const activePrompt = selectedPresetPrompt || customPrompt;
    const handlePresetClick = (prompt: string) => { setSelectedPresetPrompt(prompt); setCustomPrompt(''); };
    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => { setCustomPrompt(e.target.value); setSelectedPresetPrompt(null); };
    return (
        <div className="flex flex-col gap-4">
            <div className="text-center">
                 <h3 className="text-md font-semibold text-[var(--text-secondary)]">Apply a Professional Adjustment</h3>
                 {hotspot ? (
                     <div className="text-sm text-cyan-400 mt-1 flex items-center justify-center gap-2">
                         <span>Localized effect area selected.</span>
                         <button onClick={onClearHotspot} className="text-xs bg-white/10 px-2 py-0.5 rounded hover:bg-white/20">Clear</button>
                     </div>
                 ) : (
                     <p className="text-sm text-gray-500 mt-1">Click on the image to apply a localized effect.</p>
                 )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {presets.map(p => <button key={p.name} onClick={() => handlePresetClick(p.prompt)} disabled={isLoading} className={`w-full text-center bg-black/20 border border-white/10 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/30 hover:text-white active:scale-95 text-sm disabled:opacity-50 ${selectedPresetPrompt === p.prompt ? 'ring-2 ring-cyan-500 text-white' : ''}`}>{p.name}</button>)}
            </div>
            <input type="text" value={customPrompt} onChange={handleCustomChange} placeholder="Or describe an adjustment..." className="bg-black/30 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-4 focus:ring-2 focus:ring-cyan-500 w-full disabled:opacity-60" disabled={isLoading} />
            <button onClick={() => activePrompt && onApplyAdjustment(activePrompt)} className="w-full bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 ease-in-out hover:bg-cyan-600 disabled:opacity-50" disabled={isLoading || !activePrompt?.trim()}>Apply Adjustment</button>
        </div>
    );
};

const FilterComponent: React.FC<Pick<PhotoLabPanelProps, 'onApplyFilter' | 'isLoading'>> = ({ onApplyFilter, isLoading }) => {
    const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const presets = [
        { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.' },
        { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.' },
        { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.' },
        { name: 'Glitch', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.' },
    ];
    const activePrompt = selectedPresetPrompt || customPrompt;
    const handlePresetClick = (prompt: string) => { setSelectedPresetPrompt(prompt); setCustomPrompt(''); };
    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => { setCustomPrompt(e.target.value); setSelectedPresetPrompt(null); };
    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-md font-semibold text-center text-[var(--text-secondary)]">Apply a Creative Filter</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {presets.map(p => <button key={p.name} onClick={() => handlePresetClick(p.prompt)} disabled={isLoading} className={`w-full text-center bg-black/20 border border-white/10 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/30 hover:text-white active:scale-95 text-sm disabled:opacity-50 ${selectedPresetPrompt === p.prompt ? 'ring-2 ring-cyan-500 text-white' : ''}`}>{p.name}</button>)}
            </div>
            <input type="text" value={customPrompt} onChange={handleCustomChange} placeholder="Or describe a custom filter..." className="bg-black/30 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-4 focus:ring-2 focus:ring-cyan-500 w-full disabled:opacity-60" disabled={isLoading} />
            <button onClick={() => activePrompt && onApplyFilter(activePrompt)} className="w-full bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 ease-in-out hover:bg-cyan-600 disabled:opacity-50" disabled={isLoading || !activePrompt?.trim()}>Apply Filter</button>
        </div>
    );
};

const EffectsComponent: React.FC<Pick<PhotoLabPanelProps, 'onApplyEffect' | 'isLoading'>> = ({ onApplyEffect, isLoading }) => {
    const presets = [
        { name: 'Lens Flare', prompt: 'Add a subtle and realistic anamorphic lens flare coming from the brightest light source in the image.' },
        { name: 'Bokeh Orbs', prompt: 'Add beautiful, soft, out-of-focus bokeh orbs to the background, enhancing the sense of depth.' },
        { name: 'Light Leaks', prompt: 'Apply a vintage-style light leak effect with warm orange and red tones coming from the edge of the frame.' },
        { name: 'Vintage Grain', prompt: 'Add a layer of realistic, subtle film grain to the entire image for a nostalgic, cinematic feel.' },
    ];
    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-md font-semibold text-center text-[var(--text-secondary)]">Apply Visual Effects</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {presets.map(p => <button key={p.name} onClick={() => onApplyEffect(p.prompt, p.name)} disabled={isLoading} className="w-full h-24 text-center bg-black/20 border border-white/10 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/30 hover:text-white active:scale-95 text-sm disabled:opacity-50">{p.name}</button>)}
            </div>
        </div>
    );
};

const SharpenComponent: React.FC<Pick<PhotoLabPanelProps, 'onApplySharpen' | 'isLoading'>> = ({ onApplySharpen, isLoading }) => {
    const [intensity, setIntensity] = useState(50);
    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-md font-semibold text-center text-[var(--text-secondary)]">Sharpen Image</h3>
            <div className="flex flex-col gap-2 animate-fade-in">
                <label htmlFor="sharpen-slider" className="font-semibold text-[var(--text-primary)]">Intensity: <span className="text-cyan-400">{intensity}%</span></label>
                <input
                    id="sharpen-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={intensity}
                    onChange={e => setIntensity(Number(e.target.value))}
                    className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    disabled={isLoading}
                />
            </div>
            <button onClick={() => onApplySharpen(intensity)} className="w-full bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 ease-in-out hover:bg-cyan-600 disabled:opacity-50" disabled={isLoading}>Apply Sharpen</button>
        </div>
    );
};

const StyleTransferComponent: React.FC<Pick<PhotoLabPanelProps, 'onApplyStyleTransfer' | 'isLoading'>> = ({ onApplyStyleTransfer, isLoading }) => {
    const [intensity, setIntensity] = useState(75);
    const [styleImageFile, setStyleImageFile] = useState<File | null>(null);
    const [styleImageUrl, setStyleImageUrl] = useState<string | null>(null);

    useEffect(() => {
        // Cleanup function to revoke the object URL when the component unmounts or the image changes
        return () => {
            if (styleImageUrl) {
                URL.revokeObjectURL(styleImageUrl);
            }
        };
    }, [styleImageUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setStyleImageFile(file);
            const url = URL.createObjectURL(file);
            setStyleImageUrl(url);
        }
    };

    const handleApply = () => {
        if (styleImageFile) {
            onApplyStyleTransfer(styleImageFile, intensity);
        }
    };
    
    return (
        <div className="flex flex-col gap-4">
            <div className="text-center">
                <h3 className="text-md font-semibold text-[var(--text-secondary)]">Transfer Style from another Image</h3>
                <div className="text-sm text-purple-400 mt-1 flex items-center justify-center gap-2">
                    <CreditIcon className="w-4 h-4"/> <span>Premium Feature</span>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <label htmlFor="style-upload" className="w-32 h-32 flex-shrink-0 bg-black/20 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-black/30 hover:border-cyan-500 transition-colors">
                    {styleImageUrl ? (
                        <img src={styleImageUrl} alt="Style reference" className="w-full h-full object-cover rounded-md" />
                    ) : (
                        <>
                            <UploadIcon className="w-8 h-8 text-gray-400" />
                            <span className="text-xs text-center text-gray-400 mt-2">Upload Style Image</span>
                        </>
                    )}
                </label>
                <input id="style-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />

                <div className="flex flex-col gap-2 w-full">
                    <label htmlFor="style-intensity-slider" className="font-semibold text-[var(--text-primary)]">Style Intensity: <span className="text-cyan-400">{intensity}%</span></label>
                    <input
                        id="style-intensity-slider"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={intensity}
                        onChange={e => setIntensity(Number(e.target.value))}
                        className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        disabled={isLoading}
                    />
                     <p className="text-xs text-gray-500">How strongly the style should be applied.</p>
                </div>
            </div>
            
            <button onClick={handleApply} className="w-full bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 ease-in-out hover:bg-cyan-600 disabled:opacity-50" disabled={isLoading || !styleImageFile}>Apply Style Transfer</button>
        </div>
    );
};


const PhotoLabPanel: React.FC<PhotoLabPanelProps> = (props) => {
    const [activeTab, setActiveTab] = useState<SubTab>('adjust');

    const subTabs: { id: SubTab, name: string }[] = [
        { id: 'adjust', name: 'Adjust' },
        { id: 'sharpen', name: 'Sharpen' },
        { id: 'style', name: 'Style Transfer' },
        { id: 'filters', name: 'Filters' },
        { id: 'effects', name: 'Effects' },
    ];

    return (
        <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6 flex flex-col gap-6 animate-fade-in backdrop-blur-xl">
            <div className="w-full bg-black/20 border-transparent rounded-xl p-1 flex items-center justify-start sm:justify-center gap-1 overflow-x-auto">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full sm:w-auto flex-shrink-0 capitalize font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm ${
                            activeTab === tab.id
                                ? 'bg-white/10 text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>
            
            <div className="animate-fade-in">
                {activeTab === 'adjust' && <AdjustmentComponent 
                    onApplyAdjustment={props.onApplyAdjustment} 
                    isLoading={props.isLoading} 
                    hotspot={props.photoLabHotspot}
                    onClearHotspot={props.onClearPhotoLabHotspot}
                />}
                {activeTab === 'filters' && <FilterComponent onApplyFilter={props.onApplyFilter} isLoading={props.isLoading} />}
                {activeTab === 'effects' && <EffectsComponent onApplyEffect={props.onApplyEffect} isLoading={props.isLoading} />}
                {activeTab === 'sharpen' && <SharpenComponent onApplySharpen={props.onApplySharpen} isLoading={props.isLoading} />}
                {activeTab === 'style' && <StyleTransferComponent onApplyStyleTransfer={props.onApplyStyleTransfer} isLoading={props.isLoading} />}
            </div>
        </div>
    );
};

export default PhotoLabPanel;
