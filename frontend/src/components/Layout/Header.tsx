import React from "react";
import { useApp } from "@/store/useStore";
import { Badge } from "@/components/common/Badge";

export const Header: React.FC = () => {
  const { state } = useApp();

  const isBitrixConnected =
    state.bitrix24Connection?.status === "connected";
  const isListokConnected =
    state.listokConnection?.status === "connected";

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-bitrix-400 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Bitrix24 ↔ Listok
              </h1>
              <p className="text-xs text-gray-400 -mt-0.5">Integration Config</p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-xs text-gray-400 hidden sm:inline">Bitrix24</span>
              {isBitrixConnected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="default">Not connected</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-xs text-gray-400 hidden sm:inline">Listok</span>
              {isListokConnected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="default">Not connected</Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
