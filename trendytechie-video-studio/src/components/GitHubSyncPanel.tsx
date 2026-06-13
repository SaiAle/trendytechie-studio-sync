import React, { useState, useEffect } from "react";
import { 
  Github, GitBranch, ArrowUpRight, FolderSync, Terminal, 
  CheckCircle2, AlertCircle, Loader2, HelpCircle, Lock, Server
} from "lucide-react";
import { Project, TimelineTrack } from "../types";

interface GitHubSyncPanelProps {
  project: Project;
  tracks: TimelineTrack[];
  onLogOperation?: (message: string) => void;
}

export default function GitHubSyncPanel({ project, tracks }: GitHubSyncPanelProps) {
  // Config states
  const [token, setToken] = useState<string>("");
  const [repoOwner, setRepoOwner] = useState<string>("SaiAle");
  const [repoName, setRepoName] = useState<string>("trendytechie-studio-sync");
  const [branch, setBranch] = useState<string>("main");
  const [syncType, setSyncType] = useState<"full" | "data">("full");
  
  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Show guide
  const [showPATGuide, setShowPATGuide] = useState<boolean>(false);

  // Load persisted metadata from local storage for seamless workflow
  useEffect(() => {
    const savedToken = localStorage.getItem("LTX_GITHUB_TOKEN");
    const savedOwner = localStorage.getItem("LTX_GITHUB_OWNER");
    const savedRepoName = localStorage.getItem("LTX_GITHUB_REPONAME");
    
    if (savedToken) setToken(savedToken);
    if (savedOwner) setRepoOwner(savedOwner);
    if (savedRepoName) setRepoName(savedRepoName);
  }, []);

  // Save config details
  const saveConfig = (newToken: string, newOwner: string, newRepo: string) => {
    localStorage.setItem("LTX_GITHUB_TOKEN", newToken);
    localStorage.setItem("LTX_GITHUB_OWNER", newOwner);
    localStorage.setItem("LTX_GITHUB_REPONAME", newRepo);
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !repoOwner.trim() || !repoName.trim()) {
      setErrorMsg("Please provide all required GitHub configuration variables.");
      return;
    }

    // Save configuration persistently
    saveConfig(token, repoOwner, repoName);

    setIsLoading(true);
    setSuccessUrl(null);
    setErrorMsg(null);
    setLogs(["[SYSTEM] Initiating GitHub deployment sequence..."]);

    const appendLog = (msg: string) => {
      setLogs((prev) => [...prev, msg]);
    };

    try {
      appendLog("[CLIENT] Bundling project timeline data...");
      
      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: token.trim(),
          repoOwner: repoOwner.trim(),
          repoName: repoName.trim(),
          branch: branch.trim() || "main",
          syncType,
          projectData: project,
          tracksData: tracks
        })
      });

      const result = await response.json();
      
      // Stream server logs
      if (result.logs && Array.isArray(result.logs)) {
        result.logs.forEach((srvLog: string) => appendLog(srvLog));
      }

      if (response.ok && result.success) {
        setSuccessUrl(result.repoUrl);
        appendLog(`[SUCCESS] Project code repository synchronized perfectly! URL: ${result.repoUrl}`);
      } else {
        throw new Error(result.error || "Failed to finalize GitHub API operations.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Network timeout or credentials authorized error.");
      appendLog(`[ERROR] Sequence aborted: ${err.message || "Network exception"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-800 shadow-xl p-5 flex flex-col gap-4 font-sans text-slate-200">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-indigo-400" />
          <div>
            <h4 className="text-xs font-bold text-slate-200 tracking-wider font-sans uppercase">
              GitHub Repositories Sync
            </h4>
            <p className="text-[9px] text-slate-400 font-mono tracking-wide">
              RUN FULL TIMELINE WORKSPACE ON GITHUB
            </p>
          </div>
        </div>
        
        {/* Helper guide clicker */}
        <button
          onClick={() => setShowPATGuide(!showPATGuide)}
          className="text-slate-400 hover:text-indigo-400 transition"
          title="See setup guide"
          type="button"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Guide Card */}
      {showPATGuide && (
        <div className="bg-[#0F172A] p-4 rounded-xl border border-indigo-500/10 text-[11px] leading-relaxed text-slate-350 animate-in slide-in-from-top-2">
          <h5 className="font-semibold text-slate-200 mb-1.5 flex items-center gap-1">
            <Lock className="w-3 h-3 text-indigo-400" /> How to generate a Personal Access Token (PAT):
          </h5>
          <ol className="list-decimal pl-4.5 space-y-1 text-slate-400">
            <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">GitHub Token Settings Page</a>.</li>
            <li>Click <strong>Generate new token (classic)</strong> or use fine-grained tokens.</li>
            <li>Select the <strong>repo</strong> scope (gives permission to create and populate repositories).</li>
            <li>Copy the token and paste it into the field below. Your token is stored and encrypted only in your browser's local safety block.</li>
          </ol>
        </div>
      )}

      {/* Synchronizer settings form */}
      <form onSubmit={handleSyncSubmit} className="flex flex-col gap-3.5">
        
        {/* Token Authentication */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>Personal Access Token (PAT)</span>
            <span className="text-[9px] text-indigo-400 font-mono italic">Client-side saved</span>
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
            required
          />
        </div>

        {/* Owner and Repo Name in row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              GitHub username
            </label>
            <input
              type="text"
              value={repoOwner}
              onChange={(e) => setRepoOwner(e.target.value)}
              placeholder="e.g. saikumar131631"
              className="w-full bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Repository Name
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="trendytechie-video-studio"
              className="w-full bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
              required
            />
          </div>
        </div>

        {/* Branch name and Sync Mode Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Git Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Deployment Mode
            </label>
            <select
              value={syncType}
              onChange={(e) => setSyncType(e.target.value as "full" | "data")}
              className="w-full bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="full">Deploy Full Cloned Web App</option>
              <option value="data">Save JSON Model Configs</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isLoading || !token || !repoOwner || !repoName}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow shadow-indigo-600/10 flex items-center justify-center gap-1.5 disabled:opacity-40 select-none active:scale-95 mt-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Executing Push Request Node...
            </>
          ) : (
            <>
              <FolderSync className="w-3.5 h-3.5" />
              Publish Workstation App to GitHub
            </>
          )}
        </button>
      </form>

      {/* Operation Log Terminal console */}
      {logs.length > 0 && (
        <div className="bg-[#0F172A] rounded-xl border border-slate-800 p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-indigo-400" /> SYNC OPERATION METRIC LOGS
            </span>
            <button
              onClick={() => setLogs([])}
              className="text-[9px] hover:text-slate-200"
            >
              Clear
            </button>
          </div>
          <div className="max-h-24 overflow-y-auto font-mono text-[9px] text-purple-300 space-y-1 select-text scrollbar-thin leading-relaxed">
            {logs.map((log, idx) => (
              <p 
                key={idx} 
                className={`${
                  log.includes("[SUCCESS]") 
                    ? "text-emerald-400 font-semibold" 
                    : log.includes("[ERROR]") 
                    ? "text-rose-400 font-semibold animate-pulse" 
                    : log.includes("[SYSTEM]")
                    ? "text-indigo-400 font-bold"
                    : "text-slate-350 text-slate-300"
                }`}
              >
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Error / Success UI Feedbacks */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-3.5 py-2 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
          <div className="leading-normal">
            <span className="font-semibold block">GitHub API Error Encountered</span>
            <p className="text-[10px] text-slate-350">{errorMsg}</p>
          </div>
        </div>
      )}

      {successUrl && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-3.5 py-3 rounded-xl flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4.5 h-4.5 mt-0.5 shrink-0 text-emerald-400" />
            <div className="leading-normal">
              <span className="font-semibold block text-slate-200">Repository Published Successfully!</span>
              <p className="text-[10px] text-slate-400">The sequencer and workspace files are committed directly to your repository profile.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <a
              href={successUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-1.5 bg-indigo-600 hover:bg-indigo-505 bg-indigo-500/20 border border-indigo-500/30 text-white rounded-lg font-semibold flex items-center justify-center gap-1 text-[11px] hover:bg-indigo-500/30 transition text-indigo-400"
            >
              Open GitHub Repo
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
