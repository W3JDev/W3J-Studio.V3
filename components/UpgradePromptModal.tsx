/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
// FIX: Import missing CrownIcon.
import { CrownIcon } from './icons';

interface UpgradePromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    title: string;
    message: string;
}

const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({ isOpen, onClose, onUpgrade, title, message }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-md"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
        >
            <div
                className="bg-[var(--surface-color-solid)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md p-8 relative flex flex-col items-center gap-4 text-center"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                    <CrownIcon className="w-8 h-8 text-yellow-300" />
                </div>
                
                <h2 id="upgrade-title" className="text-2xl font-bold text-white">{title}</h2>
                <p className="text-[var(--text-secondary)]">{message}</p>
                
                <div className="flex items-center gap-4 mt-4 w-full">
                    <button
                        onClick={onClose}
                        className="w-full bg-white/10 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onUpgrade}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Upgrade
                    </button>
                </div>

                 <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    aria-label="Close prompt"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default UpgradePromptModal;