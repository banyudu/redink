import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Common
      'app.name': 'Redink',
      'app.theme.light': 'Light',
      'app.theme.dark': 'Dark',
      
      // Navigation
      'nav.home': 'Home',
      'nav.papers': 'Papers',
      'nav.chat': 'Chat',
      'nav.settings': 'Settings',
      
      // Paper
      'paper.search': 'Search Papers',
      'paper.download': 'Download',
      'paper.open': 'Open',
      'paper.save': 'Save to iBooks',
      'paper.citations': 'Citations',
      'paper.references': 'References',
      
      // Chat
      'chat.input.placeholder': 'Ask about the paper...',
      'chat.send': 'Send',
      'chat.clear': 'Clear',
      'chat.model.select': 'Select Model',
      
      // Settings
      'settings.language': 'Language',
      'settings.theme': 'Theme',
      'settings.models': 'LLM Models',
      'settings.storage': 'Storage',
    },
  },
  zh: {
    translation: {
      // Common
      'app.name': 'Redink',
      'app.theme.light': '浅色',
      'app.theme.dark': '深色',
      
      // Navigation
      'nav.home': '首页',
      'nav.papers': '论文',
      'nav.chat': '聊天',
      'nav.settings': '设置',
      
      // Paper
      'paper.search': '搜索论文',
      'paper.download': '下载',
      'paper.open': '打开',
      'paper.save': '保存到 iBooks',
      'paper.citations': '引用',
      'paper.references': '参考文献',
      
      // Chat
      'chat.input.placeholder': '询问关于论文的问题...',
      'chat.send': '发送',
      'chat.clear': '清除',
      'chat.model.select': '选择模型',
      
      // Settings
      'settings.language': '语言',
      'settings.theme': '主题',
      'settings.models': 'LLM 模型',
      'settings.storage': '存储',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 