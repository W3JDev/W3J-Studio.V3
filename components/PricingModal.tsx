/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { useAuth, FREE_TIER_EDIT_LIMIT } from '../contexts/AuthContext';
// FIX: Import missing icons.
import { CrownIcon, CreditIcon } from './icons';

const CheckmarkIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-cyan-400 ${className}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const PricingModal: React.FC = () => {
    const { isPricingModalOpen, setIsPricingModalOpen, isPro, purchaseProPlan, purchaseCredits } = useAuth();

    if (!isPricingModalOpen) return null;

    const proFeatures = [
        `Unlimited Standard Edits (No ${FREE_TIER_EDIT_LIMIT} limit)`,
        'Unlimited Access to All AI Tools',
        '2x AI Image Upscaling',
        'No Watermarks on Downloads',
        'Priority Support',
    ];

    const freeFeatures = [
        `${FREE_TIER_EDIT_LIMIT} Standard Edits per Month`,
        '5 Starter Credits for AI Tools',
        'Standard Resolution Downloads',
        'Watermarked Downloads',
    ];

    const creditPacks = [
        { amount: 25, price: 4.99 },
        { amount: 100, price: 14.99 },
        { amount: 500, price: 49.99 },
    ];

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-md"
            onClick={() => setIsPricingModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-title"
        >
            <div
                className="bg-[var(--surface-color-solid)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-4xl p-8 relative flex flex-col gap-8"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center">
                    <h2 id="pricing-title" className="text-3xl font-bold text-white">Choose Your Plan</h2>
                    <p className="text-[var(--text-secondary)] mt-2">Unlock your creative potential with Pro or top up with credits.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Free Plan */}
                    <div className={`p-6 rounded-xl border-2 flex flex-col ${!isPro ? 'border-cyan-500 bg-cyan-900/10' : 'border-[var(--border-color)] bg-white/5'}`}>
                        <h3 className="text-2xl font-semibold text-white">Free</h3>
                        <p className="text-[var(--text-secondary)] mt-1">For casual use and trying out features.</p>
                        <p className="text-4xl font-bold text-white my-4">$0 <span className="text-lg font-normal text-[var(--text-secondary)]">/ month</span></p>
                        <button
                            disabled={!isPro}
                            onClick={() => alert("This is a simulation. You can't downgrade at this time.")}
                            className="w-full text-center py-3 rounded-lg font-semibold border-2 border-white/20 bg-white/10 text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {!isPro ? 'Current Plan' : 'Select Plan'}
                        </button>
                        <hr className="border-white/10 my-6" />
                        <ul className="space-y-3">
                            {freeFeatures.map(feature => (
                                <li key={feature} className="flex items-start gap-3">
                                    <CheckmarkIcon className="flex-shrink-0 mt-0.5" />
                                    <span className="text-[var(--text-secondary)]">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pro Plan */}
                    <div className={`p-6 rounded-xl border-2 flex flex-col ${isPro ? 'border-cyan-500 bg-cyan-900/10' : 'border-[var(--border-color)] bg-white/5'}`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-semibold text-white">Pro</h3>
                            <div className="text-xs font-bold bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full flex items-center gap-1 border border-yellow-500/30">
                                <CrownIcon className="w-4 h-4"/> RECOMMENDED
                            </div>
                        </div>
                        <p className="text-[var(--text-secondary)] mt-1">For professionals and enthusiasts.</p>
                        <p className="text-4xl font-bold text-white my-4">$19 <span className="text-lg font-normal text-[var(--text-secondary)]">/ month</span></p>
                        <button
                            disabled={isPro}
                            onClick={purchaseProPlan}
                            className="w-full text-center py-3 rounded-lg font-semibold bg-[var(--brand-gradient)] text-white transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPro ? 'Current Plan' : 'Upgrade to Pro'}
                        </button>
                        <hr className="border-white/10 my-6" />
                        <ul className="space-y-3">
                            {proFeatures.map(feature => (
                                <li key={feature} className="flex items-start gap-3">
                                    <CheckmarkIcon className="flex-shrink-0 mt-0.5" />
                                    <span className="text-white">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                
                {/* Credit Packs */}
                <div className="text-center border-t border-[var(--border-color)] pt-8">
                    <h3 className="text-2xl font-bold text-white">Purchase Credit Packs</h3>
                    <p className="text-[var(--text-secondary)] mt-1">For premium AI tool usage without a subscription.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                        {creditPacks.map(pack => (
                            <button
                                key={pack.amount}
                                onClick={() => purchaseCredits(pack.amount)}
                                className="p-6 rounded-xl border border-[var(--border-color)] bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <CreditIcon className="w-6 h-6 text-yellow-300" />
                                    <span className="text-2xl font-bold text-white">{pack.amount} Credits</span>
                                </div>
                                <span className="text-lg text-[var(--text-secondary)]">${pack.price.toFixed(2)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => setIsPricingModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    aria-label="Close pricing modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default PricingModal;