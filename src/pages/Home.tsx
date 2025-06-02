import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{t("app.name")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white text-zinc-900 shadow p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">{t("nav.papers")}</h2>
            <p className="text-zinc-500 mb-4">
              Search and manage your Arxiv papers. Download, read, and organize your research papers.
            </p>
          </div>
          <Button onClick={() => navigate("/papers")}>{t("nav.papers")}</Button>
        </div>
        <div className="rounded-xl border bg-white text-zinc-900 shadow p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">{t("nav.chat")}</h2>
            <p className="text-zinc-500 mb-4">
              Chat with your papers using local LLM models. Ask questions and get instant answers.
            </p>
          </div>
          <Button onClick={() => navigate("/chat")}>{t("nav.chat")}</Button>
        </div>
      </div>
    </div>
  );
}; 