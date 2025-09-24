import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Papers } from './pages/Papers';
import { Chat } from './pages/Chat';
import { Settings } from './pages/Settings';
import './i18n';

function App() {
  const { theme, language } = useAppStore();
  const { i18n } = useTranslation();

  React.useEffect(() => {
    i18n.changeLanguage(language);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [language, i18n, theme]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/home" element={<Home />} />
          <Route path="/papers" element={<Papers />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
