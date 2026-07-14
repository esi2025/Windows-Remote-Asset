import React, { useState } from "react";
import { CollectorConfig } from "../types";
import { Copy, Check, Download, Cpu, Play, Terminal, Sparkles, RefreshCw, AlertTriangle, Key } from "lucide-react";

interface ScriptGeneratorProps {
  config: CollectorConfig;
  computers: { hostname: string }[];
}

export default function ScriptGenerator({ config, computers }: ScriptGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<{ powershell: string; csharp: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<"powershell" | "csharp" | null>(null);
  const [activeTab, setActiveTab] = useState<"powershell" | "csharp">("powershell");

  const hostnames = computers.map((c) => c.hostname);

  const generateScripts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostnames: hostnames,
          selectedAttributes: config.selectedAttributes,
          protocol: config.protocol,
          retryIntervalMinutes: config.retryIntervalMinutes,
          maxRetries: config.maxRetries,
          timeoutSeconds: config.timeoutSeconds,
          authMethod: config.authMethod,
          username: config.username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate scripts");
      }

      const data = await response.json();
      setScripts(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while communicating with Gemini AI.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "powershell" | "csharp") => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" id="gen-intro">
        <h3 className="text-sm font-mono text-zinc-300 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" /> Customized Script Compiler
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
          This panel uses the server-side <span className="text-white font-semibold">Gemini 3.5 Flash</span> engine to compile customized, security-hardened PowerShell and C# code based on your active host list and data-collection configurations.
        </p>
        <div className="mt-4 p-3.5 bg-zinc-950 border border-zinc-850 rounded-lg flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-mono text-zinc-500">
          <span>Connection Type: <strong className="text-zinc-300 uppercase">{config.protocol}</strong></span>
          <span>Attributes Target: <strong className="text-zinc-300">{config.selectedAttributes.length}</strong></span>
          <span>Hosts Target: <strong className="text-zinc-300">{hostnames.length} machines</strong></span>
          <span>Auth: <strong className="text-zinc-300 uppercase">{config.authMethod}</strong></span>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/40 text-red-400 rounded-xl p-4 flex gap-3 text-xs font-mono" id="gen-error">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold">Generation Failed</p>
            <p className="mt-1 text-[11px] opacity-90">{error}</p>
            <p className="mt-2 text-[10px] text-zinc-500">Ensure the server's GEMINI_API_KEY is configured correctly under the Settings panel.</p>
          </div>
        </div>
      )}

      {/* Script Section */}
      {!scripts && !loading ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-800 bg-zinc-900/40 rounded-xl text-center" id="gen-empty">
          <Cpu className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-300 font-sans font-semibold mb-1">No scripts generated yet</p>
          <p className="text-xs text-zinc-500 font-sans max-w-md mb-5 leading-relaxed">
            Click Compile Script below to analyze your Active Target list, selected Attributes, and Connection protocol, compiling a custom script ready to deploy in your domain.
          </p>
          <button
            onClick={generateScripts}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-6 rounded-lg transition shadow-md shadow-blue-900/10 cursor-pointer"
          >
            Compile Deployment Script
          </button>
        </div>
      ) : null}

      {loading && (
        <div className="flex flex-col items-center justify-center p-20 border border-zinc-800 bg-zinc-950/40 rounded-xl text-center" id="gen-loading">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-sm text-zinc-300 font-mono font-semibold">Generating Remote Automation Scripts...</p>
          <p className="text-xs text-zinc-500 font-sans mt-1">Configuring secure API calls, CIM namespace mapping, and retry scheduler modules...</p>
        </div>
      )}

      {scripts && !loading && (
        <div className="border border-zinc-800 bg-zinc-900 rounded-xl overflow-hidden flex flex-col" id="gen-results">
          {/* Tabs header */}
          <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-800 flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("powershell")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                  activeTab === "powershell"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                PowerShell (Enterprise Standard)
              </button>
              <button
                onClick={() => setActiveTab("csharp")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                  activeTab === "csharp"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                C# Console (.NET Core)
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  activeTab === "powershell"
                    ? copyToClipboard(scripts.powershell, "powershell")
                    : copyToClipboard(scripts.csharp, "csharp")
                }
                className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-white text-xs transition flex items-center gap-1.5 font-mono cursor-pointer"
                title="Copy code"
              >
                {copiedKey === activeTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> <span className="text-[10px]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> <span className="text-[10px]">Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  activeTab === "powershell"
                    ? downloadFile(scripts.powershell, "Collect-Assets.ps1")
                    : downloadFile(scripts.csharp, "Program.cs")
                }
                className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-white text-xs transition flex items-center gap-1.5 font-mono cursor-pointer"
                title="Download script"
              >
                <Download className="w-3.5 h-3.5" /> <span className="text-[10px]">Download</span>
              </button>
            </div>
          </div>

          {/* Interactive instruction alert */}
          <div className="bg-blue-950/20 px-5 py-3 border-b border-zinc-800/60 flex gap-2.5 text-[11px] font-mono leading-relaxed text-zinc-400">
            <Terminal className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-300 font-semibold block">Execution & Auditing Notes:</span>
              <p className="mt-0.5">
                {activeTab === "powershell" ? (
                  <>
                    Ensure ExecutionPolicy allows running local files (e.g., <code className="text-zinc-200">Set-ExecutionPolicy RemoteSigned -Scope Process</code>). Run as Local Administrator or Domain Admin to access standard CIM system namespaces.
                  </>
                ) : (
                  <>
                    Targeting .NET 8.0+. Requires referencing the <code className="text-zinc-200">Microsoft.Management.Infrastructure</code> NuGet library for cross-platform compliance, or standard <code className="text-zinc-200">System.Management</code> on Windows frameworks.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Code Body */}
          <div className="p-4 bg-zinc-950 overflow-auto max-h-[420px] select-text">
            <pre className="text-xs font-mono text-zinc-300 whitespace-pre leading-relaxed select-text font-medium selection:bg-zinc-800">
              <code>{activeTab === "powershell" ? scripts.powershell : scripts.csharp}</code>
            </pre>
          </div>

          {/* EXE Compilation Instruction Card */}
          <div className="bg-zinc-950 px-5 py-4 border-t border-zinc-800/80 space-y-3" id="exe-compilation-guide">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Convert to Standalone Windows Executable (.EXE)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono">
              <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800 space-y-2">
                <span className="text-zinc-300 font-semibold block">Method A: Compiling C# Code to Single-File EXE</span>
                <p className="text-zinc-500 text-[10px] leading-normal">Using the standard .NET CLI on Windows/Linux to build a self-contained single .exe file:</p>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-850 text-zinc-300 overflow-x-auto text-[10px] select-text whitespace-pre leading-relaxed">
{`dotnet new console -n AssetCollector
cd AssetCollector
dotnet add package Microsoft.Management.Infrastructure
# Save the code as Program.cs
dotnet publish -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true /p:PublishReadyToRun=true`}
                </div>
                <span className="text-zinc-500 text-[9px] block">Output: <strong className="text-emerald-500">bin/Release/net8.0/win-x64/publish/AssetCollector.exe</strong></span>
              </div>

              <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800 space-y-2">
                <span className="text-zinc-300 font-semibold block">Method B: Compiling PowerShell Script to EXE</span>
                <p className="text-zinc-500 text-[10px] leading-normal">Using the community-approved PS2EXE converter module in Windows PowerShell:</p>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-850 text-zinc-300 overflow-x-auto text-[10px] select-text whitespace-pre leading-relaxed">
{`Install-Module ps2exe -Scope CurrentUser
# Save script as Collect-Assets.ps1
ps2exe .\\Collect-Assets.ps1 .\\Collect-Assets.exe -title "Domain Asset Collector" -description "WMI/WinRM Inventory Telemetry Scanner"`}
                </div>
                <span className="text-zinc-500 text-[9px] block">Output: <strong className="text-emerald-500">.\\Collect-Assets.exe</strong></span>
              </div>
            </div>
          </div>

          {/* Recalculate button */}
          <div className="bg-zinc-950 p-3 border-t border-zinc-800 flex justify-end">
            <button
              onClick={generateScripts}
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Re-compile with latest settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
