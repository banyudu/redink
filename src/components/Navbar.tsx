import { invoke } from '@tauri-apps/api/core';
import { Home, Moon, Settings, Sun } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { loggers } from '../lib/logger';
import { showAlert, showError } from '../lib/toast-manager';
import { useAppStore } from '../store';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useAppStore();

  // Debug backdoor state - only enabled in development
  const [clickCount, setClickCount] = useState(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isModifierPressed, setIsModifierPressed] = useState(false);
  const isDevelopment = import.meta.env.DEV;

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'light');
    }
  };

  // Debug backdoor: Toggle devtools when Cmd/Ctrl + 5 clicks in 2 seconds (development only)
  const handleLogoClick = useCallback(
    async (event: React.MouseEvent) => {
      // Only enable debug backdoor in development mode
      if (!isDevelopment) {
        navigate('/');
        return;
      }

      const isModifier = event.metaKey || event.ctrlKey; // Cmd on Mac, Ctrl on Windows/Linux

      if (isModifier) {
        setIsModifierPressed(true);
        const newClickCount = clickCount + 1;
        setClickCount(newClickCount);

        loggers.ui(`Logo click ${newClickCount} with modifier key (DEV MODE)`);

        if (newClickCount === 1) {
          // Start timer for 2-second window
          clickTimerRef.current = setTimeout(() => {
            setClickCount(0);
            setIsModifierPressed(false);
            loggers.ui('Reset click count after timeout');
          }, 2000);
        } else if (newClickCount >= 5) {
          // Trigger debug mode
          loggers.ui('Debug backdoor triggered in development mode!');
          try {
            await invoke('toggle_devtools');
            loggers.ui('DevTools toggled successfully');
          } catch (error) {
            const errorMsg = error as string;
            loggers.ui('Failed to toggle devtools:', errorMsg);

            // Show user-friendly message
            if (errorMsg.includes('production')) {
              showAlert('DevTools access is disabled in production builds for security reasons.');
            } else {
              showError(`Failed to open DevTools: ${errorMsg}`);
            }
          }

          // Reset state
          setClickCount(0);
          setIsModifierPressed(false);
          if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }
        }
      } else {
        // Regular click - navigate home
        navigate('/');
      }
    },
    [navigate, clickCount, isDevelopment],
  );

  // Reset click count if modifier is released
  React.useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && isModifierPressed) {
        setIsModifierPressed(false);
        setClickCount(0);
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [isModifierPressed]);

  return (
    <nav className='glass animate-slide-in relative w-full overflow-hidden border-0 border-b border-white/20 shadow-lg backdrop-blur-xl'>
      {/* Animated background gradient */}
      <div className='absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50' />

      <div className='relative z-10 mx-auto flex h-16 items-center justify-between px-4 lg:px-16'>
        {/* Logo section with gradient text */}
        <div
          className='group flex cursor-pointer items-center gap-3 select-none'
          onClick={handleLogoClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLogoClick(e as unknown as React.MouseEvent);
            }
          }}
          role='button'
          tabIndex={0}
          title={
            isDevelopment && isModifierPressed
              ? `Debug mode: ${clickCount}/5 clicks`
              : 'Navigate to Home'
          }
        >
          <div className='relative'>
            <img src='/logo.png' alt='Logo' className='h-8 w-8 bg-transparent' />
            {isDevelopment && isModifierPressed && (
              <div className='absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-red-500' />
            )}
          </div>
          <span className='text-gradient bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent'>
            {t('app.name')}
          </span>
        </div>

        {/* Navigation items */}
        <TooltipProvider>
          <div className='flex items-center gap-1'>
            {/* Papers dropdown */}
            <DropdownMenu>
              <DropdownMenuContent
                align='end'
                className='glass mt-2 min-w-[160px] border-white/20 shadow-xl backdrop-blur-xl'
              >
                <DropdownMenuItem
                  onClick={() => navigate('/home')}
                  className='gap-2 transition-all duration-200 hover:bg-white/20'
                >
                  <Home className='h-4 w-4' />
                  {t('nav.home')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className='gap-2 transition-all duration-200 hover:bg-white/20'
                >
                  <Settings className='h-4 w-4' />
                  {t('nav.settings')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle with beautiful transition */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={toggleTheme}
                  aria-label='Toggle theme'
                  className='group relative overflow-hidden transition-all duration-300 hover:scale-110 hover:bg-white/20 hover:text-yellow-500 hover:shadow-lg'
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
                  {theme === 'light' ? (
                    <Moon className='relative z-10 h-5 w-5 transition-transform duration-300 group-hover:rotate-12' />
                  ) : (
                    <Sun className='relative z-10 h-5 w-5 transition-transform duration-300 group-hover:rotate-12' />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Bottom border gradient */}
      <div className='absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent' />
    </nav>
  );
};
