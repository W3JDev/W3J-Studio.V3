/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CreditIcon, DocumentIcon, FaceSmileIcon, ProfilePictureIcon, UserCircleIcon } from './icons';

interface PortraitStudioPanelProps {
  onApplySolution: (tool: { name: string; prompt: string; isHighValue: boolean; action?: string; }) => void;
  onApplyRetouch: (prompt: string, name: string) => void;
  isLoading: boolean;
  photoLabHotspot: { x: number, y: number } | null;
  onClearPhotoLabHotspot: () => void;
}

const ToolButton: React.FC<{tool: any, onClick: () => void, isPro: boolean, isLoading: boolean}> = ({ tool, onClick, isPro, isLoading }) => (
    <button onClick={onClick} disabled={isLoading} className="relative flex flex-col items-center text-center p-4 bg-black/20 rounded-xl border border-white/10 hover:bg-white/5 hover:border-cyan-500/50 transition-all duration-200 disabled:opacity-50 group hover:-translate-y-1">
        {tool.isHighValue && !isPro && <div className="absolute top-2 right-2 text-xs font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-500/30"><CreditIcon className="w-3 h-3"/>1</div>}
        <tool.icon className="w-8 h-8 mb-3 text-cyan-400 transition-transform group-hover:scale-110" />
        <h4 className="font-semibold text-[var(--text-primary)] text-sm">{tool.name}</h4>
        <p className="text-xs text-[var(--text-secondary)] mt-1 flex-grow">{tool.description}</p>
    </button>
);


const PortraitStudioPanel: React.FC<PortraitStudioPanelProps> = ({ onApplySolution, onApplyRetouch, isLoading, photoLabHotspot, onClearPhotoLabHotspot }) => {
    const { isPro } = useAuth();
    const [showRetouchError, setShowRetouchError] = useState(false);
    
    const oneClickTools: { name: string; description: string; icon: React.FC<{ className?: string; }>; prompt: string; isHighValue: boolean; action?: string; }[] = [
        { name: 'Auto Portrait Enhance', description: 'One-click pro retouching for skin, eyes, and lighting.', icon: FaceSmileIcon, prompt: "placeholder", isHighValue: true, action: 'autoPortraitEnhance' },
        { name: 'AI Profile Designer', description: 'Generate multiple professional or creative profile picture designs.', icon: ProfilePictureIcon, prompt: "placeholder", isHighValue: true, action: 'profilePictureDesigner' },
        { name: 'Social Profile', description: 'Create a professional headshot with studio lighting.', icon: UserCircleIcon, prompt: "This is for a professional social media profile. Expertly cut out the main subject, place them on a subtle, out-of-focus modern office background, and apply flattering, professional studio lighting to their face. The retouching should be natural, preserving skin texture. The final image should look like a high-quality corporate headshot.", isHighValue: true },
        { name: 'Passport Photo', description: 'Generate a compliant passport/ID photo.', icon: DocumentIcon, prompt: "placeholder", isHighValue: true, action: 'passportPhoto' },
    ];

    const retouchTools = [
        { name: 'Smooth Skin', prompt: 'Perform a professional skin retouch on the selected area. Smooth out blemishes and unevenness while preserving the natural skin texture for a realistic, high-end result.' },
        { name: 'Fix Flyaway Hair', prompt: 'Tame and remove any stray or flyaway hairs in the selected area to create a clean, professional silhouette.' },
        { name: 'Brighten Eyes', prompt: 'Subtly brighten the eyes in the selected area, enhancing the catchlights and making them appear more vibrant and clear without looking unnatural.' },
        { name: 'Whiten Teeth', prompt: 'Naturally whiten the teeth in the selected area, removing any yellow tones to create a brighter, cleaner smile. The effect should be realistic, not overly white.' },
    ];

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showRetouchError) {
            timer = setTimeout(() => {
                setShowRetouchError(false);
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [showRetouchError]);
    
    const handleRetouchApply = (prompt: string, name: string) => {
        if (photoLabHotspot) {
            setShowRetouchError(false);
            onApplyRetouch(prompt, name);
        } else {
            setShowRetouchError(true);
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                 <h3 className="text-md font-semibold text-center text-[var(--text-secondary)] mb-3">One-Click Solutions</h3>
                 <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {oneClickTools.map(tool => <ToolButton key={tool.name} tool={tool} onClick={() => onApplySolution(tool)} isPro={isPro} isLoading={isLoading} />)}
                </div>
            </div>
            
            <div>
                 <h3 className="text-md font-semibold text-center text-[var(--text-secondary)] mb-3">Guided Retouching Tools</h3>
                 <div className="text-center mb-4 min-h-[40px]">
                     {showRetouchError ? (
                        <p className="text-red-400 font-semibold animate-fade-in">Please click on the portrait to select a target area first!</p>
                     ) : photoLabHotspot ? (
                         <div className="text-sm text-cyan-400 mt-1 flex items-center justify-center gap-2 animate-fade-in">
                             <span>Target area selected. Now choose a tool.</span>
                             <button onClick={onClearPhotoLabHotspot} className="text-xs bg-white/10 px-2 py-0.5 rounded hover:bg-white/20">Clear Selection</button>
                         </div>
                     ) : (
                         <p className="text-sm text-gray-500 mt-1">Click on an area of the image (e.g., skin, hair, eyes) to select it, then choose a tool.</p>
                     )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {retouchTools.map(p => (
                        <button 
                            key={p.name} 
                            onClick={() => handleRetouchApply(p.prompt, p.name)} 
                            disabled={isLoading}
                            className={`w-full h-24 text-center bg-black/20 border border-white/10 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/30 hover:text-white active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${photoLabHotspot ? 'glowing-border-button' : ''}`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes glowing-border-button-animation {
                    0% { border-color: rgba(0, 191, 255, 0.5); box-shadow: 0 0 3px rgba(0, 191, 255, 0.4); }
                    50% { border-color: rgba(0, 191, 255, 1); box-shadow: 0 0 8px rgba(0, 191, 255, 0.6); }
                    100% { border-color: rgba(0, 191, 255, 0.5); box-shadow: 0 0 3px rgba(0, 191, 255, 0.4); }
                }
                .glowing-border-button {
                    animation: glowing-border-button-animation 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default PortraitStudioPanel;