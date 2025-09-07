/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAuth, FREE_TIER_EDIT_LIMIT } from '../contexts/AuthContext';
// FIX: Import missing icons.
import { UserCircleIcon, CreditIcon, CrownIcon } from './icons';


const W3JLogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5Z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.27002 10.5L6.60002 11.25" strokeLinecap="round" strokeLinejoin="round"/><path d="M17.4 12.75L20.73 13.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 20.73L11.25 17.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.5 3.27002L12.75 6.60002" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.60002 12.75L3.27002 13.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.73 10.5L17.4 11.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.75 17.4L13.5 20.73" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.25 6.60002L10.5 3.27002" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


const Header: React.FC = () => {
  const { isSignedIn, signIn, signOut, isPro, credits, monthlyEdits, setIsPricingModalOpen } = useAuth();
  
  return (
    <header className="w-full py-3 px-4 sm:px-8 border-b border-[var(--border-color)] bg-[var(--surface-color)] backdrop-blur-xl sticky top-0 z-50">
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
              <W3JLogoIcon className="w-8 h-8 text-cyan-400" />
              <div className="flex flex-col items-start">
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  W3J
                </h1>
                <p className="text-xs text-[var(--text-secondary)] -mt-1 tracking-wider">AI Photo Studio</p>
              </div>
          </div>
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <div className="flex items-center gap-3">
                
                {!isPro && (
                    <div className="hidden sm:flex flex-col items-end">
                      <p className="text-xs font-semibold text-gray-400">
                          {monthlyEdits}/{FREE_TIER_EDIT_LIMIT} Free Edits
                      </p>
                      <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                          <div 
                              className="h-full bg-cyan-400"
                              style={{ width: `${(monthlyEdits / FREE_TIER_EDIT_LIMIT) * 100}%`}}
                          ></div>
                      </div>
                    </div>
                )}
                
                <button onClick={() => setIsPricingModalOpen(true)} className="flex items-center gap-2 bg-white/5 border border-white/10 text-white font-semibold py-2 px-3 rounded-lg transition-all duration-200 hover:bg-white/10">
                    <CreditIcon className="w-5 h-5 text-yellow-300" />
                    <span className="font-bold">{credits}</span>
                </button>

                {!isPro && (
                  <button 
                    onClick={() => setIsPricingModalOpen(true)}
                    className="hidden lg:flex items-center gap-2 text-center bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-yellow-500/20 hover:border-yellow-500/30 active:scale-95 text-sm"
                  >
                    <CrownIcon className="w-4 h-4" />
                    Go Pro
                  </button>
                )}

                <UserCircleIcon className="w-9 h-9 text-[var(--text-secondary)]" />
                <button 
                  onClick={signOut}
                  className="text-center bg-white/10 border border-white/20 text-[var(--text-primary)] font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="text-center bg-white/10 border border-white/20 text-[var(--text-primary)] font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-sm"
              >
                Sign In
              </button>
            )}
          </div>
      </div>
    </header>
  );
};

export default Header;