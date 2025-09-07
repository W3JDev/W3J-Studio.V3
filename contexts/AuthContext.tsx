/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

export const FREE_TIER_EDIT_LIMIT = 15;
const FREE_TIER_STARTING_CREDITS = 5;

interface AuthContextType {
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
  isPro: boolean;
  credits: number;
  monthlyEdits: number;
  isPricingModalOpen: boolean;
  setIsPricingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  purchaseProPlan: () => void;
  purchaseCredits: (amount: number) => void;
  consumeCredit: (amount?: number) => void;
// Fix: Update function signature to require an amount, for consistency with other credit functions.
  incrementMonthlyEdits: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [credits, setCredits] = useState<number>(0);
  const [monthlyEdits, setMonthlyEdits] = useState<number>(0);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);
  
  // Check for session and user data on initial load
  useEffect(() => {
    const storedSession = localStorage.getItem('w3j-studio-session');
    if (storedSession === 'true') {
      setIsSignedIn(true);
      
      const storedPro = localStorage.getItem('w3j-studio-isPro') === 'true';
      setIsPro(storedPro);
      
      const storedCredits = parseInt(localStorage.getItem('w3j-studio-credits') || '0', 10);
      setCredits(storedCredits);

      const storedEdits = parseInt(localStorage.getItem('w3j-studio-monthlyEdits') || '0', 10);
      setMonthlyEdits(storedEdits);
    }
  }, []);
  
  const setAndStoreCredits = (newCredits: number) => {
      setCredits(newCredits);
      localStorage.setItem('w3j-studio-credits', newCredits.toString());
  };

  const setAndStoreMonthlyEdits = (newCount: number) => {
      setMonthlyEdits(newCount);
      localStorage.setItem('w3j-studio-monthlyEdits', newCount.toString());
  }

  const signIn = () => {
    const isFirstSignIn = !localStorage.getItem('w3j-studio-session');
    localStorage.setItem('w3j-studio-session', 'true');
    setIsSignedIn(true);
    
    // Give new users starting credits
    if(isFirstSignIn) {
      setAndStoreCredits(FREE_TIER_STARTING_CREDITS);
    }
  };

  const signOut = () => {
    // Keep user data in local storage, just sign them out
    localStorage.removeItem('w3j-studio-session');
    setIsSignedIn(false);
    window.location.reload();
  };

  const purchaseProPlan = () => {
      setIsPro(true);
      localStorage.setItem('w3j-studio-isPro', 'true');
      setIsPricingModalOpen(false);
  };
  
  const purchaseCredits = (amount: number) => {
      setAndStoreCredits(credits + amount);
      setIsPricingModalOpen(false);
  };
  
  const consumeCredit = (amount = 1) => {
      if (!isPro && credits >= amount) {
          setAndStoreCredits(credits - amount);
      }
  };
  
// Fix: Update function to use the passed 'amount' when incrementing edits.
  const incrementMonthlyEdits = (amount: number) => {
      if (!isPro && monthlyEdits < FREE_TIER_EDIT_LIMIT) {
          setAndStoreMonthlyEdits(monthlyEdits + amount);
      }
  };

  return (
    <AuthContext.Provider value={{ 
        isSignedIn, signIn, signOut, isPro, credits, monthlyEdits,
        isPricingModalOpen, setIsPricingModalOpen,
        purchaseProPlan, purchaseCredits, consumeCredit, incrementMonthlyEdits
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};