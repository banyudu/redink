import React from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import { Button } from "../components/ui/button";

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, language, setTheme, setLanguage } = useAppStore();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("nav.settings")}</h1>
      <div className="rounded-xl border bg-white p-6 max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{t("settings.theme")}</div>
            <div className="text-sm text-zinc-500">
              {theme === "light" ? t("app.theme.light") : t("app.theme.dark")}
            </div>
          </div>
          <Button variant="outline" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? t("app.theme.dark") : t("app.theme.light")}</Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{t("settings.language")}</div>
            <div className="text-sm text-zinc-500">
              {language === "en" ? "English" : "中文"}
            </div>
          </div>
          <select
            className="border rounded px-2 py-1 bg-white"
            value={language}
            onChange={e => setLanguage(e.target.value as 'en' | 'zh')}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
        <div>
          <div className="font-medium">{t("settings.models")}</div>
          <div className="text-sm text-zinc-500">Configure your local LLM models</div>
        </div>
        <div>
          <div className="font-medium">{t("settings.storage")}</div>
          <div className="text-sm text-zinc-500">Manage your local storage and database</div>
        </div>
      </div>
    </div>
  );
}; 