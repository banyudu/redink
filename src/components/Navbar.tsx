import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { invoke } from '@tauri-apps/api/core';
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useAppStore } from "../store";
import { Moon, Sun, MessageSquare, Home, Settings } from "lucide-react";

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
    setTheme(theme === "light" ? "dark" : "light");
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "light");
    }
  };

  // Debug backdoor: Toggle devtools when Cmd/Ctrl + 5 clicks in 2 seconds (development only)
  const handleLogoClick = useCallback(async (event: React.MouseEvent) => {
    // Only enable debug backdoor in development mode
    if (!isDevelopment) {
      navigate("/");
      return;
    }

    const isModifier = event.metaKey || event.ctrlKey; // Cmd on Mac, Ctrl on Windows/Linux
    
    if (isModifier) {
      setIsModifierPressed(true);
      const newClickCount = clickCount + 1;
      setClickCount(newClickCount);
      
      console.log(`[Debug] Logo click ${newClickCount} with modifier key (DEV MODE)`);
      
      if (newClickCount === 1) {
        // Start timer for 2-second window
        clickTimerRef.current = setTimeout(() => {
          setClickCount(0);
          setIsModifierPressed(false);
          console.log('[Debug] Reset click count after timeout');
        }, 2000);
      } else if (newClickCount >= 5) {
        // Trigger debug mode
        console.log('[Debug] Debug backdoor triggered in development mode!');
        try {
          await invoke('toggle_devtools');
          console.log('[Debug] DevTools toggled successfully');
        } catch (error) {
          const errorMsg = error as string;
          console.error('[Debug] Failed to toggle devtools:', errorMsg);
          
          // Show user-friendly message
          if (errorMsg.includes('production')) {
            alert('DevTools access is disabled in production builds for security reasons.');
          } else {
            alert(`Failed to open DevTools: ${errorMsg}`);
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
      navigate("/");
    }
  }, [navigate, clickCount, isDevelopment]);

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
    <nav className="w-full glass border-0 border-b border-white/20 backdrop-blur-xl shadow-lg relative overflow-hidden animate-slide-in">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50"></div>
      
      <div className="mx-auto flex h-16 items-center justify-between px-4 lg:px-16 relative z-10">
        {/* Logo section with gradient text */}
        <div 
          className="flex items-center gap-3 group cursor-pointer select-none" 
          onClick={handleLogoClick}
          title={isDevelopment && isModifierPressed ? `Debug mode: ${clickCount}/5 clicks` : "Navigate to Home"}
        >
          <div className="relative">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 bg-transparent" />
            {isDevelopment && isModifierPressed && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="font-bold text-xl text-gradient bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t("app.name")}
          </span>
        </div>

        {/* Navigation items */}
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {/* Chat button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="gap-2 hover:bg-white/20 hover:text-blue-600 font-medium transition-all duration-300 hover:shadow-lg hover:scale-105" 
                  onClick={() => navigate("/chat")}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t("nav.chat")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat with your PDF using AI</p>
              </TooltipContent>
            </Tooltip>

            {/* Papers dropdown */}
            <DropdownMenu>
              <DropdownMenuContent 
                align="end" 
                className="glass border-white/20 shadow-xl backdrop-blur-xl min-w-[160px] mt-2"
              >
                <DropdownMenuItem 
                  onClick={() => navigate("/home")}
                  className="gap-2 hover:bg-white/20 transition-all duration-200"
                >
                  <Home className="w-4 h-4" />
                  {t("nav.home")}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate("/settings")}
                  className="gap-2 hover:bg-white/20 transition-all duration-200"
                >
                  <Settings className="w-4 h-4" />
                  {t("nav.settings")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle with beautiful transition */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleTheme} 
                  aria-label="Toggle theme"
                  className="hover:bg-white/20 hover:text-yellow-500 transition-all duration-300 hover:shadow-lg hover:scale-110 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {theme === "light" ? 
                    <Moon className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:rotate-12" /> : 
                    <Sun className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:rotate-12" />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle {theme === "light" ? "Dark" : "Light"} Mode</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Bottom border gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </nav>
  );
}; 