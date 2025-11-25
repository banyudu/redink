import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const currentPaper = useAppStore((state) => state.currentPaper);

  // Hide navbar when chatting with a PDF file
  const shouldHideNavbar = location.pathname === '/chat' && !!currentPaper;

  return (
    <div className='relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:text-gray-100'>
      {/* Background decorative elements */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-600/30 blur-3xl' />
        <div className='absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-pink-400/30 to-orange-600/30 blur-3xl' />
        <div className='absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/20 blur-3xl' />
      </div>

      {!shouldHideNavbar && <Navbar />}

      <main
        className={cn(
          'animate-fade-in relative z-10 mx-auto w-full flex-1 px-4 py-6 lg:px-16',
          shouldHideNavbar && 'h-screen md:h-screen',
        )}
      >
        <div className='w-full'>{children}</div>
      </main>

      {/* Footer gradient - only show when navbar is visible */}
      {!shouldHideNavbar && (
        <div className='h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent' />
      )}
    </div>
  );
};
