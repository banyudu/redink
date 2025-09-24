import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  MessageSquare, 
  Settings, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Brain,
  Zap
} from "lucide-react";

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Sparkles className="w-16 h-16 text-blue-600 animate-glow" />
            <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full blur-xl"></div>
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gradient bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
          {t("app.name")}
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Your intelligent research companion powered by AI. Discover, analyze, and chat with academic papers like never before.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 pt-6">
          <Button 
            onClick={() => navigate("/chat")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <MessageSquare className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            Start Chatting
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate("/papers")}
            className="border-2 border-purple-200 hover:border-purple-400 bg-white/80 hover:bg-purple-50 text-purple-700 px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <FileText className="w-5 h-5 mr-2" />
            Browse Papers
          </Button>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Chat Feature */}
        <div className="group relative overflow-hidden">
          <div className="glass rounded-2xl p-8 h-full flex flex-col justify-between border border-white/20 hover:border-white/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer"
               onClick={() => navigate("/chat")}>
            
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Icon */}
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors duration-300">
                AI Chat
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Chat with your papers using advanced local LLM models. Ask questions and get instant, intelligent answers from your research documents.
              </p>
            </div>
            
            <div className="relative z-10 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              <Brain className="w-5 h-5 mr-2" />
              Start Conversation
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>

        {/* Papers Feature */}
        <div className="group relative overflow-hidden">
          <div className="glass rounded-2xl p-8 h-full flex flex-col justify-between border border-white/20 hover:border-white/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer"
               onClick={() => navigate("/papers")}>
            
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Icon */}
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-emerald-600 transition-colors duration-300">
                Research Papers
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Search, download, and organize your research papers from arXiv. Build your personal academic library with intelligent categorization.
              </p>
            </div>
            
            <div className="relative z-10 flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              <BookOpen className="w-5 h-5 mr-2" />
              Explore Library
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>

        {/* Settings Feature */}
        <div className="group relative overflow-hidden md:col-span-2 lg:col-span-1">
          <div className="glass rounded-2xl p-8 h-full flex flex-col justify-between border border-white/20 hover:border-white/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer"
               onClick={() => navigate("/settings")}>
            
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-pink-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Icon */}
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Settings className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-orange-600 transition-colors duration-300">
                Personalize
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Configure your experience with theme preferences, language settings, and local LLM model management for optimal performance.
              </p>
            </div>
            
            <div className="relative z-10 flex items-center text-orange-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              <Zap className="w-5 h-5 mr-2" />
              Customize App
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Features Highlight */}
      <div className="text-center py-12 space-y-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Powerful Features for Modern Research
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Local AI Processing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Your data stays private with local LLM processing</p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Smart Organization</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Intelligent categorization and search capabilities</p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Lightning Fast</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Optimized for speed and efficiency</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 