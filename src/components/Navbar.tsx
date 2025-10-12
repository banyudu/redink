import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "light");
    }
  };

  return (
    <nav className="w-full glass border-0 border-b border-white/20 backdrop-blur-xl shadow-lg relative overflow-hidden animate-slide-in">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50"></div>
      
      <div className="container mx-auto flex h-16 items-center justify-between px-6 relative z-10">
        {/* Logo section with gradient text */}
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/")}>
          <div className="relative">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 bg-transparent" />
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