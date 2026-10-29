import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/store/useStore";
import { ToastProvider } from "@/components/common/Toast";
import { Layout } from "@/components/Layout/Layout";
import { DashboardHome } from "@/components/Dashboard/DashboardHome";
import { WizardContainer } from "@/components/Wizard/WizardContainer";
import { FieldMappingBoard } from "@/components/FieldMapping/FieldMappingBoard";
import { SyncRulesConfig } from "@/components/SyncRules/SyncRulesConfig";

// ── Page Components ──
function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <DashboardHome />
    </div>
  );
}

function WizardPage() {
  return (
    <div className="animate-fade-in">
      <WizardContainer />
    </div>
  );
}

function ConnectionsPage() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Connections</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <p className="text-gray-400">
          Use the Setup Wizard to configure your connections, or manage existing connections below.
        </p>
      </div>
    </div>
  );
}

function MappingPage() {
  return (
    <div className="animate-fade-in">
      <FieldMappingBoard />
    </div>
  );
}

function RulesPage() {
  return (
    <div className="animate-fade-in">
      <SyncRulesConfig />
    </div>
  );
}

function LogsPage() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Sync Logs</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <p className="text-gray-400">Sync logs will appear here.</p>
      </div>
    </div>
  );
}

// ── App ──
function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/wizard" element={<WizardPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/mapping" element={<MappingPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/logs" element={<LogsPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
