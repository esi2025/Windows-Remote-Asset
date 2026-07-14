import React, { useState } from "react";
import { Computer } from "../types";
import { getSimulatedSecurityAudit } from "../mockData";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Key,
  UserCheck,
  EyeOff,
  FileText,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Lock,
  Globe,
  FileCode,
  Info
} from "lucide-react";

interface SecurityGuideProps {
  computers: Computer[];
  setComputers: React.Dispatch<React.SetStateAction<Computer[]>>;
}

export default function SecurityGuide({ computers, setComputers }: SecurityGuideProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCriteria, setFilterCriteria] = useState<"all" | "risk" | "compliant" | "unavailable">("all");
  const [expandedHost, setExpandedHost] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState<string | null>(null);
  const [isAuditingAll, setIsAuditingAll] = useState(false);
  const [auditProgressMsg, setAuditProgressMsg] = useState("");
  const [showReferenceGuide, setShowReferenceGuide] = useState(false);

  // Filter computers to only show scanned/authenticated ones
  const scannedComputers = computers.filter(c => c.status === "success");
  const totalScanned = scannedComputers.length;

  // Run dynamic compliance sweep for unscanned success computers
  const triggerSecurityAuditAll = async () => {
    setIsAuditingAll(true);
    setAuditProgressMsg("Initializing remote security audit sweep...");
    await new Promise(r => setTimeout(r, 600));
    setAuditProgressMsg("Querying Local Security Authority (LSA) parameters via WMI...");
    await new Promise(r => setTimeout(r, 700));
    setAuditProgressMsg("Scanning active Windows Firewall Profiles...");
    await new Promise(r => setTimeout(r, 600));
    setAuditProgressMsg("Checking registry keys for legacy SMBv1 configurations...");
    await new Promise(r => setTimeout(r, 700));
    setAuditProgressMsg("Auditing local SAM accounts, Guest access, and password metrics...");
    await new Promise(r => setTimeout(r, 500));

    setComputers(prev => prev.map(c => {
      if (c.status === "success" && !c.securityAudit) {
        return {
          ...c,
          securityAudit: getSimulatedSecurityAudit(c.hostname)
        };
      }
      return c;
    }));

    setIsAuditingAll(false);
    setAuditProgressMsg("");
  };

  // Run audit for a single computer
  const triggerSingleAudit = async (hostname: string) => {
    setComputers(prev => prev.map(c => {
      if (c.hostname === hostname) {
        return {
          ...c,
          securityAudit: getSimulatedSecurityAudit(hostname)
        };
      }
      return c;
    }));
  };

  // Metrics and statistics
  const auditedComputers = scannedComputers.filter(c => c.securityAudit !== undefined);
  const totalAuditedCount = auditedComputers.length;

  const averageScore = totalAuditedCount > 0
    ? Math.round(auditedComputers.reduce((acc, c) => acc + (c.securityAudit?.complianceScore ?? 0), 0) / totalAuditedCount)
    : 0;

  const firewallOffCount = auditedComputers.filter(c => c.securityAudit && !c.securityAudit.firewallEnabled).length;
  const defenderOffCount = auditedComputers.filter(c => c.securityAudit && !c.securityAudit.defenderActive).length;
  const smbV1ActiveCount = auditedComputers.filter(c => c.securityAudit && c.securityAudit.smbV1Enabled).length;
  const insecureAccountsCount = auditedComputers.filter(c => c.securityAudit && (c.securityAudit.insecureAccounts?.length ?? 0) > 0).length;

  // Handle clipboard copy
  const handleCopyScript = (hostname: string, scriptText: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedHost(hostname);
    setTimeout(() => {
      setCopiedHost(null);
    }, 2000);
  };

  // Generate copy-pasteable PowerShell remediation script based on actual failed checks
  const generateRemediationScript = (comp: Computer): string => {
    if (!comp.securityAudit) return "# Security Audit data not found. Please run scan first.";

    const audit = comp.securityAudit;
    let script = `# ========================================================================\n`;
    script += `# POWERSHELL SECURITY REMEDIATION SCRIPT FOR ENDPOINT: ${comp.hostname}\n`;
    script += `# Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    script += `# Current Compliance Score: ${audit.complianceScore}/100\n`;
    script += `# ========================================================================\n\n`;
    script += `Write-Host "Initializing remote administrative remediation sweep for ${comp.hostname}..." -ForegroundColor Cyan\n\n`;

    let actionRequired = false;

    if (!audit.firewallEnabled) {
      actionRequired = true;
      script += `# REMEDIATION 1: Force Enable Windows Defender Firewall for All Profiles\n`;
      script += `Write-Host "Enabling Windows Firewall across Domain, Private, and Public profiles..." -ForegroundColor Yellow\n`;
      script += `try {\n`;
      script += `    Set-NetFirewallProfile -Profile Domain,Private,Public -Enabled True -ErrorAction Stop\n`;
      script += `    Write-Host "[✓] Windows Firewall successfully enabled!" -ForegroundColor Green\n`;
      script += `} catch {\n`;
      script += `    Write-Warning "Failed to configure firewall: $_"\n`;
      script += `}\n\n`;
    }

    if (!audit.defenderActive) {
      actionRequired = true;
      script += `# REMEDIATION 2: Restart and Configure Windows Defender Antivirus Service\n`;
      script += `Write-Host "Activating and setting Windows Defender Service (WinDefend) to Automatic..." -ForegroundColor Yellow\n`;
      script += `try {\n`;
      script += `    Set-Service -Name WinDefend -StartupType Automatic -ErrorAction SilentlyContinue\n`;
      script += `    Start-Service -Name WinDefend -ErrorAction SilentlyContinue\n`;
      script += `    Set-MpPreference -DisableRealtimeMonitoring $false\n`;
      script += `    Write-Host "[✓] Windows Defender Real-time Protection active!" -ForegroundColor Green\n`;
      script += `} catch {\n`;
      script += `    Write-Warning "Failed to fully restore Defender: $_"\n`;
      script += `}\n\n`;
    }

    if (audit.smbV1Enabled) {
      actionRequired = true;
      script += `# REMEDIATION 3: Disable Legacy, Vulnerable SMBv1 Protocol (EternalBlue Vector)\n`;
      script += `Write-Host "Disabling SMBv1 server configuration and Windows Feature dependency..." -ForegroundColor Yellow\n`;
      script += `try {\n`;
      script += `    Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart -ErrorAction SilentlyContinue\n`;
      script += `    Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force -ErrorAction SilentlyContinue\n`;
      script += `    Write-Host "[✓] Legacy SMBv1 deactivated. Security footprint hardened!" -ForegroundColor Green\n`;
      script += `} catch {\n`;
      script += `    Write-Warning "Failed to disable SMBv1: $_"\n`;
      script += `}\n\n`;
    }

    if (audit.insecureAccounts && audit.insecureAccounts.length > 0) {
      actionRequired = true;
      script += `# REMEDIATION 4: Hardening Flagged Local User Accounts\n`;
      script += `Write-Host "Addressing local user accounts compliance failures..." -ForegroundColor Yellow\n`;
      
      audit.insecureAccounts.forEach(flag => {
        if (flag.toLowerCase().includes("guest")) {
          script += `# Action: Disable local Guest account\n`;
          script += `try {\n`;
          script += `    Disable-LocalUser -Name "Guest" -ErrorAction Stop\n`;
          script += `    Write-Host "[✓] Local Guest account disabled." -ForegroundColor Green\n`;
          script += `} catch {\n`;
          script += `    Write-Warning "Could not disable local Guest: $_"\n`;
          script += `}\n`;
        } else if (flag.toLowerCase().includes("administrator")) {
          script += `# Action: Standardize Admin password limitations\n`;
          script += `try {\n`;
          script += `    Set-LocalUser -Name "Administrator" -PasswordNeverExpires $false\n`;
          script += `    Write-Host "[✓] Local Administrator password expirations configured." -ForegroundColor Green\n`;
          script += `} catch {}\n`;
        } else {
          script += `# Action: Review configurations for account matching: "${flag}"\n`;
          script += `Write-Host "Please manually audit or cycle password for local account related to: ${flag}" -ForegroundColor DarkYellow\n`;
        }
      });
      script += `\n`;
    }

    if (!actionRequired) {
      script += `# Status: Host is already in 100% compliance!\n`;
      script += `Write-Host "Host is fully hardened. No changes were made." -ForegroundColor Green\n`;
    } else {
      script += `Write-Host "Remediation complete. Please run a fresh audit scan to update compliance scores." -ForegroundColor Green\n`;
    }

    return script;
  };

  // Filter computers by search and category
  const filteredList = computers.filter(c => {
    const matchesSearch = c.hostname.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterCriteria === "all") return true;
    if (filterCriteria === "unavailable") {
      return c.status === "offline" || c.status === "failed" || c.status === "idle";
    }

    // Must be scanned & audited for the next filters
    if (c.status !== "success" || !c.securityAudit) return false;

    if (filterCriteria === "risk") {
      return c.securityAudit.complianceScore < 100;
    }
    if (filterCriteria === "compliant") {
      return c.securityAudit.complianceScore === 100;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Module Title and Overview info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4" id="security-module-header">
        <div className="space-y-1">
          <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Security Compliance & Hardening Auditor
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            بررسی فعال کلاینت‌های دامین برای ارزیابی دیوارهای آتش (Firewall)، ضدویروس پیش‌فرض سیستم‌عامل (Defender)، پروتکل‌های ناامن قدیمی شبکه مانند SMBv1 و شناسایی حساب‌های محلی آسیب‌پذیر.
          </p>
        </div>

        {totalScanned > 0 && (
          <button
            onClick={triggerSecurityAuditAll}
            disabled={isAuditingAll || scannedComputers.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-2 transition shadow shadow-emerald-950 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditingAll ? "animate-spin" : ""}`} />
            {isAuditingAll ? "Auditing domain endpoints..." : "شروع اسکن سراسری امنیت کلاینت‌ها"}
          </button>
        )}
      </div>

      {/* Progress Log Alert during Audit Sweep */}
      {isAuditingAll && (
        <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-4 flex items-center gap-3 animate-pulse" id="audit-progress-bar">
          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
          <span className="text-xs font-mono text-zinc-300">
            {auditProgressMsg}
          </span>
        </div>
      )}

      {/* Security Auditor Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="security-stats-grid">
        {/* Compliance Radial representation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Average Compliance</span>
          <div className="py-2 flex items-baseline gap-2">
            <span className={`text-3xl font-mono font-black ${averageScore >= 80 ? "text-emerald-400" : averageScore >= 50 ? "text-amber-400" : "text-red-500"}`}>
              {totalAuditedCount > 0 ? `${averageScore}%` : "N/A"}
            </span>
            <span className="text-xs text-zinc-500 font-mono">Hardened</span>
          </div>
          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                averageScore >= 80 ? "bg-emerald-500" : averageScore >= 50 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${totalAuditedCount > 0 ? averageScore : 0}%` }}
            />
          </div>
        </div>

        {/* Firewall status card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block animate-pulse"></span> Windows Firewall OFF
          </span>
          <div className="py-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-mono font-black ${firewallOffCount > 0 ? "text-red-500" : "text-zinc-300"}`}>
              {firewallOffCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Endpoints exposed</span>
          </div>
          <span className="text-[9px] font-mono text-zinc-600 block">Required Domain firewall state</span>
        </div>

        {/* Antivirus status card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block animate-pulse"></span> Defender Deactivated
          </span>
          <div className="py-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-mono font-black ${defenderOffCount > 0 ? "text-amber-500" : "text-zinc-300"}`}>
              {defenderOffCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Unprotected nodes</span>
          </div>
          <span className="text-[9px] font-mono text-zinc-600 block">Antivirus state</span>
        </div>

        {/* SMBv1 Active vulnerabilities count */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 inline-block" /> SMBv1 Legacy Active
          </span>
          <div className="py-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-mono font-black ${smbV1ActiveCount > 0 ? "text-rose-500" : "text-zinc-300"}`}>
              {smbV1ActiveCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">High risk vulnerabilities</span>
          </div>
          <span className="text-[9px] font-mono text-red-900/80 font-bold block">Severe Lateral Exploit risk</span>
        </div>

        {/* Flagged insecure accounts */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-500 inline-block" /> Flagged SAM Accounts
          </span>
          <div className="py-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-mono font-black ${insecureAccountsCount > 0 ? "text-amber-500" : "text-zinc-300"}`}>
              {insecureAccountsCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Flawed local credentials</span>
          </div>
          <span className="text-[9px] font-mono text-zinc-600 block">Active default or guest profiles</span>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        {/* Category Filters */}
        <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-850 w-full sm:w-auto" id="sec-filters-tab">
          <button
            onClick={() => setFilterCriteria("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-tight transition ${
              filterCriteria === "all"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All Hosts ({computers.length})
          </button>
          <button
            onClick={() => setFilterCriteria("risk")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-tight transition ${
              filterCriteria === "risk"
                ? "bg-red-950/40 border border-red-900/30 text-red-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Vulnerable ({scannedComputers.filter(c => c.securityAudit && c.securityAudit.complianceScore < 100).length})
          </button>
          <button
            onClick={() => setFilterCriteria("compliant")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-tight transition ${
              filterCriteria === "compliant"
                ? "bg-emerald-950/40 border border-emerald-900/30 text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Hardened ({scannedComputers.filter(c => c.securityAudit && c.securityAudit.complianceScore === 100).length})
          </button>
          <button
            onClick={() => setFilterCriteria("unavailable")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-tight transition ${
              filterCriteria === "unavailable"
                ? "bg-zinc-900 text-zinc-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Unscanned / Offline
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="فیلتر نام کامپیوتر..."
            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main List of Audited Computers */}
      <div className="space-y-3" id="audited-computers-grid">
        {filteredList.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 font-mono text-xs">
            هیچ کامپیوتری با معیارهای فیلتر شده مطابقت ندارد. از تب Collector Console کلاینت‌ها را اسکن کنید.
          </div>
        ) : (
          filteredList.map((comp) => {
            const isExpanded = expandedHost === comp.hostname;
            const hasAudit = comp.securityAudit !== undefined;
            const isHostSuccess = comp.status === "success";

            // Status category logic
            let scoreColor = "text-zinc-500";
            let scoreBg = "bg-zinc-950 border-zinc-800";
            let scoreText = "NOT AUDITED";

            if (hasAudit) {
              const score = comp.securityAudit!.complianceScore;
              if (score === 100) {
                scoreColor = "text-emerald-400";
                scoreBg = "bg-emerald-950/30 border-emerald-900/40";
                scoreText = "SECURED";
              } else if (score >= 70) {
                scoreColor = "text-amber-400";
                scoreBg = "bg-amber-950/30 border-amber-900/40";
                scoreText = "WARN / LIGHT HARDENED";
              } else {
                scoreColor = "text-red-500";
                scoreBg = "bg-red-950/30 border-red-900/40";
                scoreText = "HIGH RISK VULNERABILITY";
              }
            } else if (comp.status === "offline") {
              scoreColor = "text-zinc-600";
              scoreBg = "bg-zinc-950 border-zinc-850";
              scoreText = "HOST OFFLINE";
            } else if (comp.status === "failed") {
              scoreColor = "text-red-500/70";
              scoreBg = "bg-zinc-950 border-zinc-850";
              scoreText = "RPC ACCESS DENIED";
            }

            return (
              <div
                key={comp.hostname}
                className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isExpanded ? "border-zinc-700 shadow-xl" : "border-zinc-800 hover:border-zinc-750"
                }`}
                id={`host-compliance-${comp.hostname}`}
              >
                {/* Collapsible Card Header */}
                <div
                  onClick={() => setExpandedHost(isExpanded ? null : comp.hostname)}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                      <Terminal className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-sans font-bold text-white flex items-center gap-2">
                        {comp.hostname}
                        {isHostSuccess && (
                          <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-900/30 px-1.5 py-0.5 rounded font-mono font-bold">
                            CIM CONNECTED
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {comp.data?.ipAddress || "No IP Address"} • {comp.data?.osName || "OS Details Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Score badge & expand trigger */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className={`px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold flex items-center gap-1.5 ${scoreBg} ${scoreColor}`}>
                      {hasAudit ? (
                        <>
                          <Shield className="w-3.5 h-3.5" />
                          <span>Compliance: {comp.securityAudit?.complianceScore}/100 ({scoreText})</span>
                        </>
                      ) : (
                        <span>{scoreText}</span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                  </div>
                </div>

                {/* Expanded Card Details Body */}
                {isExpanded && (
                  <div className="border-t border-zinc-850 bg-zinc-950 p-5 space-y-5 animate-slideDown">
                    {!hasAudit ? (
                      <div className="py-8 text-center space-y-4">
                        <ShieldAlert className="w-10 h-10 text-zinc-600 mx-auto" />
                        <div className="space-y-1">
                          <p className="text-xs font-mono text-zinc-400">
                            این کامپیوتر هنوز مورد اسکن امنیتی قرار نگرفته است.
                          </p>
                          <p className="text-[10px] text-zinc-500 max-w-md mx-auto">
                            برای شروع، روی دکمه زیر کلیک کنید تا متغیرهای امنیتی کلاینت از طریق فراخوانی‌های امن RPC بررسی شوند.
                          </p>
                        </div>
                        {isHostSuccess ? (
                          <button
                            onClick={() => triggerSingleAudit(comp.hostname)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-lg transition inline-flex items-center gap-2 cursor-pointer shadow"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Core Audit Scan
                          </button>
                        ) : (
                          <div className="text-[10px] bg-red-950/20 border border-red-900/30 text-red-400 p-2.5 rounded-lg inline-block font-mono">
                            ⚠️ Audit unavailable: Machine must be scanned and in successful state in Collector Console tab.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Audit Parameters Details */}
                        <div className="lg:col-span-5 space-y-4 font-mono text-[11px]">
                          <h4 className="text-[10px] uppercase text-zinc-500 tracking-wider font-bold border-b border-zinc-850 pb-1.5 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-blue-400" />
                            Security Parameters Checked
                          </h4>

                          <div className="space-y-3">
                            {/* Windows Firewall */}
                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-850 flex items-start gap-2.5 justify-between">
                              <div className="space-y-1">
                                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                                  Windows Firewall Profile
                                </span>
                                <span className="text-[10px] text-zinc-500 block leading-normal">
                                  باید در تمام سطوح Domain، Private و Public برای مسدودسازی بردارهای نفوذ جانبی فعال باشد.
                                </span>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                {comp.securityAudit!.firewallEnabled ? (
                                  <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> ENABLED
                                  </span>
                                ) : (
                                  <span className="bg-red-950/50 text-red-500 border border-red-900/40 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> DEACTIVATED
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Windows Defender */}
                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-850 flex items-start gap-2.5 justify-between">
                              <div className="space-y-1">
                                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                                  Windows Defender / Antivirus
                                </span>
                                <span className="text-[10px] text-zinc-500 block leading-normal">
                                  سیستم حفاظتی بلادرنگ و نظارت رفتاری پیش‌فرض ویندوز برای مقابله با بدافزارها و باج‌افزارها.
                                </span>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                {comp.securityAudit!.defenderActive ? (
                                  <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> RUNNING
                                  </span>
                                ) : (
                                  <span className="bg-red-950/50 text-red-500 border border-red-900/40 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> STOPPED
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Legacy SMBv1 */}
                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-850 flex items-start gap-2.5 justify-between">
                              <div className="space-y-1">
                                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                                  Legacy SMBv1 Protocol
                                </span>
                                <span className="text-[10px] text-zinc-500 block leading-normal text-rose-300/80">
                                  پروتکل قدیمی اشتراک فایل که دارای ضعف‌های ساختاری شدید است (آسیب‌پذیری‌های EternalBlue و WannaCry).
                                </span>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                {!comp.securityAudit!.smbV1Enabled ? (
                                  <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> DISABLED
                                  </span>
                                ) : (
                                  <span className="bg-red-950/50 text-red-500 border border-red-900/40 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 text-red-500" /> ACTIVE (VULNERABLE)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Local SAM Accounts */}
                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-850 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-300 font-semibold">Local SAM Accounts Compliance</span>
                                <span className="text-[9px] text-zinc-500">Local Security Authority (LSA)</span>
                              </div>
                              
                              {comp.securityAudit!.insecureAccounts && comp.securityAudit!.insecureAccounts.length > 0 ? (
                                <div className="space-y-1.5">
                                  {comp.securityAudit!.insecureAccounts.map((issue, idx) => (
                                    <div key={idx} className="bg-amber-950/20 border border-amber-900/30 p-2 rounded text-[10px] text-amber-300 flex items-center gap-1.5">
                                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                      <span>{issue}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-emerald-950/20 border border-emerald-900/30 p-2 rounded text-[10px] text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>No local credential vulnerabilities detected. Accounts are hardened.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* PowerShell Remediation Script Block */}
                        <div className="lg:col-span-7 flex flex-col h-full space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider font-bold flex items-center gap-1">
                              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                              PowerShell Remediation Compiler
                            </span>
                            <button
                              onClick={() => handleCopyScript(comp.hostname, generateRemediationScript(comp))}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-750 rounded-lg text-[10px] font-mono flex items-center gap-1.5 transition cursor-pointer font-semibold"
                            >
                              {copiedHost === comp.hostname ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copied Fix!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Remediation Code</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex-1 font-mono text-[10.5px] text-zinc-300 overflow-x-auto max-h-72 lg:max-h-[380px] overflow-y-auto leading-relaxed relative scrollbar-thin shadow-inner">
                            <pre className="whitespace-pre">{generateRemediationScript(comp)}</pre>
                          </div>
                          
                          <div className="text-[9px] text-zinc-500 font-mono italic">
                            💡 Tip: Run this script inside an elevated Administrative PowerShell terminal on the target host to automatically enforce the compliance standards.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reference Material Toggle Button */}
      <div className="flex justify-center pt-4" id="reference-guide-toggle-btn">
        <button
          onClick={() => setShowReferenceGuide(!showReferenceGuide)}
          className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-zinc-500" />
          {showReferenceGuide ? "Hide least-privilege setup reference" : "Show least-privilege setup reference guide"}
        </button>
      </div>

      {/* Embedded Collapsible Reference guidelines (original instructional files preserved) */}
      {showReferenceGuide && (
        <div className="space-y-6 border-t border-zinc-850 pt-6 animate-slideDown" id="security-reference-material">
          {/* High-Level warning alert */}
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-5 flex gap-4 text-xs font-mono text-amber-300">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="font-bold uppercase tracking-wider text-amber-400">Security Warning: Avoid Domain Admin Overkill</p>
              <p className="leading-relaxed text-zinc-400">
                It is a common but dangerous practice in corporate IT environments to run asset collection scripts under full <strong className="text-white">Domain Admin</strong> credentials. If a target machine is compromised, dynamic session keys can be harvested from LSASS memory, leading to domain-wide lateral movement. Follow our least-privilege configurations below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Least Privilege Access */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-mono text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" /> Least-Privilege Remote Management
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                To query computer details over CIM/WMI or WinRM without granting target Domain Administrator rights, configure a specific "Asset Collector" AD Security Group with the following localized permissions on target endpoints:
              </p>
              <ul className="space-y-2.5 text-xs font-mono text-zinc-500">
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <div>
                    <span className="text-zinc-300 font-semibold block">Remote Management Group Membership</span>
                    Add the AD user to the target computer's local <strong className="text-zinc-400">Remote Management Users</strong> group.
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <div>
                    <span className="text-zinc-300 font-semibold block">WMI Namespace Security ACLs</span>
                    Grant the service user <strong className="text-zinc-400">Execute Methods</strong>, <strong className="text-zinc-400">Enable Account</strong>, and <strong className="text-zinc-400">Remote Enable</strong> permissions on the Root\CIMv2 WMI namespace (via <code className="text-zinc-400">wmimgmt.msc</code>).
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <div>
                    <span className="text-zinc-300 font-semibold block">WinRM Session Configuration Access</span>
                    Grant security privileges to the WinRM endpoint using:
                    <code className="block bg-zinc-950 p-1.5 rounded border border-zinc-850 text-zinc-400 text-[10px] mt-1">
                      Set-PSSessionConfiguration -Name Microsoft.PowerShell -ShowSecurityDescriptorUI
                    </code>
                  </div>
                </li>
              </ul>
            </div>

            {/* Secure Credential Handling */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-mono text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" /> Secure Credential Handling
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Never store cleartext passwords inside PowerShell (.ps1) or C# (.cs) files. When deploying automated scans, utilize these standards:
              </p>
              <div className="space-y-3 font-mono text-xs text-zinc-500">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                  <span className="text-zinc-300 font-semibold block flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> Interactive Execution:
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Prompt the system operator directly. This generates secure, DPAPI-encrypted memory representations:
                  </p>
                  <code className="block text-[10px] text-emerald-500 mt-1">
                    $Credential = Get-Credential
                  </code>
                </div>

                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                  <span className="text-zinc-300 font-semibold block">Non-Interactive Scheduled Task scans:</span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Export encrypted credentials to the local machine disk (re-readable only by the same system account using a local DPAPI key):
                  </p>
                  <code className="block text-[10px] text-emerald-500 mt-1">
                    $Credential.Password | ConvertFrom-SecureString | Out-File "C:\\Secrets\\pass.txt"
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Ethical Considerations */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-mono text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" /> Compliance & Security Logs Logging
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Remote querying of computer configuration parameters is a form of passive inventorying. Ensure you follow administrative auditing logs policies:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-zinc-500">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 space-y-1">
                <span className="text-zinc-300 font-semibold block">1. Security Auditing Logs</span>
                <p className="text-[11px]">
                  Successful or failed remote logins generate Event ID <strong className="text-zinc-400">4624</strong> or <strong className="text-zinc-400">4625</strong> (Network Logon) in the target computer's Security Log.
                </p>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 space-y-1">
                <span className="text-zinc-300 font-semibold block">2. PowerShell Auditing</span>
                <p className="text-[11px]">
                  If utilizing WinRM scripts, enable Group Policy block <strong className="text-zinc-400">PowerShell Script Block Logging</strong> (Event ID 4104) to audit full query contents.
                </p>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 space-y-1">
                <span className="text-zinc-300 font-semibold block">3. Authorized Networks Only</span>
                <p className="text-[11px]">
                  Never run remote collection procedures against networks where you do not possess express written permission or designated IT administrative control.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
