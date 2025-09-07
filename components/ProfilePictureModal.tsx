/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import Spinner from './Spinner';
import { ProfilePictureIcon } from './icons';

export interface ProfilePictureOption {
    imageUrl: string;
    description: string;
}

interface ProfilePictureModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    images: ProfilePictureOption[];
    onApply: (imageUrl: string) => void;
}

const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({ isOpen, onClose, isLoading, images, onApply }) => {
    const [selectedImage, setSelectedImage] = useState<ProfilePictureOption | null>(null);

    if (!isOpen) return null;
    
    const handleApply = () => {
        if (selectedImage) {
            onApply(selectedImage.imageUrl);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-md"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profilepic-title"
        >
            <div
                className="bg-[var(--surface-color-solid)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative flex flex-col gap-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                    <ProfilePictureIcon className="w-6 h-6 text-cyan-400" />
                    <h2 id="profilepic-title" className="text-xl font-bold text-white">AI Profile Picture Designer</h2>
                </div>
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center gap-4 py-24">
                        <Spinner className="w-16 h-16 text-white" />
                        <p className="text-[var(--text-secondary)]">Generating profile picture designs...</p>
                        <p className="text-sm text-gray-500">This may take up to a minute.</p>
                    </div>
                )}
                
                {!isLoading && images.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <p className="text-[var(--text-secondary)]">Select a design to apply.</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {images.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImage(img)}
                                    className={`relative rounded-xl overflow-hidden border-4 transition-all duration-200 ${selectedImage?.imageUrl === img.imageUrl ? 'border-cyan-500 shadow-2xl shadow-cyan-900' : 'border-transparent hover:border-white/50'}`}
                                >
                                    <img src={img.imageUrl} alt={`Profile Picture Option ${index + 1}`} className="w-full aspect-square object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60">
                                        <p className="text-white text-sm font-semibold text-center">{img.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end gap-4 mt-4">
                            <button onClick={onClose} className="bg-white/10 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95">
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={!selectedImage}
                                className="bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:opacity-50 disabled:bg-green-500/50 disabled:shadow-none disabled:cursor-not-allowed"
                            >
                                Apply Design
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ProfilePictureModal;