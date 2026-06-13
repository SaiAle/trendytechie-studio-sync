import React, { useState } from "react";
import { Users, Shield, ShieldAlert, Key, FileText, Loader2, Plus, LogOut, Check, HelpCircle, Download } from "lucide-react";
import { ActiveUser, Project } from "../types";

interface CollaboratorsPanelProps {
  project: Project | null;
  activeUsers: ActiveUser[];
  onAddCollaborator: (email: string) => void;
  isEncrypted: boolean;
  setIsEncrypted: (enc: boolean) => void;
  passcode: string;
  setPasscode: (code: string) => void;
  onGenerateReport: () => Promise<void>;
  reportContent: string | null;
  reportLoading: boolean;
  closeReportModal: () => void;
  userEmail: string;
}

export default function CollaboratorsPanel({
  project,
  activeUsers,
  onAddCollaborator,
  isEncrypted,
  setIsEncrypted,
  passcode,
  setPasscode,
  onGenerateReport,
  reportContent,
  reportLoading,
  closeReportModal,
  userEmail
}: CollaboratorsPanelProps) {
  const [newCollabEmail, setNewCollabEmail] = useState("");
  const [showConfigSec, setShowConfigSec] = useState(false);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollabEmail.trim()) return;
    onAddCollaborator(newCollabEmail);
    setNewCollabEmail("");
  };

  const handleDownloadReport = () => {
    if (!reportContent) return;
    const blob = new Blob([reportContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "TrendyTechie-Project"}-Weekly-Report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-800 shadow-xl p-5 flex flex-col gap-5 font-sans">
      
      {/* 1. END-TO-END ENCRYPTION (E2EE) PANEL */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            {isEncrypted && passcode ? (
               <Shield className="w-5 h-5 text-indigo-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-indigo-400/80" />
            )}
            <div>
              <h4 className="text-xs font-bold text-slate-200 tracking-wider font-sans uppercase">
                Cryptographic Guard
              </h4>
              <p className="text-[9px] text-slate-400 font-mono tracking-wide">
                CLIENT-SIDE AES-256 ENCRYPTION
              </p>
            </div>
          </div>
          
          {/* Toggle E2EE */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">
              {isEncrypted ? "SECURED" : "OFF"}
            </span>
            <button
              onClick={() => setIsEncrypted(!isEncrypted)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                isEncrypted ? "bg-indigo-600" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isEncrypted ? "transform translate-x-4" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Password config if active */}
        {isEncrypted && (
          <div className="bg-[#0F172A] p-3.5 rounded-lg border border-indigo-950/20 flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-300 text-slate-350">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300 uppercase font-mono font-semibold">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Project Shared Passphrase</span>
            </div>
            
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter cryptographic shared secret..."
              className="w-full bg-[#1E293B] border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
            />
            <p className="text-[9px] text-slate-450 text-slate-400 font-sans leading-relaxed">
              * Prompts and Scripts are encrypted locally before syncing to Firestore. Collaborators must enter this identical phrase to decrypt & edit.
            </p>
          </div>
        )}
      </div>

      {/* 2. TEAM COLLABORATION & MULTI-USER PERMISSIONS */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="text-xs font-bold text-slate-200 tracking-wider font-sans uppercase">
                Collaboration Session
              </h4>
              <p className="text-[9px] text-slate-400 font-mono tracking-wide">
                MULTI-USER ROLE MANAGEMENT
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-mono font-semibold animate-pulse">
            {activeUsers.filter(u => u.online).length} ONLINE
          </span>
        </div>

        {/* Member list */}
        <div className="flex flex-col gap-2 mb-4">
          {activeUsers.map((user) => (
            <div
              key={user.userId}
              className="flex items-center justify-between p-2.5 bg-[#0F172A] rounded-xl border border-slate-800"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-[#1E293B] border border-slate-700 flex items-center justify-center font-bold text-xs uppercase font-sans text-slate-200">
                    {user.displayName.substring(0, 1)}
                  </div>
                  {user.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
                  )}
                </div>
                <div className="flex flex-col truncate leading-tight">
                  <span className="text-xs text-slate-200 font-medium truncate">
                    {user.displayName === userEmail ? `${user.displayName} (You)` : user.displayName}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              {/* Tag representation of role */}
              <span className={`text-[8px] font-mono uppercase font-bold px-2 py-0.5 rounded-lg ${
                user.role === "owner"
                  ? "bg-amber-950/40 text-amber-400 border border-amber-900/40"
                  : user.role === "editor"
                  ? "bg-indigo-950/40 text-indigo-400 border border-indigo-900/40"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}>
                {user.role}
              </span>
            </div>
          ))}
        </div>

        {/* Invitation Form */}
        <form onSubmit={handleAddSubmit} className="flex gap-2">
          <input
            type="email"
            value={newCollabEmail}
            onChange={(e) => setNewCollabEmail(e.target.value)}
            placeholder="Invite collaborator email..."
            className="flex-1 bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            className="bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-indigo-400 rounded-lg p-2.5 transition flex items-center justify-center shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 3. REPORT GENERATOR TRIGGERS */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="text-xs font-bold text-slate-200 tracking-wider font-sans uppercase">
                Production Analytics
              </h4>
              <p className="text-[9px] text-slate-400 font-mono tracking-wide">
                AUTOMATED REPORT GENERATION
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onGenerateReport}
          disabled={reportLoading}
          className="w-full bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-white font-sans font-semibold text-xs py-2.5 rounded-xl transition shadow flex items-center justify-center gap-2 select-none active:scale-95"
        >
          {reportLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin animate-spin-slow" />
              Auditing timeline metrics...
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" />
              Generate Weekly Analytics Report
            </>
          )}
        </button>
      </div>

      {/* 4. MODAL: REPORT DISPLAY */}
      {reportContent && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header info */}
            <div className="px-6 py-4 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold text-white font-sans uppercase tracking-wider">
                  Automated Weekly Report - Telemetry Logs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadReport}
                  className="p-1.5 text-slate-300 hover:text-white bg-[#1E293B] border border-slate-700 rounded-lg"
                  title="Download Markdown file"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={closeReportModal}
                  className="px-3 py-1 text-xs text-slate-350 text-slate-300 hover:text-white bg-[#1E293B] border border-slate-700 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Markdown Scroll content */}
            <div className="p-6 overflow-y-auto text-xs text-slate-305 text-slate-300 font-sans leading-relaxed flex flex-col gap-2">
              <div className="prose prose-invert prose-xs">
                {/* Basic rendering of markdown titles and bullets manually to prevent additional complex styling issues */}
                {reportContent.split("\n").map((line, idx) => {
                  if (line.startsWith("###")) {
                    return <h4 key={idx} className="text-sm font-bold text-indigo-400 mt-4 mb-2">{line.replace("###", "")}</h4>;
                  }
                  if (line.startsWith("##")) {
                    return <h3 key={idx} className="text-base font-bold text-white mt-5 mb-2 border-b border-slate-800 pb-1">{line.replace("##", "")}</h3>;
                  }
                  if (line.startsWith("#")) {
                    return <h2 key={idx} className="text-lg font-semibold text-indigo-400 mt-2 mb-3">{line.replace("#", "")}</h2>;
                  }
                  if (line.startsWith("-") || line.startsWith("*")) {
                    return <li key={idx} className="ml-4 list-disc text-slate-305 text-slate-300 mb-1">{line.substring(2)}</li>;
                  }
                  return <p key={idx} className="text-slate-350 text-slate-400 mb-2">{line}</p>;
                })}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3.5 bg-[#0F172A] border-t border-slate-800 text-right">
              <span className="text-[10px] text-slate-500 font-mono">
                Authorized Cryptographic Lock: AES-GCM
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
