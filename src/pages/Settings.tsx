import React from 'react';
import { useAppStore } from '../store';
import { Button } from '../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { UpdateChecker } from '../components/UpdateChecker';
import {
  Settings as SettingsIcon,
  Palette,
  Globe,
  Brain,
  Database,
  Moon,
  Sun,
  Monitor,
  Check,
  ChevronRight,
  Download,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme, language, setTheme, setLanguage } = useAppStore();

  const settingsSections = [
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize the look and feel of your application',
      icon: Palette,
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      id: 'language',
      title: 'Language & Region',
      description: 'Set your preferred language and regional settings',
      icon: Globe,
      gradient: 'from-blue-500 to-cyan-600',
    },
    {
      id: 'models',
      title: 'AI Models',
      description: 'Configure and manage your local LLM models',
      icon: Brain,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'storage',
      title: 'Storage & Data',
      description: 'Manage your local storage and database settings',
      icon: Database,
      gradient: 'from-orange-500 to-red-600',
    },
  ];

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Clean and bright interface' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follows your system preference',
    },
  ];

  return (
    <div className='animate-fade-in mx-auto max-w-4xl space-y-8 p-4'>
      {/* Header */}
      <div className='space-y-4 text-center'>
        <div className='flex justify-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600'>
            <SettingsIcon className='h-8 w-8 text-white' />
          </div>
        </div>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-white'>Settings</h1>
        <p className='mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300'>
          Customize your experience and configure the application to your preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        {/* Appearance Settings */}
        <div className='glass rounded-lg border border-white/20 p-6 backdrop-blur-xl'>
          <div className='mb-6 flex items-center gap-3'>
            <div
              className={`h-10 w-10 bg-gradient-to-br ${settingsSections[0].gradient} flex items-center justify-center rounded-lg`}
            >
              <Palette className='h-5 w-5 text-white' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Appearance</h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>Choose your theme</p>
            </div>
          </div>

          <div className='space-y-3'>
            {themeOptions.map((option) => (
              <div
                key={option.value}
                onClick={() =>
                  option.value !== 'system' && setTheme(option.value as 'light' | 'dark')
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (option.value !== 'system') {
                      setTheme(option.value as 'light' | 'dark');
                    }
                  }
                }}
                role='button'
                tabIndex={0}
                className={`cursor-pointer rounded-lg border p-4 transition-all duration-300 hover:scale-[1.02] ${
                  theme === option.value || (option.value === 'system' && theme === 'light')
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/10'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-gray-200 to-gray-300'>
                      <option.icon className='h-4 w-4 text-gray-600' />
                    </div>
                    <div>
                      <div className='font-medium text-gray-900 dark:text-white'>
                        {option.label}
                      </div>
                      <div className='text-xs text-gray-600 dark:text-gray-300'>
                        {option.description}
                      </div>
                    </div>
                  </div>
                  {(theme === option.value || (option.value === 'system' && theme === 'light')) && (
                    <Check className='h-5 w-5 text-blue-500' />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Language Settings */}
        <div className='glass rounded-lg border border-white/20 p-6 backdrop-blur-xl'>
          <div className='mb-6 flex items-center gap-3'>
            <div
              className={`h-10 w-10 bg-gradient-to-br ${settingsSections[1].gradient} flex items-center justify-center rounded-lg`}
            >
              <Globe className='h-5 w-5 text-white' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Language</h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>Select your language</p>
            </div>
          </div>

          <div className='space-y-3'>
            {[
              { value: 'en', label: 'English', flag: '🇺🇸' },
              { value: 'zh', label: '中文', flag: '🇨🇳' },
            ].map((lang) => (
              <div
                key={lang.value}
                onClick={() => setLanguage(lang.value as 'en' | 'zh')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLanguage(lang.value as 'en' | 'zh');
                  }
                }}
                role='button'
                tabIndex={0}
                className={`cursor-pointer rounded-lg border p-4 transition-all duration-300 hover:scale-[1.02] ${
                  language === lang.value
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/10'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <span className='text-2xl'>{lang.flag}</span>
                    <span className='font-medium text-gray-900 dark:text-white'>{lang.label}</span>
                  </div>
                  {language === lang.value && <Check className='h-5 w-5 text-blue-500' />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Models Settings */}
        <div className='glass group cursor-pointer rounded-lg border border-white/20 p-6 backdrop-blur-xl transition-transform duration-300 hover:scale-[1.02]'>
          <div className='mb-4 flex items-center gap-3'>
            <div
              className={`h-10 w-10 bg-gradient-to-br ${settingsSections[2].gradient} flex items-center justify-center rounded-lg`}
            >
              <Brain className='h-5 w-5 text-white' />
            </div>
            <div className='flex-1'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>AI Models</h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Configure your local LLM models
              </p>
            </div>
            <ChevronRight className='h-5 w-5 text-gray-400 transition-transform duration-300 group-hover:translate-x-1' />
          </div>

          <div className='space-y-3'>
            <div className='rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20'>
              <div className='flex items-center gap-2'>
                <div className='h-2 w-2 rounded-full bg-green-500' />
                <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                  Ollama Connected
                </span>
              </div>
              <p className='mt-1 text-xs text-green-600 dark:text-green-400'>
                Ready to process documents
              </p>
            </div>

            <div className='text-sm text-gray-600 dark:text-gray-300'>
              Configure model parameters, download new models, and manage your AI preferences.
            </div>
          </div>
        </div>

        {/* Storage Settings */}
        <div className='glass group cursor-pointer rounded-lg border border-white/20 p-6 backdrop-blur-xl transition-transform duration-300 hover:scale-[1.02]'>
          <div className='mb-4 flex items-center gap-3'>
            <div
              className={`h-10 w-10 bg-gradient-to-br ${settingsSections[3].gradient} flex items-center justify-center rounded-lg`}
            >
              <Database className='h-5 w-5 text-white' />
            </div>
            <div className='flex-1'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                Storage & Data
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Manage your local storage and database
              </p>
            </div>
            <ChevronRight className='h-5 w-5 text-gray-400 transition-transform duration-300 group-hover:translate-x-1' />
          </div>

          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='rounded-md bg-blue-50 p-3 text-center dark:bg-blue-900/20'>
                <div className='text-lg font-bold text-blue-600 dark:text-blue-400'>2.4GB</div>
                <div className='text-xs text-blue-600 dark:text-blue-400'>Documents</div>
              </div>
              <div className='rounded-md bg-purple-50 p-3 text-center dark:bg-purple-900/20'>
                <div className='text-lg font-bold text-purple-600 dark:text-purple-400'>156</div>
                <div className='text-xs text-purple-600 dark:text-purple-400'>Chat History</div>
              </div>
            </div>

            <div className='text-sm text-gray-600 dark:text-gray-300'>
              Clear cache, export data, and manage storage preferences.
            </div>
          </div>
        </div>
      </div>

      {/* App Updates Section */}
      <div className='glass rounded-lg border border-white/20 p-6 backdrop-blur-xl'>
        <div className='mb-6 flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600'>
            <Download className='h-5 w-5 text-white' />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>App Updates</h3>
            <p className='text-sm text-gray-600 dark:text-gray-300'>
              Keep your app up to date with the latest features
            </p>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40'>
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-sm font-medium text-gray-900 dark:text-white'>
                Current Version
              </span>
              <span className='font-mono text-sm text-gray-600 dark:text-gray-300'>v0.1.0</span>
            </div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              The app automatically checks for updates every 6 hours, or you can check manually
              below.
            </p>
          </div>

          <UpdateChecker />
        </div>
      </div>

      {/* Action Buttons */}
      <TooltipProvider>
        <div className='flex justify-center gap-4 pt-8'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                className='glass border-white/20 bg-white/10 px-8 backdrop-blur-xl hover:bg-white/20'
              >
                Reset to Defaults
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Restore all settings to their default values</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button className='bg-gradient-to-r from-blue-600 to-purple-600 px-8 text-white hover:from-blue-700 hover:to-purple-700'>
                Save Changes
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Apply and save your settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};
