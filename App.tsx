/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, enhancePrompt, getAiSuggestions, upscaleImage, reduceImageNoise, removeObjectInpainting, removeBackground, addShadow, generateMaskForObject, generativeExpand, generateBackgroundForSubject, uncropAndReimagine, generateProfilePictures, createComparisonImage, sharpenImage, transferStyleFromImage, autoPortraitEnhance, generatePassportPhoto, beautifyBackground, type AiSuggestion } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import StudioSolutionsPanel from './components/StudioSolutionsPanel';
import ProEditorPanel from './components/ProEditorPanel';
import LayersPanel from './components/LayersPanel';
import HistoryPanel from './components/HistoryPanel';
import SuggestionsModal from './components/SuggestionsModal';
import DownloadModal, { type DownloadOptions } from './components/DownloadModal';
import { UndoIcon, RedoIcon, EyeIcon, LightBulbIcon, LayersIcon, WandSparklesIcon, ToolsIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import MagicBrushCanvas from './components/MagicBrushCanvas';
import PricingModal from './components/PricingModal';
import { useAuth, FREE_TIER_EDIT_LIMIT } from './contexts/AuthContext';
import UpgradePromptModal from './components/UpgradePromptModal';
import SmartBackgroundModal, { type SmartBackgroundOption } from './components/SmartBackgroundModal';
import ProfilePictureModal, { type ProfilePictureOption } from './components/ProfilePictureModal';


// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper function to trigger a file download from a data URL
const triggerDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

type MainTab = 'studio-solutions' | 'pro-editor';
export type EditTool = 'point' | 'select' | 'brush' | 'erase';

interface Layer {
  id: string;
  imageUrl: string; // Data URL from Gemini
  prompt: string;
}

export interface AppState {
  imageFile: File;
  imageUrl: string; // Object URL for base image
  layers: Layer[];
  description: string;
}


const App: React.FC = () => {
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Edit tool state
  const [activeTab, setActiveTab] = useState<MainTab>('studio-solutions');
  const [activeTool, setActiveTool] = useState<EditTool>('point');
  const [brushSize, setBrushSize] = useState(30);
  const [maskImage, setMaskImage] = useState<string | null>(null); // base64 data URL
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  
  // Photo Lab State
  const [photoLabHotspot, setPhotoLabHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayPhotoLabHotspot, setDisplayPhotoLabHotspot] = useState<{ x: number, y: number } | null>(null);


  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[] | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number, naturalWidth: number, naturalHeight: number } | null>(null);
  const [showHistoryFlash, setShowHistoryFlash] = useState(false);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState({ title: '', message: '' });
  
  // Smart Background State
  const [isSmartBackgroundModalOpen, setIsSmartBackgroundModalOpen] = useState(false);
  const [isGeneratingSmartBackgrounds, setIsGeneratingSmartBackgrounds] = useState(false);
  const [smartBackgroundOptions, setSmartBackgroundOptions] = useState<SmartBackgroundOption[]>([]);
  
  // Profile Picture Designer State
  const [isProfilePictureModalOpen, setIsProfilePictureModalOpen] = useState(false);
  const [isGeneratingProfilePictures, setIsGeneratingProfilePictures] = useState(false);
  const [profilePictureOptions, setProfilePictureOptions] = useState<ProfilePictureOption[]>([]);

  const auth = useAuth();
  const imgRef = useRef<HTMLImageElement>(null);
  
  const currentState = history[historyIndex] ?? null;
  const currentImageFile = currentState?.imageFile ?? null;
  const currentImageUrl = currentState?.imageUrl ?? null;
  const currentLayers = currentState?.layers ?? [];
  const originalImageUrl = history[0]?.imageUrl ?? null;
  const activeLayer = currentLayers.find(l => l.id === activeLayerId) ?? null;
  const isLoading = loadingMessage !== null;
  
  // Effect to update image dimensions for canvas sizing
  useEffect(() => {
    if (imgRef.current) {
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const imgElement = entry.target as HTMLImageElement;
                if (imgElement) {
                    const { width, height } = entry.contentRect;
                    const { naturalWidth, naturalHeight } = imgElement;
                    setImageDimensions({ width, height, naturalWidth, naturalHeight });
                }
            }
        });
        observer.observe(imgRef.current);
        return () => observer.disconnect();
    }
  }, [currentImageUrl, activeTab]);


  // Effect to populate prompt input when a layer is selected
  useEffect(() => {
    if (activeLayer) {
      setPrompt(activeLayer.prompt);
    } else {
      setPrompt('');
    }
  }, [activeLayer]);
  
  // Effect to clear mask when switching to point tool
  useEffect(() => {
    if (activeTool === 'point' || activeTool === 'select') {
        setMaskImage(null);
    }
  }, [activeTool]);

  // Effect to clean up object URLs on unmount
  useEffect(() => {
    return () => {
      history.forEach(state => URL.revokeObjectURL(state.imageUrl));
    };
  }, [history]);
  
  const historyFlashTimeoutRef = useRef<NodeJS.Timeout>();
  const triggerHistoryFlash = () => {
    clearTimeout(historyFlashTimeoutRef.current);
    setIsHistoryPanelOpen(true);
    historyFlashTimeoutRef.current = setTimeout(() => {
      setIsHistoryPanelOpen(false);
    }, 2500);
  };

  const handleOpenUpgradeModal = (title: string, message: string) => {
      setUpgradeReason({ title, message });
      setIsUpgradeModalOpen(true);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newAppState: Omit<AppState, 'description'>, description: string) => {
    if (historyIndex < history.length - 1) {
        history.slice(historyIndex + 1).forEach(state => URL.revokeObjectURL(state.imageUrl));
    }
    const newHistory = history.slice(0, historyIndex + 1);
    const stateWithDescription: AppState = { ...newAppState, description };
    newHistory.push(stateWithDescription);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setMaskImage(null);
    triggerHistoryFlash();
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    const imageUrl = URL.createObjectURL(file);
    const initialState: Omit<AppState, 'description'> = { imageFile: file, imageUrl, layers: [] };
    setHistory([{ ...initialState, description: 'Original Image' }]);
    setHistoryIndex(0);
    setActiveLayerId(null);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setPhotoLabHotspot(null);
    setDisplayPhotoLabHotspot(null);
    setActiveTab('studio-solutions');
    setActiveTool('point');
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  const flattenImage = useCallback(async (): Promise<File> => {
    if (!currentImageUrl || !currentState || currentLayers.length === 0) return currentImageFile!;

    const baseImg = new Image();
    baseImg.src = currentImageUrl;

    await new Promise(r => baseImg.onload = r);

    const canvas = document.createElement('canvas');
    canvas.width = baseImg.naturalWidth;
    canvas.height = baseImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return currentState.imageFile;

    ctx.drawImage(baseImg, 0, 0);

    for (const layer of currentLayers) {
        await new Promise<void>((resolve, reject) => {
            const layerImg = new Image();
            layerImg.crossOrigin = "anonymous";
            layerImg.onload = () => {
                ctx.drawImage(layerImg, 0, 0, canvas.width, canvas.height);
                resolve();
            };
            layerImg.onerror = reject;
            layerImg.src = layer.imageUrl;
        });
    }

    const dataUrl = canvas.toDataURL('image/png');
    return dataURLtoFile(dataUrl, `flattened-${Date.now()}.png`);
  }, [currentImageUrl, currentState, currentLayers, currentImageFile]);

  const performEdit = async (editFn: () => Promise<void>, options: { isHighValue: boolean }) => {
    const { isPro, credits, monthlyEdits, consumeCredit, incrementMonthlyEdits } = auth;
    
    if (!isPro) {
        if (options.isHighValue) {
            if (credits < 1) {
                handleOpenUpgradeModal("Out of Credits", "This is a premium feature that requires credits. Purchase a credit pack or upgrade to Pro for unlimited access.");
                return;
            }
        } else {
            if (monthlyEdits >= FREE_TIER_EDIT_LIMIT) {
                handleOpenUpgradeModal("Monthly Limit Reached", `You've used all your ${FREE_TIER_EDIT_LIMIT} free edits for this month. Upgrade to Pro for unlimited edits or purchase credits.`);
                return;
            }
        }
    }

    try {
        await editFn();

        if (!isPro) {
            if (options.isHighValue) {
                consumeCredit(1);
            } else {
                incrementMonthlyEdits(1);
            }
        }
    } catch (err) {
      // Error is already set by the calling function, but we don't want to deduct credits if it fails.
      console.log("Edit failed, credits not deducted.");
    }
  };

  const handleGenerate = useCallback(async () => {
    const editFn = async () => {
        if (!currentImageFile) {
            setError('No image loaded to edit.');
            return;
        }
        
        if (!prompt.trim()) {
            setError(activeLayer ? 'Please describe your changes to the layer.' : 'Please enter a description for your edit.');
            return;
        }
        
        const hasPointSelection = activeTool === 'point' && !!editHotspot;
        const hasBrushSelection = (activeTool === 'brush' || activeTool === 'erase' || activeTool === 'select') && !!maskImage;

        if (!activeLayer && !hasPointSelection && !hasBrushSelection) {
            setError('Please select an area on the image to edit.');
            return;
        }

        setLoadingMessage(activeLayer ? 'Updating layer...' : 'Generating new layer...');
        setError(null);
        
        try {
            const options = {
                hotspot: hasPointSelection ? editHotspot! : undefined,
                maskImage: hasBrushSelection ? maskImage! : undefined,
            };

            const newLayerUrl = await generateEditedImage(currentImageFile, prompt, options);
            
            let newLayers: Layer[];
            let newActiveLayerId: string;

            if (activeLayer) {
                const updatedLayer = { ...activeLayer, imageUrl: newLayerUrl, prompt };
                newLayers = currentLayers.map(l => l.id === activeLayer.id ? updatedLayer : l);
                newActiveLayerId = activeLayer.id;
            } else {
                const newLayer: Layer = { id: Date.now().toString(), imageUrl: newLayerUrl, prompt };
                newLayers = [...currentLayers, newLayer];
                newActiveLayerId = newLayer.id;
            }

            const newState: Omit<AppState, 'description'> = { ...currentState!, layers: newLayers };
            addImageToHistory(newState, activeLayer ? 'Update Layer' : 'Generate Layer');
            setActiveLayerId(newActiveLayerId);
            setEditHotspot(null);
            setDisplayHotspot(null);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate the image. ${errorMessage}`);
            console.error(err);
            throw err; 
        } finally {
            setLoadingMessage(null);
        }
    };
    await performEdit(editFn, { isHighValue: false });
  }, [currentImageFile, prompt, editHotspot, addImageToHistory, activeLayer, currentLayers, currentState, activeTool, maskImage, auth]);
  
  const handleRemove = useCallback(async () => {
    const editFn = async () => {
        if (!currentImageFile || !maskImage) {
            setError('Please use the brush to select an area to remove.');
            return;
        }

        setLoadingMessage('Removing selected object...');
        setError(null);

        try {
            const fileToEdit = await flattenImage();
            const editedImageUrl = await removeObjectInpainting(fileToEdit, maskImage);

            const newImageFile = dataURLtoFile(editedImageUrl, `removed-${Date.now()}.png`);
            const newImageUrl = URL.createObjectURL(newImageFile);

            const newState: Omit<AppState, 'description'> = {
                imageFile: newImageFile,
                imageUrl: newImageUrl,
                layers: [] 
            };
            addImageToHistory(newState, 'Remove Object');
            setActiveLayerId(null);
            setEditHotspot(null);
            setDisplayHotspot(null);
            setMaskImage(null);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to remove the object. ${errorMessage}`);
            console.error(err);
            throw err; 
        } finally {
            setLoadingMessage(null);
        }
    };
    await performEdit(editFn, { isHighValue: false });
  }, [currentImageFile, maskImage, addImageToHistory, flattenImage, auth]);
  
  const handleApplyGlobalEdit = useCallback(async (
    editFunction: (file: File, prompt: string, hotspot?: { x: number, y: number }) => Promise<string>, 
    prompt: string,
    message: string,
    description: string,
    options: { isHighValue: boolean },
    hotspot?: { x: number, y: number } | null
    ) => {
      const editFn = async () => {
        if (!currentImageFile || !currentState) {
            setError('No image loaded to apply an edit to.');
            return;
        }
        
        setLoadingMessage(message);
        setError(null);
        
        try {
            const fileToEdit = await flattenImage();

            const editedImageUrl = await editFunction(fileToEdit, prompt, hotspot ?? undefined);
            const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
            const newImageUrl = URL.createObjectURL(newImageFile);

            const newState: Omit<AppState, 'description'> = {
                imageFile: newImageFile,
                imageUrl: newImageUrl,
                layers: [] 
            };
            addImageToHistory(newState, description);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to apply the edit. ${errorMessage}`);
            console.error(err);
            throw err; 
        } finally {
            setLoadingMessage(null);
        }
      }
      await performEdit(editFn, options);
  }, [currentImageFile, currentState, addImageToHistory, flattenImage, auth]);
  
  const handleApplyParameterlessGlobalEdit = useCallback(async (
    editFunction: (file: File) => Promise<string>, 
    message: string,
    description: string,
    options: { isHighValue: boolean }
    ) => {
      const editFn = async () => {
        if (!currentImageFile || !currentState) {
            setError('No image loaded to apply an edit to.');
            return;
        }
        
        setLoadingMessage(message);
        setError(null);
        
        try {
            const fileToEdit = await flattenImage();

            const editedImageUrl = await editFunction(fileToEdit);
            const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
            const newImageUrl = URL.createObjectURL(newImageFile);

            const newState: Omit<AppState, 'description'> = {
                imageFile: newImageFile,
                imageUrl: newImageUrl,
                layers: [] 
            };
            addImageToHistory(newState, description);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to apply the edit. ${errorMessage}`);
            console.error(err);
            throw err; 
        } finally {
            setLoadingMessage(null);
        }
      }
      await performEdit(editFn, options);
  }, [currentImageFile, currentState, addImageToHistory, flattenImage, auth]);


  const handleApplySharpen = useCallback(async (intensity: number) => {
    const editFn = async () => {
        if (!currentImageFile || !currentState) {
            setError('No image loaded to apply an edit to.');
            return;
        }
        
        setLoadingMessage(`Applying sharpen (${intensity}%)...`);
        setError(null);
        
        try {
            const fileToEdit = await flattenImage();

            const editedImageUrl = await sharpenImage(fileToEdit, intensity);
            const newImageFile = dataURLtoFile(editedImageUrl, `sharpened-${Date.now()}.png`);
            const newImageUrl = URL.createObjectURL(newImageFile);

            const newState: Omit<AppState, 'description'> = {
                imageFile: newImageFile,
                imageUrl: newImageUrl,
                layers: [] 
            };
            addImageToHistory(newState, `Apply Sharpen: ${intensity}%`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to apply the sharpen effect. ${errorMessage}`);
            console.error(err);
            throw err; 
        } finally {
            setLoadingMessage(null);
        }
      }
      await performEdit(editFn, { isHighValue: false });
  }, [currentImageFile, currentState, addImageToHistory, flattenImage, auth]);
  
    const handleApplyStyleTransfer = useCallback(async (styleImage: File, intensity: number) => {
    const editFn = async () => {
        if (!currentImageFile || !currentState) {
            setError('No image loaded to apply a style to.');
            return;
        }
        
        setLoadingMessage(`Transferring style...`);
        setError(null);
        
        try {
            const fileToEdit = await flattenImage();

            const editedImageUrl = await transferStyleFromImage(fileToEdit, styleImage, intensity);
            const newImageFile = dataURLtoFile(editedImageUrl, `styled-${Date.now()}.png`);
            const newImageUrl = URL.createObjectURL(newImageFile);

            const newState: Omit<AppState, 'description'> = {
                imageFile: newImageFile,
                imageUrl: newImageUrl,
                layers: [] 
            };
            addImageToHistory(newState, `Apply Style Transfer`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to apply the style transfer. ${errorMessage}`);
            console.error(err);
            throw err; 
        } finally {
            setLoadingMessage(null);
        }
      }
      await performEdit(editFn, { isHighValue: true });
  }, [currentImageFile, currentState, addImageToHistory, flattenImage, auth]);

  const handleOpenSmartBackground = useCallback(async () => {
    const editFn = async () => {
        if (!currentImageFile) {
            setError('No image loaded.');
            return;
        }

        setIsGeneratingSmartBackgrounds(true);
        setSmartBackgroundOptions([]);
        setIsSmartBackgroundModalOpen(true);
        setError(null);

        try {
            const fileToEdit = await flattenImage();
            const subjectImage = await removeBackground(fileToEdit);

            const backgroundStyles = [
                { prompt: "a clean, professional, out-of-focus modern office environment, suitable for a corporate headshot", description: "Professional" },
                { prompt: "a beautiful, serene natural landscape with soft, golden hour lighting", description: "Scenic" },
                { prompt: "a vibrant, abstract, and colorful graphic background with geometric shapes and soft gradients", description: "Creative" },
                { prompt: "a dramatic, dark, and moody studio setting with a single spotlight on the subject", description: "Dramatic" }
            ];

            const promises = backgroundStyles.map(style =>
                generateBackgroundForSubject(subjectImage, style.prompt)
                    .then(imageUrl => ({ imageUrl, description: style.description }))
                    .catch(err => {
                        console.error(`Failed to generate background for "${style.description}":`, err);
                        return null; 
                    })
            );
            
            const results = (await Promise.all(promises)).filter(r => r !== null) as SmartBackgroundOption[];
            
            if (results.length === 0) {
                throw new Error("The AI failed to generate any background options. This might be due to safety filters or a complex subject.");
            }
            
            setSmartBackgroundOptions(results);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Smart Background failed. ${errorMessage}`);
            setIsSmartBackgroundModalOpen(false); 
            console.error(err);
            throw err; 
        } finally {
            setIsGeneratingSmartBackgrounds(false);
        }
    };
    await performEdit(editFn, { isHighValue: true });
  }, [currentImageFile, flattenImage, auth]);

  const handleApplySmartBackground = useCallback(async (imageUrl: string) => {
    setIsSmartBackgroundModalOpen(false);
    setLoadingMessage('Applying new background...');
    
    try {
        const newImageFile = dataURLtoFile(imageUrl, `smartbg-${Date.now()}.png`);
        const newImageUrl = URL.createObjectURL(newImageFile);
        const newState: Omit<AppState, 'description'> = {
            imageFile: newImageFile,
            imageUrl: newImageUrl,
            layers: [],
        };
        addImageToHistory(newState, 'Apply Smart Background');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the background. ${errorMessage}`);
    } finally {
        setLoadingMessage(null);
    }
  }, [addImageToHistory]);

  const handleOpenProfilePictureDesigner = useCallback(async () => {
    const editFn = async () => {
        if (!currentImageFile) {
            setError('No image loaded.');
            return;
        }

        setIsGeneratingProfilePictures(true);
        setProfilePictureOptions([]);
        setIsProfilePictureModalOpen(true);
        setError(null);

        try {
            const fileToEdit = await flattenImage();
            const subjectImage = await removeBackground(fileToEdit);

            const results = await generateProfilePictures(subjectImage);
            
            setProfilePictureOptions(results);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Profile Picture Designer failed. ${errorMessage}`);
            setIsProfilePictureModalOpen(false); 
            console.error(err);
            throw err; 
        } finally {
            setIsGeneratingProfilePictures(false);
        }
    };
    await performEdit(editFn, { isHighValue: true });
  }, [currentImageFile, flattenImage, auth]);

  const handleApplyProfilePicture = useCallback(async (imageUrl: string) => {
    setIsProfilePictureModalOpen(false);
    setLoadingMessage('Applying new design...');
    
    try {
        const newImageFile = dataURLtoFile(imageUrl, `profilepic-${Date.now()}.png`);
        const newImageUrl = URL.createObjectURL(newImageFile);
        const newState: Omit<AppState, 'description'> = {
            imageFile: newImageFile,
            imageUrl: newImageUrl,
            layers: [],
        };
        addImageToHistory(newState, 'Apply Profile Picture Design');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the design. ${errorMessage}`);
    } finally {
        setLoadingMessage(null);
    }
  }, [addImageToHistory]);

  const handleUncropReimagine = useCallback(async (aspectRatio: string) => {
    const editFn = async () => {
        if (!currentImageFile || !currentState) {
            setError('No image loaded to apply an edit to.');
            return;
        }
        
        setLoadingMessage('Reimagining your scene...');
        setError(null);
        
        try {
            const fileToEdit = await flattenImage();

            const editedImageUrl = await uncropAndReimagine(fileToEdit, aspectRatio);
            const newImageFile = dataURLtoFile(editedImageUrl, `reimagined-${Date.now()}.png`);
            const newImageUrl = URL.createObjectURL(newImageFile);

            const newState: Omit<AppState, 'description'> = {
                imageFile: newImageFile,
                imageUrl: newImageUrl,
                layers: [] 
            };
            addImageToHistory(newState, "Uncrop & Reimagine");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to reimagine the scene. ${errorMessage}`);
            console.error(err);
            throw err;
        } finally {
            setLoadingMessage(null);
        }
      }
      await performEdit(editFn, { isHighValue: true });
  }, [currentImageFile, currentState, addImageToHistory, flattenImage, auth]);

  const handleApplySolution = useCallback((tool: { name: string, prompt: string, isHighValue: boolean, action?: string }) => {
    if (tool.action === 'removeBackground') {
        handleApplyParameterlessGlobalEdit(removeBackground, "Removing background...", "Remove Background", { isHighValue: true });
    } else if (tool.action === 'smartBackground') {
        handleOpenSmartBackground();
    } else if (tool.action === 'beautifyBackground') {
        handleApplyParameterlessGlobalEdit(beautifyBackground, "Beautifying background...", "Beautify Background", { isHighValue: true });
    } else if (tool.action === 'autoPortraitEnhance') {
        handleApplyParameterlessGlobalEdit(autoPortraitEnhance, "Applying Portrait Enhance...", "Auto Portrait Enhance", { isHighValue: true });
    } else if (tool.action === 'passportPhoto') {
        handleApplyParameterlessGlobalEdit(generatePassportPhoto, "Generating Passport Photo...", "Passport Photo", { isHighValue: true });
    } else if (tool.action === 'uncropReimagine') {
        // This is now handled by its own component, but we keep the case for other potential actions.
    } else if (tool.action === 'profilePictureDesigner') {
        handleOpenProfilePictureDesigner();
    } else {
        handleApplyGlobalEdit(generateAdjustedImage, tool.prompt, `Applying ${tool.name}...`, `Apply: ${tool.name}`, { isHighValue: tool.isHighValue });
    }
  }, [handleApplyGlobalEdit, handleApplyParameterlessGlobalEdit, handleOpenSmartBackground, handleOpenProfilePictureDesigner]);

  const handleApplyCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }
    
    const { width: currentImgWidth, height: currentImgHeight } = imgRef.current;

    setLoadingMessage('Applying crop...');
    const flattenedFile = await flattenImage();
    const flattenedUrl = URL.createObjectURL(flattenedFile);
    
    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / currentImgWidth;
        const scaleY = image.naturalHeight / currentImgHeight;
        
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            setError('Could not process the crop.');
            setLoadingMessage(null);
            URL.revokeObjectURL(flattenedUrl);
            return;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = completedCrop.width * pixelRatio;
        canvas.height = completedCrop.height * pixelRatio;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          image,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          completedCrop.width,
          completedCrop.height,
        );
        
        URL.revokeObjectURL(flattenedUrl);

        const croppedImageUrl = canvas.toDataURL('image/png');
        const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
        const newImageUrl = URL.createObjectURL(newImageFile);

        const newState: Omit<AppState, 'description'> = {
            imageFile: newImageFile,
            imageUrl: newImageUrl,
            layers: []
        };
        addImageToHistory(newState, 'Apply Crop');
        setLoadingMessage(null);
    };
    image.src = flattenedUrl;

  }, [completedCrop, addImageToHistory, flattenImage]);
  
  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsEnhancingPrompt(true);
    try {
        const enhanced = await enhancePrompt(prompt);
        setPrompt(enhanced);
    } catch (err) {
        console.error("Enhancement failed:", err);
    } finally {
        setIsEnhancingPrompt(false);
    }
  }, [prompt]);

  const handleGetSuggestions = useCallback(async () => {
    if (!currentImageFile) return;
    setIsSuggestionsModalOpen(true);
    setIsSuggesting(true);
    setAiSuggestions(null);
    setError(null);
    try {
        const suggestions = await getAiSuggestions(currentImageFile);
        setAiSuggestions(suggestions);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to get suggestions. ${errorMessage}`);
        setAiSuggestions(null);
    } finally {
        setIsSuggesting(false);
    }
  }, [currentImageFile]);

  const handleApplySuggestion = useCallback((suggestionPrompt: string, title: string) => {
    setIsSuggestionsModalOpen(false);
    handleApplyGlobalEdit(generateAdjustedImage, suggestionPrompt, `Applying ${title}...`, `Suggestion: ${title}`, { isHighValue: false });
  }, [handleApplyGlobalEdit]);


  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setActiveLayerId(null);
      setMaskImage(null);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setActiveLayerId(null);
      setMaskImage(null);
    }
  }, [canRedo, historyIndex]);
  
  const handleRevertToState = useCallback((index: number) => {
    setHistoryIndex(index);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveLayerId(null);
    setMaskImage(null);
    setIsHistoryPanelOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setActiveLayerId(null);
      setMaskImage(null);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setActiveLayerId(null);
      setMaskImage(null);
  }, []);

  const handleConfirmDownload = useCallback(async (options: DownloadOptions) => {
    setIsDownloadModalOpen(false);
    if (!currentImageFile || !history[0]?.imageFile) return;

    const downloadFn = async () => {
        setLoadingMessage('Preparing download...');
        setError(null);

        try {
            let fileToProcess = await flattenImage();

            if (options.noiseReduction !== 'off') {
                setLoadingMessage(`Reducing noise (${options.noiseReduction})...`);
                const denoisedDataUrl = await reduceImageNoise(fileToProcess, options.noiseReduction);
                fileToProcess = dataURLtoFile(denoisedDataUrl, 'denoised.png');
            }

            if (options.upscale) {
                setLoadingMessage('Upscaling image...');
                const upscaledDataUrl = await upscaleImage(fileToProcess);
                fileToProcess = dataURLtoFile(upscaledDataUrl, 'upscaled.png');
            }

            // --- Download Final Edited Image ---
            setLoadingMessage('Processing final image...');
            const objectUrl = URL.createObjectURL(fileToProcess);
            const image = new Image();
            image.src = objectUrl;
            await new Promise(r => image.onload = r);

            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not create canvas context");
            ctx.drawImage(image, 0, 0);
            URL.revokeObjectURL(objectUrl);

            if (options.addWatermark) {
                const margin = Math.max(20, Math.round(canvas.width / 100));
                ctx.font = `bold ${Math.max(20, Math.round(canvas.width / 50))}px Inter, sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = Math.max(2, Math.round(canvas.width / 500));
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                
                const text = 'Made with W3J Studio';
                ctx.strokeText(text, canvas.width - margin, canvas.height - margin);
                ctx.fillText(text, canvas.width - margin, canvas.height - margin);
            }

            const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const quality = options.format === 'jpeg' ? options.quality / 100 : undefined;
            const finalImageDataUrl = canvas.toDataURL(mimeType, quality);
            const finalImageFileName = `w3j-studio-edit.${options.format}`;
            
            triggerDownload(finalImageDataUrl, finalImageFileName);
            
            // --- Download Comparison Image if requested ---
            if (options.includeComparison) {
                setLoadingMessage('Generating comparison collage...');
                const originalImageFile = history[0].imageFile;
                const comparisonDataUrl = await createComparisonImage(originalImageFile, fileToProcess);
                const comparisonFileName = `w3j-studio-comparison.png`;
                
                // Slight delay to allow browser to process the first download prompt
                await new Promise(resolve => setTimeout(resolve, 500));

                triggerDownload(comparisonDataUrl, comparisonFileName);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to process the download. ${errorMessage}`);
            console.error(err);
            throw err; 
        } finally {
            setLoadingMessage(null);
        }
    };
    
    if (options.upscale || options.includeComparison || options.noiseReduction !== 'off') {
        await performEdit(downloadFn, { isHighValue: true });
    } else {
        await downloadFn(); // Allow non-credit downloads without going through performEdit
    }
  }, [currentImageFile, flattenImage, auth, history]);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };
  
  const handleSmartSelect = useCallback(async (hotspot: { x: number, y: number }) => {
    if (!currentImageFile) {
        setError('No image loaded to select from.');
        return;
    }
    setLoadingMessage('Generating smart selection...');
    setError(null);
    setMaskImage(null); 

    try {
        const generatedMask = await generateMaskForObject(currentImageFile, hotspot);
        setMaskImage(generatedMask);
        setActiveTool('brush'); 
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the selection. ${errorMessage}`);
        console.error(err);
    } finally {
        setLoadingMessage(null);
    }
}, [currentImageFile]);

  const handleBaseImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);
    
    // Always set the photolab hotspot for studio solutions and pro editor adjust tab
    setPhotoLabHotspot({ x: originalX, y: originalY });
    setDisplayPhotoLabHotspot({ x: offsetX, y: offsetY });

    if (activeTab === 'pro-editor') {
        if (activeLayer) return;
        if (activeTool === 'select') {
            handleSmartSelect({ x: originalX, y: originalY });
            return;
        }
        if (activeTool === 'point') {
            setEditHotspot({ x: originalX, y: originalY });
            setDisplayHotspot({ x: offsetX, y: offsetY });
            setActiveLayerId(null);
            setMaskImage(null);
        }
    }
  };

  const handleSelectLayer = (layerId: string) => {
    setActiveLayerId(layerId);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setMaskImage(null);
    setActiveTool('brush'); 
  };

  const handleLayerClick = (e: React.MouseEvent<HTMLImageElement>, layer: Layer) => {
    e.stopPropagation();
    handleSelectLayer(layer.id);
  };

  const handleDeleteLayer = useCallback((layerId: string) => {
    if (!currentState) return;
    const newLayers = currentLayers.filter(l => l.id !== layerId);
    const newState: Omit<AppState, 'description'> = { ...currentState, layers: newLayers };
    addImageToHistory(newState, 'Delete Layer');
    if (activeLayerId === layerId) {
        setActiveLayerId(null);
        setActiveTool('point');
    }
  }, [currentState, currentLayers, addImageToHistory, activeLayerId]);

  const handleReorderLayer = useCallback((draggedId: string, targetId: string) => {
    if (!currentState) return;
    const layers = [...currentLayers];
    const fromIndex = layers.findIndex(l => l.id === draggedId);
    const toIndex = layers.findIndex(l => l.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reversedLayers = [...layers].reverse();
    const fromVisualIndex = reversedLayers.findIndex(l => l.id === draggedId);
    const [movedItem] = layers.splice(fromIndex, 1);
    if (fromVisualIndex > reversedLayers.findIndex(l => l.id === targetId)) { 
        layers.splice(toIndex + 1, 0, movedItem);
    } else { 
        layers.splice(toIndex, 0, movedItem);
    }
    const newState: Omit<AppState, 'description'> = { ...currentState, layers };
    addImageToHistory(newState, 'Reorder Layers');
  }, [currentState, currentLayers, addImageToHistory]);

  const mainTabs: { id: MainTab, name: string, icon: React.FC<{className?: string}>, tooltip: string }[] = [
      { id: 'studio-solutions', name: 'Studio Solutions', icon: WandSparklesIcon, tooltip: 'One-click AI solutions and scene generation' },
      { id: 'pro-editor', name: 'Pro Editor', icon: ToolsIcon, tooltip: 'Manual adjustments, cropping, and generative layers' },
  ];
  
  const getCursor = () => {
    if (activeTab === 'studio-solutions') return 'crosshair';
    if (activeTab === 'pro-editor') {
        if (activeTool === 'point' && !activeLayer) return 'crosshair';
        if (activeTool === 'select') return 'crosshair';
        if (activeTool === 'brush' || activeTool === 'erase') return 'none'; 
    }
    return 'default';
  }

  const renderContent = () => {
    if (error && !isSuggestionsModalOpen) {
       return (
           <div className="text-center animate-fade-in bg-red-900/20 border border-red-500/20 p-8 rounded-2xl max-w-2xl mx-auto flex flex-col items-center gap-4 shadow-2xl shadow-red-900/50">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    return (
      <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-8">
        <div className="flex-grow w-full flex flex-col items-center gap-6 animate-fade-in lg:max-w-4xl xl:max-w-5xl">
            <PricingModal />
            <UpgradePromptModal 
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                title={upgradeReason.title}
                message={upgradeReason.message}
                onUpgrade={() => {
                    setIsUpgradeModalOpen(false);
                    auth.setIsPricingModalOpen(true);
                }}
            />
            <SuggestionsModal
                isOpen={isSuggestionsModalOpen}
                onClose={() => setIsSuggestionsModalOpen(false)}
                isLoading={isSuggesting}
                suggestions={aiSuggestions}
                onApplySuggestion={handleApplySuggestion}
            />
            <DownloadModal
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                onConfirm={handleConfirmDownload}
            />
            <SmartBackgroundModal 
                isOpen={isSmartBackgroundModalOpen}
                onClose={() => setIsSmartBackgroundModalOpen(false)}
                isLoading={isGeneratingSmartBackgrounds}
                images={smartBackgroundOptions}
                onApply={handleApplySmartBackground}
            />
            <ProfilePictureModal 
                isOpen={isProfilePictureModalOpen}
                onClose={() => setIsProfilePictureModalOpen(false)}
                isLoading={isGeneratingProfilePictures}
                images={profilePictureOptions}
                onApply={handleApplyProfilePicture}
            />
            <div className={`relative w-full shadow-2xl shadow-black/50 rounded-2xl overflow-hidden bg-black/50 ${isLoading ? 'glowing-border' : ''}`}>
                {isLoading && (
                    <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center gap-4 animate-fade-in backdrop-blur-sm">
                        <Spinner className="w-16 h-16 text-white" />
                        <p className="text-gray-300 text-lg font-semibold">{loadingMessage}</p>
                    </div>
                )}
                
                 <ReactCrop 
                    crop={crop} 
                    onChange={c => setCrop(c)}
                    onComplete={c => setCompletedCrop(c)}
                    aspect={aspect}
                    className="flex items-center justify-center"
                    disabled={activeTab !== 'pro-editor'}
                  >
                    <div className="relative" style={{ cursor: getCursor() }}>
                        {originalImageUrl && (
                            <img
                                key={`original-${originalImageUrl}`}
                                src={originalImageUrl}
                                alt="Original"
                                className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
                            />
                        )}
                        <img
                            ref={imgRef}
                            key={`current-${currentImageUrl}`}
                            src={currentImageUrl}
                            alt="Current"
                            onClick={handleBaseImageClick}
                            className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'}`}
                        />
                        {currentLayers.map(layer => (
                            <img 
                                key={layer.id}
                                src={layer.imageUrl}
                                alt={layer.prompt}
                                onClick={(e) => handleLayerClick(e, layer)}
                                className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-auto transition-all duration-200 ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'pro-editor' ? 'cursor-pointer' : ''} ${activeLayerId === layer.id ? 'ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/50' : 'hover:ring-2 ring-cyan-500/50'}`}
                            />
                        ))}
                        {activeTab === 'pro-editor' && (activeTool === 'brush' || activeTool === 'erase') && imageDimensions && (
                            <MagicBrushCanvas
                                imageDimensions={imageDimensions}
                                tool={activeTool}
                                brushSize={brushSize}
                                onMaskChange={setMaskImage}
                                initialMask={maskImage}
                            />
                        )}
                    </div>
                  </ReactCrop>

                {displayHotspot && !isLoading && activeTab === 'pro-editor' && activeTool === 'point' && !activeLayer && (
                    <div 
                        className="absolute rounded-full w-6 h-6 bg-cyan-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                    >
                        <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-cyan-400"></div>
                    </div>
                )}
                {displayPhotoLabHotspot && !isLoading && (
                    <div 
                        className="absolute rounded-full w-6 h-6 bg-purple-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: `${displayPhotoLabHotspot.x}px`, top: `${displayPhotoLabHotspot.y}px` }}
                    >
                        <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-purple-400"></div>
                    </div>
                )}
            </div>
            
            <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-2 flex items-center justify-start sm:justify-center gap-1 backdrop-blur-xl overflow-x-auto">
                {mainTabs.map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.tooltip}
                        className={`w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 capitalize font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-base ${
                            activeTab === tab.id 
                            ? 'bg-white/10 text-white shadow-lg' 
                            : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="hidden sm:inline">{tab.name}</span>
                    </button>
                ))}
            </div>
            
            {activeTab === 'studio-solutions' && (
              <StudioSolutionsPanel
                isLoading={isLoading}
                onApplySolution={handleApplySolution}
                onApplyUncrop={handleUncropReimagine}
                onApplyScene={(p) => handleApplyGlobalEdit(generateAdjustedImage, p, 'Generating new scene...', 'Scene Change', { isHighValue: true })}
                onApplyProductScene={(p, name) => handleApplyGlobalEdit(generateAdjustedImage, p, `Creating ${name} shot...`, `Product Shot: ${name}`, { isHighValue: true })}
                onApplyShadow={(p, name) => handleApplyGlobalEdit(addShadow, p, `Adding ${name}...`, `Shadow: ${name}`, { isHighValue: true })}
                onApplyRetouch={(prompt, name) => {
                    handleApplyGlobalEdit(generateAdjustedImage, prompt, `Applying ${name}...`, `Retouch: ${name}`, {isHighValue: true}, photoLabHotspot);
                    setPhotoLabHotspot(null);
                    setDisplayPhotoLabHotspot(null);
                }}
                photoLabHotspot={photoLabHotspot}
                onClearPhotoLabHotspot={() => {
                      setPhotoLabHotspot(null);
                      setDisplayPhotoLabHotspot(null);
                }}
              />
            )}
            {activeTab === 'pro-editor' && (
              <ProEditorPanel 
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  onGenerate={handleGenerate}
                  onRemove={handleRemove}
                  isLoading={isLoading}
                  isEnhancing={isEnhancingPrompt}
                  onEnhance={handleEnhancePrompt}
                  activeTool={activeTool}
                  onToolChange={setActiveTool}
                  brushSize={brushSize}
                  onBrushSizeChange={setBrushSize}
                  canGenerate={!!prompt.trim() && ((activeTool === 'point' ? !!editHotspot : !!maskImage))}
                  canRemove={(activeTool === 'brush' || activeTool === 'erase') && !!maskImage}
                  activeLayer={activeLayer}
                  maskImage={maskImage}
                  onApplyAdjustment={(p) => {
                      handleApplyGlobalEdit(generateAdjustedImage, p, 'Applying adjustment...', 'Adjustment', { isHighValue: false }, photoLabHotspot);
                      setPhotoLabHotspot(null);
                      setDisplayPhotoLabHotspot(null);
                  }}
                  onApplyFilter={(p) => handleApplyGlobalEdit(generateFilteredImage, p, 'Applying creative filter...', 'Creative Filter', { isHighValue: false })}
                  onApplyEffect={(p, name) => handleApplyGlobalEdit(generateAdjustedImage, p, `Applying ${name} effect...`, `Effect: ${name}`, { isHighValue: false })}
                  onApplySharpen={handleApplySharpen}
                  onApplyStyleTransfer={handleApplyStyleTransfer}
                  photoLabHotspot={photoLabHotspot}
                  onClearPhotoLabHotspot={() => {
                      setPhotoLabHotspot(null);
                      setDisplayPhotoLabHotspot(null);
                  }}
                  onApplyCrop={handleApplyCrop}
                  onSetAspect={setAspect}
                  isCropping={!!completedCrop?.width && completedCrop.width > 0}
              />
            )}
            
            <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex flex-wrap items-center justify-center gap-3 mt-4 backdrop-blur-xl">
                <button 
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="flex items-center justify-center text-center bg-white/5 border border-white/10 text-[var(--text-primary)] font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Undo last action"
                >
                    <UndoIcon className="w-5 h-5 mr-2" />
                    Undo
                </button>
                <button 
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className="flex items-center justify-center text-center bg-white/5 border border-white/10 text-[var(--text-primary)] font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Redo last action"
                >
                    <RedoIcon className="w-5 h-5 mr-2" />
                    Redo
                </button>
                 <button 
                    onClick={handleReset}
                    disabled={!canUndo}
                    className="text-center text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 hover:text-white active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset
                </button>

                <button 
                    onClick={() => {
                        clearTimeout(historyFlashTimeoutRef.current);
                        setIsHistoryPanelOpen(!isHistoryPanelOpen)
                    }}
                    disabled={!canUndo}
                    className="flex items-center justify-center text-center bg-white/5 border border-white/10 text-[var(--text-primary)] font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Show edit history"
                >
                    <LayersIcon className="w-5 h-5 mr-2" />
                    History
                </button>
                
                <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

                {canUndo && (
                  <button 
                      onMouseDown={() => setIsComparing(true)}
                      onMouseUp={() => setIsComparing(false)}
                      onMouseLeave={() => setIsComparing(false)}
                      onTouchStart={() => setIsComparing(true)}
                      onTouchEnd={() => setIsComparing(false)}
                      className="flex items-center justify-center text-center bg-white/5 border border-white/10 text-[var(--text-primary)] font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/20 active:scale-95 text-base"
                      aria-label="Press and hold to see original image"
                  >
                      <EyeIcon className="w-5 h-5 mr-2" />
                      Compare
                  </button>
                )}
                
                 <button 
                    onClick={handleGetSuggestions}
                    className="flex items-center justify-center text-center bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-yellow-500/20 hover:border-yellow-500/30 active:scale-95 text-base"
                    aria-label="Get AI Suggestions"
                >
                    <LightBulbIcon className="w-5 h-5 mr-2" />
                    AI Art Director
                </button>

                <div className="flex-grow"></div>

                <button 
                    onClick={handleUploadNew}
                    className="text-center bg-white/10 border border-white/20 text-[var(--text-primary)] font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                >
                    Upload New
                </button>

                <button 
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="bg-green-500 text-white font-bold py-2 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
                >
                    Download
                </button>
            </div>
        </div>

        <div className="w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-28 flex flex-col gap-4">
            {(isHistoryPanelOpen || (activeTab === 'pro-editor' && currentLayers.length > 0)) && (
                 <>
                    {isHistoryPanelOpen && (
                        <HistoryPanel 
                            history={history}
                            currentIndex={historyIndex}
                            onRevert={handleRevertToState}
                            onClose={() => {
                                clearTimeout(historyFlashTimeoutRef.current);
                                setIsHistoryPanelOpen(false);
                            }}
                        />
                    )}
                    {!isHistoryPanelOpen && activeTab === 'pro-editor' && currentLayers.length > 0 && (
                        <LayersPanel 
                            layers={currentLayers}
                            activeLayerId={activeLayerId}
                            onSelectLayer={handleSelectLayer}
                            onDeleteLayer={handleDeleteLayer}
                            onReorderLayer={handleReorderLayer}
                        />
                    )}
                 </>
            )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex ${currentImageFile ? 'justify-center items-start' : 'justify-center items-center'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;