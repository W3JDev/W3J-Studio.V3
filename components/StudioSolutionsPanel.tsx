/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import PortraitStudioPanel from './PortraitStudioPanel';
import { useAuth } from '../contexts/AuthContext';
import { WandSparklesIcon, DocumentIcon, UserCircleIcon, CutIcon, SparklesIcon, CreditIcon, SmartBackgroundIcon, CubeIcon, ShadowIcon, CameraIcon, UncropIcon, ProfilePictureIcon, FaceSmileIcon } from './icons';

interface StudioSolutionsPanelProps {
  onApplySolution: (tool: { name: string; prompt: string; isHighValue: boolean; action?: string; }) => void;
  onApplyUncrop: (aspectRatio: string) => void;
  onApplyScene: (prompt: string) => void;
  onApplyProductScene: (prompt: string, name: string) => void;
  onApplyShadow: (prompt: string, name: string) => void;
  onApplyRetouch: (prompt: string, name: string) => void;
  isLoading: boolean;
  photoLabHotspot: { x: number, y: number } | null;
  onClearPhotoLabHotspot: () => void;
}

type StudioTab = 'portrait' | 'scene' | 'product' | 'general';

const ToolButton: React.FC<{tool: any, onClick: () => void, isPro: boolean, isLoading: boolean}> = ({ tool, onClick, isPro, isLoading }) => (
    <button onClick={onClick} disabled={isLoading} className="relative flex flex-col items-center text-center p-4 bg-black/20 rounded-xl border border-white/10 hover:bg-white/5 hover:border-cyan-500/50 transition-all duration-200 disabled:opacity-50 group hover:-translate-y-1">
        {tool.isHighValue && !isPro && <div className="absolute top-2 right-2 text-xs font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-500/30"><CreditIcon className="w-3 h-3"/>1</div>}
        <tool.icon className="w-8 h-8 mb-3 text-cyan-400 transition-transform group-hover:scale-110" />
        <h4 className="font-semibold text-[var(--text-primary)] text-sm">{tool.name}</h4>
        <p className="text-xs text-[var(--text-secondary)] mt-1 flex-grow">{tool.description}</p>
    </button>
);

const SceneStudioPanel: React.FC<Pick<StudioSolutionsPanelProps, 'onApplySolution' | 'onApplyUncrop' | 'onApplyScene' | 'isLoading'>> = ({ onApplySolution, onApplyUncrop, onApplyScene, isLoading }) => {
    const { isPro } = useAuth();
    const backgroundTools: { name: string; description: string; icon: React.FC<{ className?: string; }>; prompt: string; isHighValue: boolean; action?: string; }[] = [
        { name: 'Background Remover', description: 'Instantly remove the background with perfect precision.', icon: CutIcon, prompt: "placeholder", isHighValue: true, action: 'removeBackground' },
        { name: 'Smart Background', description: 'Generate multiple context-aware backgrounds for your subject.', icon: SmartBackgroundIcon, prompt: "placeholder", isHighValue: true, action: 'smartBackground' },
        { name: 'Beautify Background', description: 'AI-powered realistic enhancement of your existing background.', icon: WandSparklesIcon, prompt: "placeholder", isHighValue: true, action: 'beautifyBackground' },
    ];
    
    const [scenePrompt, setScenePrompt] = useState('');
    const handleApplyScene = () => {
        if (scenePrompt) {
            const fullPrompt = `You are a professional photo compositor and virtual photographer. Your task is to expertly cut out the main subject(s) from the foreground of the image and place them into a new, photorealistic scene, paying meticulous attention to the lighting. 1. **New Scene Description:** Place the subject(s) in the following environment: "${scenePrompt}". 2. **Lighting Style:** The scene must be lit with natural lighting that perfectly matches the time of day and environment of the new scene. Your primary goal is to create a seamless and believable composite. You must realistically render shadows, reflections, and color casts on the subject(s) so they perfectly match the new background and its specified lighting conditions. Output only the final, fully composited image.`;
            onApplyScene(fullPrompt);
        }
    };
    
    const uncropPresets = [
        { name: 'Natural Extension', aspectRatio: 'auto', description: 'Extend the existing scene naturally.' },
        { name: 'Cinematic (16:9)', aspectRatio: '16:9', description: 'Expand to a widescreen cinematic format.' },
        { name: 'Reflective Floor', aspectRatio: '4:3', description: 'Add a reflective surface below the subject.' },
        { name: 'Square (1:1)', aspectRatio: '1:1', description: 'Create a perfectly square image for social media.' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {backgroundTools.map(tool => <ToolButton key={tool.name} tool={tool} onClick={() => onApplySolution(tool)} isPro={isPro} isLoading={isLoading} />)}
            </div>
            <div>
                 <h4 className="text-md font-semibold text-center text-[var(--text-secondary)] mb-2">Scene Creator</h4>
                <textarea value={scenePrompt} onChange={(e) => setScenePrompt(e.target.value)} placeholder="e.g., 'a serene beach at sunset with dramatic clouds'" className="bg-black/30 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-4 focus:ring-2 focus:ring-cyan-500 w-full min-h-[80px]" disabled={isLoading} />
                <button onClick={handleApplyScene} className="w-full mt-2 bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all hover:bg-cyan-600 disabled:opacity-50" disabled={isLoading || !scenePrompt.trim()}>Generate Scene</button>
            </div>
             <div>
                <h4 className="text-md font-semibold text-center text-[var(--text-secondary)] mb-2">Generative Uncrop</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {uncropPresets.map(p => (
                        <button key={p.name} onClick={() => onApplyUncrop(p.aspectRatio)} disabled={isLoading} className="w-full text-center bg-black/20 border border-white/10 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/30 hover:text-white active:scale-95 text-sm disabled:opacity-50 h-24 flex flex-col justify-center">
                            <span className="font-bold text-base text-white">{p.name}</span>
                            <span className="text-xs">{p.description}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ProductStudioPanel: React.FC<Pick<StudioSolutionsPanelProps, 'onApplyProductScene' | 'onApplyShadow' | 'isLoading'>> = ({ onApplyProductScene, onApplyShadow, isLoading }) => {
    const scenes = [
        { name: 'Marble Podium', promptFragment: 'on a clean, white marble podium against a soft grey background with professional, soft-cast studio lighting.' },
        { name: 'Jungle Floor', promptFragment: 'on a lush jungle floor with mossy rocks, with dappled sunlight filtering through the canopy creating a natural, organic feel.' },
        { name: 'Wooden Table', promptFragment: 'on a rustic dark wood table in a warmly lit cafe setting, with the background slightly blurred to create depth.' },
        { name: 'Gradient Pop', promptFragment: 'floating in front of a vibrant, colorful studio gradient background, with bold, graphic lighting.' },
    ];
    const handleApplyProductScene = (scenePromptFragment: string, sceneName: string) => {
        const fullPrompt = `You are an expert e-commerce product photographer AI. Your task is to take the primary product from the user's image and create a professional, commercial-grade product shot suitable for a high-end online store. 1. **Isolate & Clean:** Perfectly and cleanly cut out the main product, removing its original background. Automatically clean up any minor dust, scratches, or imperfections on the product's surface to make it look pristine and new. 2. **Place in Scene:** Place the cleaned product into the following new scene: ${scenePromptFragment}. 3. **Composite Realistically:** This is the most critical step. The composite must be photorealistic. You MUST add realistic shadows, highlights, and reflections on the product that perfectly match the lighting and environment of the new scene. Output only the final, fully composited, commercial-grade product shot.`;
        onApplyProductScene(fullPrompt, sceneName);
    };

     const shadowTools = [
        { name: 'Drop Shadow', prompt: 'Add a soft, subtle drop shadow directly behind the main subject to make it pop from the background.' },
        { name: 'Realistic Floor', prompt: 'Cast a realistic shadow from the main subject onto the ground plane, respecting the existing light sources in the image.' },
        { name: 'Hard Cast', prompt: 'Cast a long, hard-edged shadow from the main subject, as if from a direct, harsh light source like the midday sun.' },
        { name: 'Reflection', prompt: 'Add a subtle, realistic reflection of the main subject onto the surface it is sitting on.' },
    ];

    return (
         <div className="flex flex-col gap-4">
            <p className="text-sm text-center text-[var(--text-secondary)] -mt-2">Create professional product shots for e-commerce and marketing.</p>
            <h4 className="text-md font-semibold text-center text-[var(--text-secondary)] mt-2">Product Scenes</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {scenes.map(s => <button key={s.name} onClick={() => handleApplyProductScene(s.promptFragment, s.name)} disabled={isLoading} className="w-full text-center bg-black/20 border border-white/10 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/30 hover:text-white active:scale-95 text-sm disabled:opacity-50 h-24">{s.name}</button>)}
            </div>
             <h4 className="text-md font-semibold text-center text-[var(--text-secondary)] mt-2">Shadows & Reflections</h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {shadowTools.map(s => <button key={s.name} onClick={() => onApplyShadow(s.prompt, s.name)} disabled={isLoading} className="w-full text-center bg-black/20 border border-white/10 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:bg-white/30 hover:text-white active:scale-95 text-sm disabled:opacity-50">{s.name}</button>)}
            </div>
        </div>
    );
};

const GeneralPanel: React.FC<Pick<StudioSolutionsPanelProps, 'onApplySolution' | 'isLoading'>> = ({ onApplySolution, isLoading }) => {
    const { isPro } = useAuth();
    const tools: { name: string; description: string; icon: React.FC<{ className?: string; }>; prompt: string; isHighValue: boolean; action?: string; }[] = [
      { name: 'Auto Enhance', description: 'One-click balance for contrast, brightness, and color.', icon: WandSparklesIcon, prompt: "Automatically enhance the photo by adjusting contrast, brightness, and saturation for a more balanced and appealing look.", isHighValue: false },
      { name: 'Photo Restoration', description: 'Repair old, scratched, or faded photos to bring them back to life.', icon: WandSparklesIcon, prompt: "Restore this old photo. Remove scratches, creases, and artifacts. Enhance faded colors and improve the overall sharpness and detail, bringing the photo back to life while preserving its vintage character.", isHighValue: true },
      { 
        name: 'Magic Recreate', 
        description: 'Rebuild any photo as an ultra-HD, crystal-clear modern masterpiece.', 
        icon: SparklesIcon, 
        prompt: "Recreate the provided image from scratch as an ultra-high-definition, 4K-style, crystal-clear masterpiece. Sharpen all lines and details to be extremely crisp. Enhance colors to be vibrant and rich. Completely eliminate any compression artifacts, noise, or blur. The final result should be a perfect, idealized recreation of the original's content and composition, as if it were taken with a professional DSLR camera yesterday.", 
        isHighValue: true 
      },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {tools.map(tool => <ToolButton key={tool.name} tool={tool} onClick={() => onApplySolution(tool)} isPro={isPro} isLoading={isLoading} />)}
        </div>
    );
};

const StudioSolutionsPanel: React.FC<StudioSolutionsPanelProps> = (props) => {
    const [activeStudio, setActiveStudio] = useState<StudioTab>('portrait');

    const studioTabs: { id: StudioTab, name: string, icon: React.FC<{className?: string}> }[] = [
        { id: 'portrait', name: 'Portrait', icon: FaceSmileIcon },
        { id: 'scene', name: 'Scene', icon: CameraIcon },
        { id: 'product', name: 'Product', icon: CubeIcon },
        { id: 'general', name: 'General', icon: SparklesIcon },
    ];
    
    return (
        <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6 flex flex-col gap-6 animate-fade-in backdrop-blur-xl">
             <div className="w-full bg-black/20 border-transparent rounded-xl p-1 flex items-center justify-start sm:justify-center gap-1 overflow-x-auto">
                {studioTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveStudio(tab.id)}
                        className={`w-full sm:w-auto flex-shrink-0 capitalize font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm flex items-center gap-2 ${
                            activeStudio === tab.id
                                ? 'bg-white/10 text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.name}
                    </button>
                ))}
            </div>
            
            <div className="animate-fade-in">
                {activeStudio === 'portrait' && <PortraitStudioPanel {...props} />}
                {activeStudio === 'scene' && <SceneStudioPanel {...props} />}
                {activeStudio === 'product' && <ProductStudioPanel {...props} />}
                {activeStudio === 'general' && <GeneralPanel {...props} />}
            </div>
        </div>
    );
};

export default StudioSolutionsPanel;