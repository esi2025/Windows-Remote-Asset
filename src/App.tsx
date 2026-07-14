import React, { useState } from "react";
import { Computer, CollectorConfig } from "./types";
import { INITIAL_HOSTNAMES, getSimulatedHardware, getSimulatedSecurityAudit } from "./mockData";
import NetworkDashboard from "./components/NetworkDashboard";
import CollectorConsole from "./components/CollectorConsole";
import ScriptGenerator from "./components/ScriptGenerator";
import GPOHelper from "./components/GPOHelper";
import SecurityGuide from "./components/SecurityGuide";
import {
  ShieldAlert,
  Server,
  Network,
  Cpu,
  Terminal,
  Settings,
  HelpCircle,
  FileSpreadsheet,
  Activity,
  LogOut,
  Wrench,
  Lock,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "console" | "script" | "gpo" | "security">("console");

  // Global list of computers with initial state
  const [computers, setComputers] = useState<Computer[]>(() => {
    return INITIAL_HOSTNAMES.map((name) => {
      // Pre-seed a few successful outcomes so the dashboard starts with some gorgeous visual data!
      const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const preSeedSuccess = name.includes("DESKTOP") || name.includes("DC") || name.includes("MARKETING");
      
      if (preSeedSuccess) {
        return {
          hostname: name,
          status: "success",
          attempts: 1,
          lastAttemptTime: "Pre-seeded",
          data: getSimulatedHardware(name),
          securityAudit: getSimulatedSecurityAudit(name),
          history: [
            {
              timestamp: "10:14:02 AM",
              status: "pinging",
              protocol: "wmi",
              message: "Ping packet echoed successfully. TTL=128"
            },
            {
              timestamp: "10:14:03 AM",
              status: "connecting",
              protocol: "wmi",
              message: "RPC Connection established on endpoint TCP 135"
            },
            {
              timestamp: "10:14:05 AM",
              status: "authenticating",
              protocol: "wmi",
              message: "Kerberos ticket authentication succeeded for CORP\\Administrator"
            },
            {
              timestamp: "10:14:06 AM",
              status: "collecting",
              protocol: "wmi",
              message: "CIM Classes queried: Win32_BaseBoard, Win32_Processor, Win32_Battery, Win32_DiskDrive"
            },
            {
              timestamp: "10:14:08 AM",
              status: "success",
              protocol: "wmi",
              message: "Remote CIM query completed. 8/8 attributes cataloged"
            }
          ]
        };
      }

      return {
        hostname: name,
        status: "idle",
        attempts: 0,
      };
    });
  });

  // Global collector configurations
  const [config, setConfig] = useState<CollectorConfig>({
    protocol: "wmi",
    authMethod: "domain",
    username: "bnpp2project.local\\m.esmaeili",
    retryIntervalMinutes: 60,
    maxRetries: 3,
    timeoutSeconds: 15,
    selectedAttributes: [
      "IP & MAC Addresses",
      "Logged-in User",
      "Motherboard Info",
      "CPU Configuration",
      "RAM Allocations",
      "GPU Info",
      "Storage drives",
      "Power Supply Telemetry",
    ],
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased flex flex-col selection:bg-zinc-800">
      {/* Top Professional Enterprise Header */}
      <header className="bg-zinc-900 border-b border-zinc-850 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4" id="app-header">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-sans font-bold tracking-tight text-white flex items-center gap-2">
              Windows Remote Asset Collector
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Enterprise Intranet CIM / WinRM Auditor Console
            </p>
          </div>
        </div>

        {/* Global Overview Quick Status Badge */}
        <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-850" id="quick-stats-badge">
          <div className="text-right">
            <span className="text-[10px] font-mono text-zinc-500 block">INVENTORY PROGRESS</span>
            <span className="text-xs font-mono font-bold text-white block">
              {computers.filter((c) => c.status === "success").length} / {computers.length} Collected
            </span>
          </div>
          <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  (computers.filter((c) => c.status === "success").length / computers.length) * 100
                }%`,
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-full w-full p-4 md:p-8 flex flex-col gap-6">
        {/* Navigation Tabs bar */}
        <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-1.5 flex flex-wrap gap-1" id="app-navigation-tabs">
          <button
            onClick={() => setActiveTab("console")}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider font-semibold uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "console"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Terminal className="h-4 w-4" />
            1. Collector Console
          </button>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider font-semibold uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Server className="h-4 w-4" />
            2. Dashboard Analytics
          </button>

          <button
            onClick={() => setActiveTab("script")}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider font-semibold uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "script"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Cpu className="h-4 w-4" />
            3. Deployable Script Compiler
          </button>

          <button
            onClick={() => setActiveTab("gpo")}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider font-semibold uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "gpo"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Wrench className="h-4 w-4" />
            4. Port & GPO Setup
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider font-semibold uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Lock className="h-4 w-4" />
            5. Least Privilege Audit
          </button>
        </div>

        {/* Tab contents window with smooth subtle entry */}
        <div className="flex-1 bg-zinc-950 rounded-2xl" id="tab-content-window">
          {activeTab === "console" && (
            <CollectorConsole
              computers={computers}
              setComputers={setComputers}
              config={config}
              setConfig={setConfig}
            />
          )}

          {activeTab === "dashboard" && <NetworkDashboard computers={computers} />}

          {activeTab === "script" && (
            <ScriptGenerator config={config} computers={computers} />
          )}

          {activeTab === "gpo" && <GPOHelper />}

          {activeTab === "security" && (
            <SecurityGuide computers={computers} setComputers={setComputers} />
          )}
        </div>
      </main>

      {/* Footer detailing architectural honesty, stack, and security */}
      <footer className="mt-auto bg-zinc-900 border-t border-zinc-850 px-6 py-6 text-center text-xs text-zinc-500 font-mono leading-relaxed" id="app-footer">
        <p className="font-semibold text-zinc-400">
          Windows Remote Asset Collector — Enterprise Audit Suite
        </p>
        <p className="mt-1">
          Designed for standard IT administrators. Employs Microsoft CIM Infrastructure (<code className="text-zinc-400">Root\CIMv2</code>) and WS-Management/WinRM.
        </p>
        <div className="mt-3 flex justify-center gap-6 text-[10px] text-zinc-600">
          <span>Stack: Express, React, TypeScript, Tailwind</span>
          <span>•</span>
          <span>Security: Cryptographic Credentials (DPAPI / SecureString)</span>
          <span>•</span>
          <span>Auditing: Active-Directory GPO Aligned</span>
        </div>
      </footer>
    </div>
  );
}
