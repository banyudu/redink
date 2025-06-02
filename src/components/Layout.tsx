import React from "react";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}; 