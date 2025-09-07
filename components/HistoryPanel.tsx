/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { type AppState } from '../App';
// FIX: Import missing icons.
import { CloseIcon, HistoryIcon } from './icons';

interface HistoryPanelProps {
  history: AppState[];
  currentIndex: number;
  onRevert: (index: number) => void;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, currentIndex, onRevert, onClose }) => {
  // Create a reversed copy for display (most recent first) without mutating the prop
  const reversedHistory = [...history].reverse();

  return (
    <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-4 backdrop-blur-xl animate-fade-in">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-3">
            <HistoryIcon className="w-6 h-6 text-cyan-400" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">History</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10" aria-label="Close history panel">
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
        {history.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">No history yet.</p>
        ) : (
          reversedHistory.map((state, reversedIndex) => {
            const originalIndex = history.length - 1 - reversedIndex;
            return (
                <button
                key={`${state.imageUrl}-${originalIndex}`}
                onClick={() => onRevert(originalIndex)}
                disabled={originalIndex === currentIndex}
                className={`p-2 rounded-lg transition-all duration-200 border-2 w-full flex items-center gap-3 text-left ${
                    currentIndex === originalIndex
                    ? 'bg-cyan-500/20 border-cyan-500'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                >
                <img src={state.imageUrl} alt={state.description} className="w-12 h-12 object-cover rounded-md bg-black/50 flex-shrink-0" />
                <div className="flex-grow">
                    <span className="text-sm font-semibold text-[var(--text-primary)] break-words">{state.description}</span>
                    {originalIndex === 0 && (
                        <span className="text-xs text-gray-400 block">(Original)</span>
                    )}
                </div>
                </button>
            )
          })
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;