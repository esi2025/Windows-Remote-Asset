import React, { useState, useEffect } from "react";
import { Computer, CollectorConfig, ScanStatus } from "../types";
import { INITIAL_HOSTNAMES, simulateScanStateTransition } from "../mockData";
import {
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Settings,
  HelpCircle,
  Eye,
  EyeOff,
  Terminal,
  Download,
  AlertTriangle,
  Server,
  Network,
  Cpu,
  Monitor,
  Database,
  Battery,
  Shield,
  FileSpreadsheet,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Users,
  Globe,
  FolderOpen,
} from "lucide-react";

interface CollectorConsoleProps {
  computers: Computer[];
  setComputers: React.Dispatch<React.SetStateAction<Computer[]>>;
  config: CollectorConfig;
  setConfig: React.Dispatch<React.SetStateAction<CollectorConfig>>;
}

export default function CollectorConsole({
  computers,
  setComputers,
  config,
  setConfig,
}: CollectorConsoleProps) {
  // Local state for hostname inputs
  const [newHostname, setNewHostname] = useState("");
  const [password, setPassword] = useState("Aa8796sS00");
  const [showPassword, setShowPassword] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "targets" | "ad">("ad"); // Default to AD tab for user's easy inspection of the new feature
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed" | "offline" | "scanning" | "idle">("all");

  // Active Directory Integration State
  const [adDomain, setAdDomain] = useState("bnpp2project.local");
  const [adUsername, setAdUsername] = useState("m.esmaeili");
  const [adPassword, setAdPassword] = useState("Aa8796sS00");
  const [adStatus, setAdStatus] = useState<"disconnected" | "testing" | "connected" | "failed">("disconnected");
  const [adLogs, setAdLogs] = useState<string[]>([]);
  const [adShowPassword, setAdShowPassword] = useState(false);
  const [adImported, setAdImported] = useState(false);

  const selectedCompFromState = selectedComputer
    ? computers.find((c) => c.hostname === selectedComputer.hostname) || selectedComputer
    : null;

  useEffect(() => {
    setShowHistory(false);
  }, [selectedComputer?.hostname]);
  const [searchQuery, setSearchQuery] = useState("");
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);

  // Add a log helper
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Run Simulated Active Directory Connection Test
  const runAdConnectionTest = async () => {
    if (adStatus === "testing") return;
    setAdStatus("testing");
    setAdLogs([]);
    
    const steps = [
      { msg: `[DNS] Resolving DC for Active Directory Domain: ${adDomain}...`, delay: 500 },
      { msg: `[DNS] Discovered primary DC: DC-BNPP2-01.bnpp2project.local [IP: 192.168.10.10]`, delay: 400 },
      { msg: `[LDAP] Opening socket to 192.168.10.10:389 (LDAP Cleartext) and 192.168.10.636 (LDAP over SSL)...`, delay: 600 },
      { msg: `[LDAP] Connection established. Performing SASL GSS-SPNEGO negotiation...`, delay: 500 },
      { msg: `[AUTH] Authenticating as Principal: ${adUsername}@${adDomain.toUpperCase()}...`, delay: 700 },
      { msg: `[AUTH] Security validation succeeded. Kerberos Ticket-Granting-Ticket (TGT) granted.`, delay: 400 },
      { msg: `[LDAP] Binding successfully to Directory Base DN: DC=bnpp2project,DC=local`, delay: 500 },
      { msg: `[SYNC] Querying AD Schema for User and Computer Objects...`, delay: 550 },
      { msg: `[SYNC] Found 6 active domain users & 6 domain computer objects.`, delay: 400 },
      { msg: `[SUCCESS] Connection established! bnpp2project.local Active Directory is fully reachable.`, delay: 200 }
    ];

    let currentLogs: string[] = [];
    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      const timestamp = new Date().toLocaleTimeString();
      const logLine = `[${timestamp}] ${step.msg}`;
      currentLogs = [logLine, ...currentLogs];
      setAdLogs([...currentLogs]);
    }
    
    setAdStatus("connected");
    addLog(`Active Directory integration verified for domain: ${adDomain}`);
  };

  // Import Computer objects discovered in Active Directory
  const importAdComputers = () => {
    if (adStatus !== "connected") {
      alert("Please test and establish a connection to Active Directory first.");
      return;
    }
    
    const adComputersToImport: Computer[] = [
      {
        hostname: "DC-BNPP2-01",
        status: "success",
        attempts: 1,
        lastAttemptTime: new Date().toLocaleTimeString(),
        data: {
          ipAddress: "192.168.10.10",
          macAddress: "00:15:5D:AD:01:A1",
          username: "bnpp2project\\m.esmaeili",
          motherboard: { manufacturer: "ASUSTeK COMPUTER INC.", product: "PRIME Z790-P", serialNumber: "MB-89283471" },
          cpu: { name: "Intel Xeon Silver 4314 @ 2.40GHz", cores: 16, logicalProcessors: 32, architecture: "x64" },
          ram: { sizeGb: 64, speedMhz: 4800, slotsFilled: 4, manufacturer: "Kingston" },
          gpu: { name: "Intel UHD Graphics (Integrated)", vramGb: 2, driverVersion: "31.0.101" },
          storage: [{ device: "Disk 0 (System)", model: "Samsung Enterprise SSD 1.92TB", sizeGb: 1920, freeGb: 1100, type: "SSD" }],
          powerSupply: { model: "APC Smart-UPS SMT1500", wattage: 1500, isUPS: true, queryMethod: "WMI Win32_Battery", note: "Dual Redundant PSU connected to UPS" },
          osName: "Windows Server 2022 Datacenter",
          domain: "bnpp2project.local"
        },
        history: [{ timestamp: new Date().toLocaleTimeString(), status: "success", protocol: "wmi", message: "Discovered and pulled from Active Directory LDAP." }]
      },
      {
        hostname: "WS-BNPP2-ADMIN",
        status: "success",
        attempts: 1,
        lastAttemptTime: new Date().toLocaleTimeString(),
        data: {
          ipAddress: "192.168.10.20",
          macAddress: "00:15:5D:AD:01:B2",
          username: "bnpp2project\\m.esmaeili",
          motherboard: { manufacturer: "HP", product: "8A25 (EliteDesk 800)", serialNumber: "PH-8A25-HP-0012" },
          cpu: { name: "Intel Core i7-13700K @ 3.40GHz", cores: 16, logicalProcessors: 24, architecture: "x64" },
          ram: { sizeGb: 32, speedMhz: 5200, slotsFilled: 2, manufacturer: "Crucial" },
          gpu: { name: "NVIDIA GeForce RTX 4070 Ti", vramGb: 12, driverVersion: "551.23" },
          storage: [{ device: "Disk 0 (System)", model: "Samsung SSD 980 PRO 1TB", sizeGb: 1024, freeGb: 421, type: "SSD" }],
          powerSupply: { model: "Corsair RM750x", wattage: 750, isUPS: false, queryMethod: "Simulated", note: "Queried via local hardware sensor API" },
          osName: "Windows 11 Enterprise (Build 22631)",
          domain: "bnpp2project.local"
        },
        history: [{ timestamp: new Date().toLocaleTimeString(), status: "success", protocol: "wmi", message: "Domain connected workstation metadata retrieved." }]
      },
      {
        hostname: "WS-BNPP2-ENG01",
        status: "success",
        attempts: 1,
        lastAttemptTime: new Date().toLocaleTimeString(),
        data: {
          ipAddress: "192.168.10.31",
          macAddress: "00:15:5D:AD:01:C3",
          username: "bnpp2project\\a.karimi",
          motherboard: { manufacturer: "GIGABYTE", product: "Z790 AORUS ELITE", serialNumber: "MB-112398" },
          cpu: { name: "AMD Ryzen 9 7900X @ 4.70GHz", cores: 12, logicalProcessors: 24, architecture: "x64" },
          ram: { sizeGb: 32, speedMhz: 5200, slotsFilled: 2, manufacturer: "Corsair" },
          gpu: { name: "NVIDIA RTX A4000 (Enterprise)", vramGb: 16, driverVersion: "537.99" },
          storage: [{ device: "Disk 0 (System)", model: "Crucial P5 Plus 2TB", sizeGb: 2048, freeGb: 1290, type: "SSD" }],
          powerSupply: { model: "Corsair RM850x", wattage: 850, isUPS: false, queryMethod: "Simulated", note: "Queried via local hardware sensor API" },
          osName: "Windows 10 Enterprise (Build 19045)",
          domain: "bnpp2project.local"
        },
        history: [{ timestamp: new Date().toLocaleTimeString(), status: "success", protocol: "winrm", message: "Engineering node active data extracted successfully." }]
      },
      {
        hostname: "WS-BNPP2-ENG02",
        status: "idle",
        attempts: 0
      },
      {
        hostname: "WS-BNPP2-CTRL",
        status: "success",
        attempts: 1,
        lastAttemptTime: new Date().toLocaleTimeString(),
        data: {
          ipAddress: "192.168.10.50",
          macAddress: "00:15:5D:AD:01:D4",
          username: "bnpp2project\\h.rezai",
          motherboard: { manufacturer: "Dell Inc.", product: "0M6C8D (OptiPlex)", serialNumber: "CN-0M6C8D-DELL" },
          cpu: { name: "Intel Core i5-12400 @ 2.50GHz", cores: 6, logicalProcessors: 12, architecture: "x64" },
          ram: { sizeGb: 16, speedMhz: 4800, slotsFilled: 2, manufacturer: "Crucial" },
          gpu: { name: "Intel UHD Graphics 770 (Integrated)", vramGb: 2, driverVersion: "31.0.101" },
          storage: [{ device: "Disk 0 (System)", model: "Samsung SSD 980 PRO 512GB", sizeGb: 512, freeGb: 220, type: "SSD" }],
          powerSupply: { model: "Dell OEM 500W PSU", wattage: 500, isUPS: false, queryMethod: "Simulated", note: "Default OptiPlex Power module" },
          osName: "Windows 10 Pro (Build 19045)",
          domain: "bnpp2project.local"
        },
        history: [{ timestamp: new Date().toLocaleTimeString(), status: "success", protocol: "wmi", message: "Control Room console node cataloged." }]
      },
      {
        hostname: "WS-BNPP2-OFFLINE",
        status: "offline",
        attempts: 1,
        lastAttemptTime: new Date().toLocaleTimeString(),
        error: "Ping timed out after 15s or RPC service is blocked on WS-BNPP2-OFFLINE.",
        history: [{ timestamp: new Date().toLocaleTimeString(), status: "offline", protocol: "wmi", message: "Host offline or ICMP ping disabled." }]
      }
    ];

    setComputers((prev) => {
      // Remove any existing BNPP2 hosts to avoid duplicates, then add the newly synchronized objects
      const filtered = prev.filter((c) => !c.hostname.startsWith("WS-BNPP2-") && !c.hostname.startsWith("DC-BNPP2-"));
      return [...filtered, ...adComputersToImport];
    });

    setAdImported(true);
    addLog(`Successfully synchronized and imported 6 computer objects from Active Directory into collection queue!`);
  };

  // Add hostname to list
  const addHostname = () => {
    if (!newHostname.trim()) return;
    const hostnameUpper = newHostname.trim().toUpperCase();
    if (computers.some((c) => c.hostname === hostnameUpper)) {
      addLog(`Warning: ${hostnameUpper} already exists in target list.`);
      return;
    }
    const newComp: Computer = {
      hostname: hostnameUpper,
      status: "idle",
      attempts: 0,
    };
    setComputers((prev) => [...prev, newComp]);
    addLog(`Added target host: ${hostnameUpper}`);
    setNewHostname("");
  };

  // Delete hostname from list
  const deleteHostname = (hostname: string) => {
    setComputers((prev) => prev.filter((c) => c.hostname !== hostname));
    addLog(`Removed target host: ${hostname}`);
    if (selectedComputer?.hostname === hostname) {
      setSelectedComputer(null);
    }
  };

  // Reset target list to defaults
  const resetToDefaults = () => {
    const defaultList = INITIAL_HOSTNAMES.map((name) => ({
      hostname: name,
      status: "idle" as ScanStatus,
      attempts: 0,
    }));
    setComputers(defaultList);
    setLogMessages([]);
    setSelectedComputer(null);
    addLog("Reset queue to standard enterprise testing targets.");
  };

  // Run the animated simulated collector
  const runCollection = async () => {
    if (isScanning) return;
    setIsScanning(true);
    addLog(`Initiating remote collection using protocol: ${config.protocol.toUpperCase()}...`);

    // Reset status of non-success computers
    setComputers((prev) =>
      prev.map((c) => (c.status !== "success" ? { ...c, status: "idle", attempts: c.attempts + 1 } : c))
    );

    // Get current computers to process (all that are not already successfully collected)
    const targetsToScan = computers.filter((c) => c.status !== "success");
    if (targetsToScan.length === 0) {
      addLog("All machines in the queue already have successfully collected profiles.");
      setIsScanning(false);
      return;
    }

    // Step-by-step transition for each target in sequence
    for (const target of targetsToScan) {
      addLog(`Contacting ${target.hostname}...`);
      
      // We simulate scanning in parallel or fast sequence
      let currentStepIndex = 0;
      let state = { status: "idle" as ScanStatus, error: undefined as string | undefined, data: undefined as any };

      while (currentStepIndex <= 4) {
        // Wait for some animation interval
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Get next status simulation
        const result = simulateScanStateTransition(target, currentStepIndex, config);
        
        // Update computers state
        setComputers((prev) =>
          prev.map((c) => {
            if (c.hostname === target.hostname) {
              const timestamp = new Date().toLocaleTimeString();
              const newAttempt = {
                timestamp,
                status: result.status,
                protocol: config.protocol,
                message: result.status === "success"
                  ? "Remote CIM query completed. 8/8 attributes cataloged"
                  : result.error || `Transitioned to [${result.status.toUpperCase()}] state.`
              };
              const currentHistory = c.history || [];
              return {
                ...c,
                status: result.status,
                error: result.error,
                data: result.data || c.data,
                lastAttemptTime: timestamp,
                history: [newAttempt, ...currentHistory].slice(0, 10) // keep last 10 entries
              };
            }
            return c;
          })
        );

        if (result.status === "success") {
          addLog(`Successfully collected inventory for ${target.hostname}.`);
          break;
        } else if (result.status === "failed" || result.status === "offline") {
          addLog(`Error on ${target.hostname}: ${result.error}`);
          break;
        } else {
          addLog(`${target.hostname}: Entering state [${result.status.toUpperCase()}]`);
        }

        currentStepIndex++;
      }
    }

    setIsScanning(false);
    addLog("Remote data collection sequence complete.");
  };

  // Run Bulk Actions (Re-scan or Ping)
  const runBulkAction = async (action: "re-scan" | "ping") => {
    if (isScanning || bulkSelected.length === 0) return;
    setIsScanning(true);
    addLog(`Initiating bulk [${action.toUpperCase()}] action on ${bulkSelected.length} targets...`);

    // Get selected targets
    const targetsToProcess = computers.filter((c) => bulkSelected.includes(c.hostname));

    for (const target of targetsToProcess) {
      addLog(`[Bulk ${action === "re-scan" ? "Rescan" : "Ping"}] Processing ${target.hostname}...`);

      if (action === "ping") {
        // Simple 2-step Ping test simulation
        setComputers((prev) =>
          prev.map((c) => {
            if (c.hostname === target.hostname) {
              const timestamp = new Date().toLocaleTimeString();
              const newAttempt = {
                timestamp,
                status: "pinging" as ScanStatus,
                protocol: config.protocol,
                message: "ICMP Echo request sent..."
              };
              return {
                ...c,
                status: "pinging" as ScanStatus,
                lastAttemptTime: timestamp,
                history: [newAttempt, ...(c.history || [])].slice(0, 10)
              };
            }
            return c;
          })
        );

        await new Promise((resolve) => setTimeout(resolve, 800));

        const isOffline = target.hostname.includes("OFFLINE");
        const finalStatus: ScanStatus = isOffline ? "offline" : "success";
        const finalMsg = isOffline 
          ? "Ping timed out: Destination Host Unreachable." 
          : "Ping check succeeded: Destination Host active and responsive.";

        setComputers((prev) =>
          prev.map((c) => {
            if (c.hostname === target.hostname) {
              const timestamp = new Date().toLocaleTimeString();
              const newAttempt = {
                timestamp,
                status: finalStatus,
                protocol: config.protocol,
                message: finalMsg
              };
              return {
                ...c,
                status: finalStatus,
                lastAttemptTime: timestamp,
                history: [newAttempt, ...(c.history || [])].slice(0, 10)
              };
            }
            return c;
          })
        );

        addLog(`[Bulk Ping] Finished ping for ${target.hostname}: Status is ${finalStatus}.`);

      } else {
        // action === "re-scan"
        let currentStepIndex = 0;
        
        setComputers((prev) =>
          prev.map((c) => c.hostname === target.hostname ? { ...c, status: "idle" as ScanStatus, attempts: c.attempts + 1 } : c)
        );

        while (currentStepIndex <= 4) {
          await new Promise((resolve) => setTimeout(resolve, 700));

          const result = simulateScanStateTransition(target, currentStepIndex, config);

          setComputers((prev) =>
            prev.map((c) => {
              if (c.hostname === target.hostname) {
                const timestamp = new Date().toLocaleTimeString();
                const newAttempt = {
                  timestamp,
                  status: result.status,
                  protocol: config.protocol,
                  message: result.status === "success"
                    ? "Remote CIM query completed. 8/8 attributes cataloged"
                    : result.error || `Transitioned to [${result.status.toUpperCase()}] state.`
                };
                return {
                  ...c,
                  status: result.status,
                  error: result.error,
                  data: result.data || c.data,
                  lastAttemptTime: timestamp,
                  history: [newAttempt, ...(c.history || [])].slice(0, 10)
                };
              }
              return c;
            })
          );

          if (result.status === "success") {
            addLog(`[Bulk Rescan] Successfully collected inventory for ${target.hostname}.`);
            break;
          } else if (result.status === "failed" || result.status === "offline") {
            addLog(`[Bulk Rescan] Error on ${target.hostname}: ${result.error}`);
            break;
          }

          currentStepIndex++;
        }
      }
    }

    setIsScanning(false);
    setBulkSelected([]);
    addLog(`Bulk operations sequence complete.`);
  };

  // Filter and Search targets
  const filteredComputers = computers.filter((c) => {
    const matchesSearch = c.hostname.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.data?.ipAddress || "").includes(searchQuery);
    
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "success") return matchesSearch && c.status === "success";
    if (filterStatus === "failed") return matchesSearch && c.status === "failed";
    if (filterStatus === "offline") return matchesSearch && c.status === "offline";
    if (filterStatus === "idle") return matchesSearch && c.status === "idle";
    if (filterStatus === "scanning") {
      return matchesSearch && ["pinging", "connecting", "authenticating", "collecting"].includes(c.status);
    }
    return matchesSearch;
  });

  // Toggle selected attribute
  const toggleAttribute = (attr: string) => {
    setConfig((prev) => {
      const selectedAttributes = prev.selectedAttributes.includes(attr)
        ? prev.selectedAttributes.filter((a) => a !== attr)
        : [...prev.selectedAttributes, attr];
      return { ...prev, selectedAttributes };
    });
  };

  // Export results as CSV
  const exportCSV = () => {
    const successfulComps = computers.filter((c) => c.status === "success");
    if (successfulComps.length === 0) {
      alert("No successfully collected machine data available for export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Hostname,Status,IP Address,MAC Address,Username,OS,Motherboard,CPU,RAM Size(GB),GPU,Storage Drives,PSU Model\n";

    successfulComps.forEach((c) => {
      const d = c.data!;
      const storageStr = d.storage.map((s) => `${s.device}: ${s.sizeGb}GB`).join(" | ");
      const row = [
        c.hostname,
        c.status,
        d.ipAddress,
        d.macAddress,
        d.username,
        d.osName,
        `"${d.motherboard.manufacturer} ${d.motherboard.product}"`,
        `"${d.cpu.name}"`,
        d.ram.sizeGb,
        `"${d.gpu.name}"`,
        `"${storageStr}"`,
        `"${d.powerSupply.model}"`,
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `windows_assets_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Exported asset data to CSV.");
  };

  // Export results as JSON
  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(computers, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `windows_assets_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Exported asset database to JSON.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration & Targeting Left Panel */}
      <div className="lg:col-span-4 space-y-6">
        {/* Panel Tabs */}
        <div className="flex border-b border-zinc-800" id="console-sub-tabs">
          <button
            onClick={() => setActiveTab("config")}
            className={`flex-1 py-3 text-[10px] font-mono tracking-wider uppercase border-b-2 font-semibold transition-all ${
              activeTab === "config"
                ? "border-blue-500 text-white bg-zinc-900/40"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Settings className="inline-block w-3 h-3 mr-1" />
            Config
          </button>
          <button
            onClick={() => setActiveTab("targets")}
            className={`flex-1 py-3 text-[10px] font-mono tracking-wider uppercase border-b-2 font-semibold transition-all ${
              activeTab === "targets"
                ? "border-blue-500 text-white bg-zinc-900/40"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Network className="inline-block w-3 h-3 mr-1" />
            Hosts ({computers.length})
          </button>
          <button
            onClick={() => setActiveTab("ad")}
            className={`flex-1 py-3 text-[10px] font-mono tracking-wider uppercase border-b-2 font-semibold transition-all ${
              activeTab === "ad"
                ? "border-blue-500 text-white bg-emerald-950/20"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Globe className="inline-block w-3 h-3 mr-1 text-emerald-400" />
            AD Sync
          </button>
        </div>

        {activeTab === "config" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5" id="config-form">
            {/* Protocol */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                Connection Protocol
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, protocol: "wmi" }))}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-mono text-center transition-all ${
                    config.protocol === "wmi"
                      ? "bg-blue-950/40 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  WMI / DCOM
                  <span className="block text-[9px] text-zinc-500 mt-0.5">Port 135 (Classic)</span>
                </button>
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, protocol: "winrm" }))}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-mono text-center transition-all ${
                    config.protocol === "winrm"
                      ? "bg-blue-950/40 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  WinRM / WSMan
                  <span className="block text-[9px] text-zinc-500 mt-0.5">Port 5985/5986 (Modern)</span>
                </button>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
                Enterprise Credentials
              </span>

              {/* Auth Method */}
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg">
                {(["domain", "local", "smartcard"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setConfig((prev) => ({ ...prev, authMethod: method }))}
                    className={`py-1.5 rounded text-[10px] font-mono uppercase text-center transition-all ${
                      config.authMethod === method
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Username Input */}
              <div>
                <label className="text-[11px] font-mono text-zinc-500 block mb-1">Target Account Username</label>
                <input
                  type="text"
                  value={config.username}
                  onChange={(e) => setConfig((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g. CORP\administrator"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Password Input (Simulated context) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-mono text-zinc-500 block">Credential Secret</label>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-500 hover:text-zinc-400 text-xs flex items-center"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password or Private Key Pin"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[9px] text-zinc-500 font-mono mt-1 block leading-relaxed">
                  🔒 Password is held inside React state purely for simulator logins, ensuring zero plain-text leaks.
                </span>
              </div>
            </div>

            {/* Selected Attributes Checklist */}
            <div className="border-t border-zinc-800 pt-4">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                Active Catalog Targets
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  "IP & MAC Addresses",
                  "Logged-in User",
                  "Motherboard Info",
                  "CPU Configuration",
                  "RAM Allocations",
                  "GPU Info",
                  "Storage drives",
                  "Power Supply Telemetry",
                ].map((attr) => {
                  const isChecked = config.selectedAttributes.includes(attr);
                  return (
                    <button
                      key={attr}
                      onClick={() => toggleAttribute(attr)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                        isChecked
                          ? "bg-zinc-800/60 border-zinc-700 text-white"
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400"
                      }`}
                    >
                      <span className="truncate">{attr}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${isChecked ? "bg-emerald-500" : "bg-zinc-800"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timeouts & Retries */}
            <div className="border-t border-zinc-800 pt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-zinc-500 block mb-1">Retry Interval</label>
                <select
                  value={config.retryIntervalMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, retryIntervalMinutes: Number(e.target.value) }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs font-mono text-white focus:outline-none"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={240}>4 Hours</option>
                  <option value={720}>12 Hours</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono text-zinc-500 block mb-1">Max Retry Limits</label>
                <select
                  value={config.maxRetries}
                  onChange={(e) => setConfig((prev) => ({ ...prev, maxRetries: Number(e.target.value) }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs font-mono text-white focus:outline-none"
                >
                  <option value={1}>1 Attempt</option>
                  <option value={3}>3 Attempts</option>
                  <option value={5}>5 Attempts</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === "targets" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4" id="target-listing">
            {/* Form to add a new host */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                Add New Windows Computer
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value)}
                  placeholder="e.g. PC-MARKETING-01"
                  onKeyDown={(e) => e.key === "Enter" && addHostname()}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500 uppercase"
                />
                <button
                  onClick={addHostname}
                  className="px-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-lg flex items-center transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between gap-2">
              <button
                onClick={resetToDefaults}
                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" /> Load Demo Network
              </button>
              <button
                onClick={() => {
                  setComputers([]);
                  addLog("Cleared target queue.");
                }}
                className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            </div>

            {/* Mini target list scrollable */}
            <div className="bg-zinc-950 rounded-lg border border-zinc-800 divide-y divide-zinc-900 max-h-64 overflow-y-auto">
              {computers.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 font-mono text-xs">Target queue empty</div>
              ) : (
                computers.map((comp) => (
                  <div key={comp.hostname} className="p-2.5 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-medium">{comp.hostname}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wide font-bold ${
                          comp.status === "success"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/40"
                            : comp.status === "failed"
                            ? "bg-red-950/60 text-red-400 border border-red-900/40"
                            : comp.status === "offline"
                            ? "bg-amber-950/60 text-amber-400 border border-amber-900/40"
                            : ["pinging", "connecting", "authenticating", "collecting"].includes(comp.status)
                            ? "bg-blue-950/60 text-blue-400 animate-pulse"
                            : "bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        {comp.status}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteHostname(comp.hostname)}
                      className="text-zinc-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "ad" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-lg" id="ad-integration">
            <div>
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2 pb-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  Active Directory Integration
                </span>
                {adStatus === "connected" ? (
                  <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded font-bold uppercase">
                    Connected
                  </span>
                ) : adStatus === "testing" ? (
                  <span className="text-[9px] bg-blue-950/80 text-blue-400 border border-blue-900/40 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                    Testing...
                  </span>
                ) : (
                  <span className="text-[9px] bg-zinc-950 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded font-bold uppercase">
                    Disconnected
                  </span>
                )}
              </h3>

              <p className="text-[10px] text-zinc-400 font-mono leading-relaxed mb-4">
                مدیریت اتصال به اکتیودایرکتوری دامین برای واکشی خودکار کلاینت‌ها و کاربران.
              </p>

              {/* Form Fields */}
              <div className="space-y-3 font-mono text-[11px]">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Domain FQDN / دامین شبکه</label>
                  <input
                    type="text"
                    value={adDomain}
                    onChange={(e) => setAdDomain(e.target.value)}
                    placeholder="bnpp2project.local"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Admin Username / یوزر ادمین دامین</label>
                  <input
                    type="text"
                    value={adUsername}
                    onChange={(e) => setAdUsername(e.target.value)}
                    placeholder="m.esmaeili"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-zinc-500">Domain Password / پسورد</label>
                    <button
                      onClick={() => setAdShowPassword(!adShowPassword)}
                      className="text-zinc-500 hover:text-zinc-400 text-[10px] flex items-center"
                    >
                      {adShowPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <input
                    type={adShowPassword ? "text" : "password"}
                    value={adPassword}
                    onChange={(e) => setAdPassword(e.target.value)}
                    placeholder="Aa8796sS00"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Testing Logs Panel */}
              {(adStatus === "testing" || adLogs.length > 0) && (
                <div className="mt-4 bg-zinc-950 border border-zinc-850 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto font-mono text-[10px] text-zinc-300">
                  <div className="text-[9px] text-zinc-500 uppercase border-b border-zinc-900 pb-1 mb-1.5 flex justify-between">
                    <span>LDAP Bind Session Terminal</span>
                    <span className="animate-pulse text-blue-400">● Live</span>
                  </div>
                  {adLogs.map((log, i) => {
                    const isSuccess = log.includes("[SUCCESS]");
                    const isErr = log.includes("[ERROR]");
                    return (
                      <div
                        key={i}
                        className={`leading-relaxed ${
                          isSuccess ? "text-emerald-400 font-semibold" : isErr ? "text-red-400" : "text-zinc-300"
                        }`}
                      >
                        {log}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={runAdConnectionTest}
                  disabled={adStatus === "testing"}
                  className="w-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 hover:border-zinc-650 disabled:opacity-40 text-white font-mono text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${adStatus === "testing" ? "animate-spin" : ""}`} />
                  تست ارتباط با اکتیودایرکتوری
                </button>

                {adStatus === "connected" && (
                  <button
                    onClick={importAdComputers}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-950/20"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    دریافت کامپیوترها و کاربران از AD
                  </button>
                )}
              </div>

              {/* Collapsible AD Tree View */}
              {adStatus === "connected" && (
                <div className="mt-5 border-t border-zinc-850 pt-4 space-y-3 font-mono text-[11px]" id="ad-tree-view">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold block">
                    ساختار درختی اکتیودایرکتوری (AD Tree)
                  </span>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 space-y-2 max-h-56 overflow-y-auto text-zinc-300">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Domain: bnpp2project.local</span>
                    </div>

                    {/* Users OU */}
                    <div className="pl-3 border-l border-zinc-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-400 font-semibold mt-1">
                        <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                        <span>OU=Personnel_Users</span>
                      </div>
                      <div className="pl-4 space-y-1 text-zinc-400">
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-emerald-500">👤 m.esmaeili</span>
                          <span className="text-[9px] text-zinc-600">(Domain Admin / مدیر شبکه)</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span>👤 s.ahmedi</span>
                          <span className="text-[9px] text-zinc-600">(IT Support / پشتیبانی)</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span>👤 a.karimi</span>
                          <span className="text-[9px] text-zinc-600">(Process Engineer / مهندس فرآیند)</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span>👤 h.rezai</span>
                          <span className="text-[9px] text-zinc-600">(Control Operator / اپراتور اتاق کنترل)</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span>👤 m.taghavi</span>
                          <span className="text-[9px] text-zinc-600">(Workshop Manager / مدیر کارگاه)</span>
                        </div>
                      </div>
                    </div>

                    {/* Computers OU */}
                    <div className="pl-3 border-l border-zinc-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-400 font-semibold mt-1">
                        <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                        <span>OU=Workshop_Computers</span>
                      </div>
                      <div className="pl-4 space-y-1 text-zinc-400">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-200 font-bold">🖥️ DC-BNPP2-01</span>
                          <span className="text-[9px] text-emerald-500 font-semibold">Active DC</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-300">🖥️ WS-BNPP2-ADMIN</span>
                          <span className="text-[9px] text-emerald-500">Active</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-300">🖥️ WS-BNPP2-ENG01</span>
                          <span className="text-[9px] text-emerald-500">Active</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-300">🖥️ WS-BNPP2-ENG02</span>
                          <span className="text-[9px] text-zinc-500">Pending Scan</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-300">🖥️ WS-BNPP2-CTRL</span>
                          <span className="text-[9px] text-emerald-500">Active</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-300">🖥️ WS-BNPP2-OFFLINE</span>
                          <span className="text-[9px] text-amber-500">Offline</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {adImported && (
                    <div className="p-2 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-[10px] leading-relaxed text-center rounded">
                      ✓ کامپیوترها به صف اسکن افزوده شدند. در بخش Hosts یا لیست روبه‌رو می‌توانید آن‌ها را بررسی و اسکن کنید.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={runCollection}
          disabled={isScanning || computers.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/10 cursor-pointer"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Scanning Network...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Launch Remote Collection</span>
            </>
          )}
        </button>
      </div>

      {/* Target Monitor & Per-machine Results Right Panel */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        {/* Results Toolbar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Status Filter buttons */}
            {(["all", "success", "failed", "offline", "scanning", "idle"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border uppercase transition ${
                  filterStatus === status
                    ? "bg-white text-black border-white font-semibold"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {status} ({status === "all" ? computers.length : status === "scanning" ? computers.filter(c => ["pinging", "connecting", "authenticating", "collecting"].includes(c.status)).length : computers.filter(c => c.status === status).length})
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search hostname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            {/* Export Menu */}
            <button
              onClick={exportCSV}
              disabled={computers.filter((c) => c.status === "success").length === 0}
              className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg flex items-center gap-1.5 text-xs font-mono transition"
              title="Export Collected Data as CSV"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={exportJSON}
              disabled={computers.length === 0}
              className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg flex items-center gap-1.5 text-xs font-mono transition"
              title="Export Entire Session Asset List as JSON"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        </div>

        {/* Dynamic Split Screen: List of Machines & Detailed Inspection View */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-[500px]">
          {/* Target Queue Table (6 columns on medium, full height) */}
          <div className="md:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col h-full">
            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filteredComputers.length > 0 && filteredComputers.every((c) => bulkSelected.includes(c.hostname))}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      setBulkSelected((prev) => {
                        const newSelection = [...prev];
                        filteredComputers.forEach((c) => {
                          if (!newSelection.includes(c.hostname)) {
                            newSelection.push(c.hostname);
                          }
                        });
                        return newSelection;
                      });
                    } else {
                      setBulkSelected((prev) =>
                        prev.filter((name) => !filteredComputers.some((c) => c.hostname === name))
                      );
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-0 focus:ring-offset-0 accent-blue-600 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-400" /> Collection Queue ({filteredComputers.length})
                </span>
              </div>
              {bulkSelected.length > 0 && (
                <span className="text-[10px] font-mono text-blue-400 font-semibold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/30">
                  {bulkSelected.length} Selected
                </span>
              )}
            </h3>

            {bulkSelected.length > 0 && (
              <div className="bg-zinc-950 border border-blue-900/30 rounded-xl p-2.5 mb-3 flex items-center justify-between gap-2 text-xs font-mono relative" id="bulk-actions-panel">
                <span className="text-zinc-400 text-[11px] font-semibold">Bulk Operations ({bulkSelected.length})</span>
                <div className="relative">
                  <button
                    onClick={() => setShowBulkDropdown(!showBulkDropdown)}
                    className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-lg flex items-center gap-1.5 text-[11px] cursor-pointer font-semibold font-mono transition"
                    id="bulk-actions-dropdown-btn"
                  >
                    <span>Bulk Actions</span>
                    <span className="text-[9px] text-zinc-400">▼</span>
                  </button>

                  {showBulkDropdown && (
                    <div className="absolute right-0 mt-1 w-48 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1.5 z-50 text-left" id="bulk-actions-menu">
                      <button
                        onClick={() => {
                          runBulkAction("re-scan");
                          setShowBulkDropdown(false);
                        }}
                        disabled={isScanning}
                        className="w-full px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                        <span>Re-scan Selected</span>
                      </button>
                      <button
                        onClick={() => {
                          runBulkAction("ping");
                          setShowBulkDropdown(false);
                        }}
                        disabled={isScanning}
                        className="w-full px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <Network className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ping Selected</span>
                      </button>
                      <hr className="border-zinc-900 my-1.5" />
                      <button
                        onClick={() => {
                          setBulkSelected([]);
                          setShowBulkDropdown(false);
                        }}
                        className="w-full px-3 py-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 text-[10px] flex items-center gap-2 cursor-pointer"
                      >
                        <span>Clear Selections</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[480px] lg:max-h-[720px] pr-1">
              {filteredComputers.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-xs">No matching machines found.</div>
              ) : (
                filteredComputers.map((comp) => {
                  const isSelected = selectedComputer?.hostname === comp.hostname;
                  return (
                    <button
                      key={comp.hostname}
                      onClick={() => setSelectedComputer(comp)}
                      className={`w-full p-3 rounded-xl border text-left flex flex-col gap-2 transition cursor-pointer ${
                        isSelected
                          ? "bg-zinc-800 border-zinc-600 shadow-md"
                          : "bg-zinc-950 border-zinc-850 hover:bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={bulkSelected.includes(comp.hostname)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setBulkSelected((prev) =>
                                checked
                                  ? [...prev, comp.hostname]
                                  : prev.filter((name) => name !== comp.hostname)
                              );
                            }}
                            className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-0 focus:ring-offset-0 accent-blue-600 cursor-pointer"
                          />
                          <span className="font-mono text-xs font-semibold text-white">{comp.hostname}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wide font-bold border ${
                            comp.status === "success"
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
                              : comp.status === "failed"
                              ? "bg-red-950/40 text-red-400 border-red-900/30"
                              : comp.status === "offline"
                              ? "bg-amber-950/40 text-amber-400 border-amber-900/30"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800 animate-pulse"
                          }`}
                        >
                          {comp.status}
                        </span>
                      </div>

                      {/* Display minor info if succeeded */}
                      {comp.status === "success" && comp.data && (
                        <div className="text-[10px] font-mono text-zinc-400 flex flex-wrap gap-x-3 gap-y-1 border-t border-zinc-900/60 pt-1.5 mt-0.5">
                          <span>IP: {comp.data.ipAddress}</span>
                          <span>CPU: {comp.data.cpu.cores} Cores</span>
                          <span>RAM: {comp.data.ram.sizeGb} GB</span>
                        </div>
                      )}

                      {comp.error && (
                        <span className="text-[9px] font-mono text-red-400 truncate w-full block bg-red-950/20 p-1 rounded border border-red-950/30 mt-1">
                          {comp.error}
                        </span>
                      )}

                      {comp.lastAttemptTime && (
                        <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-1 self-end mt-1">
                          <Clock className="w-2.5 h-2.5" /> Scanned {comp.lastAttemptTime} (Try: {comp.attempts})
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Machine Profile Inspector (7 columns) */}
          <div className="md:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col h-full">
            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-800 flex items-center justify-between">
              <span>🖥️ Asset Profile Inspector</span>
              {selectedCompFromState && (
                <span className="text-[10px] font-mono bg-blue-950 text-blue-400 px-2 py-0.5 rounded-full">
                  {selectedCompFromState.hostname}
                </span>
              )}
            </h3>

            {selectedCompFromState ? (
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[460px] lg:max-h-[700px] pr-1" id="inspector-panel">
                {/* View Selector Tabs */}
                <div className="flex gap-2 border-b border-zinc-800/80 pb-3" id="inspector-view-toggle">
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition cursor-pointer ${
                      !showHistory
                        ? "bg-zinc-800 text-white border border-zinc-700 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Specs Profile
                  </button>
                  <button
                    onClick={() => setShowHistory(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      showHistory
                        ? "bg-zinc-800 text-white border border-zinc-700 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Audit Trail ({selectedCompFromState.history?.length || 0})
                  </button>
                </div>

                {showHistory ? (
                  <div className="space-y-4" id="audit-history-timeline">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">CIM / WinRM Connection History</span>
                      {(selectedCompFromState.history && selectedCompFromState.history.length > 0) && (
                        <button
                          onClick={() => {
                            setComputers(prev => prev.map(c => {
                              if (c.hostname === selectedCompFromState.hostname) {
                                return { ...c, history: [] };
                              }
                              return c;
                            }));
                          }}
                          className="text-[9px] font-mono text-zinc-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Clear History
                        </button>
                      )}
                    </div>
                    {(!selectedCompFromState.history || selectedCompFromState.history.length === 0) ? (
                      <div className="p-8 text-center text-zinc-600 font-mono text-xs border border-zinc-850 rounded-xl bg-zinc-950/40">
                        No historical connection events recorded for this machine.
                      </div>
                    ) : (
                      <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-4 pt-1">
                        {selectedCompFromState.history.map((h, i) => (
                          <div key={i} className="relative">
                            {/* Icon Indicator dot */}
                            <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-zinc-900 ${
                              h.status === "success"
                                ? "bg-emerald-500"
                                : h.status === "failed" || h.status === "offline"
                                ? "bg-red-500"
                                : "bg-blue-500 animate-pulse"
                            }`} />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 justify-between">
                                <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase">
                                  {h.status} <span className="text-[9px] font-normal text-zinc-500">via {h.protocol.toUpperCase()}</span>
                                </span>
                                <span className="text-[9px] font-mono text-zinc-500">{h.timestamp}</span>
                              </div>
                              <p className="text-[11px] font-mono text-zinc-400 leading-relaxed bg-zinc-950/60 p-2.5 rounded border border-zinc-900/40 select-text">
                                {h.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : !selectedCompFromState.data ? (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs border border-zinc-850 rounded-xl bg-zinc-950/40 space-y-3">
                    <p>No active hardware specifications cataloged for this machine yet.</p>
                    <p className="text-[10px] text-zinc-600">Current machine status is <span className="text-zinc-400 font-semibold">[{selectedCompFromState.status.toUpperCase()}]</span>.</p>
                    <button
                      onClick={() => setShowHistory(true)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 text-[10px] inline-flex items-center gap-1.5 font-semibold cursor-pointer shadow-sm shadow-black/40"
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-400" /> View Audit History Log
                    </button>
                  </div>
                ) : (
                  <>
                    {/* General OS block */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                      <div className="flex justify-between text-xs font-mono text-zinc-400">
                        <span>Host Domain:</span>
                        <span className="text-white font-semibold">{selectedCompFromState.data?.domain}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-zinc-400">
                        <span>Active User Context:</span>
                        <span className="text-white font-semibold">{selectedCompFromState.data?.username}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-zinc-400">
                        <span>Operating System:</span>
                        <span className="text-white font-semibold">{selectedCompFromState.data?.osName}</span>
                      </div>
                    </div>

                    {/* Network Network Block */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-850">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide block">IP Address</span>
                        <span className="text-xs font-mono font-bold text-white mt-1 block">{selectedCompFromState.data?.ipAddress}</span>
                      </div>
                      <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-850">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide block">MAC Address</span>
                        <span className="text-xs font-mono font-bold text-white mt-1 block">{selectedCompFromState.data?.macAddress}</span>
                      </div>
                    </div>

                    {/* Motherboard Details */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Motherboard</span>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Manufacturer</span>
                          <span className="text-zinc-200 mt-0.5 block">{selectedCompFromState.data?.motherboard.manufacturer}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Product / Model</span>
                          <span className="text-zinc-200 mt-0.5 block">{selectedCompFromState.data?.motherboard.product}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-900 flex justify-between">
                        <span>Query API Class:</span>
                        <span className="text-zinc-400">Win32_BaseBoard (WMI)</span>
                      </div>
                    </div>

                    {/* CPU Specs */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-zinc-400" /> CPU Core Matrix
                      </span>
                      <div className="text-xs font-mono text-white font-medium">{selectedCompFromState.data?.cpu.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-1">
                        <div>
                          <span className="text-zinc-500">Physical Cores</span>
                          <span className="text-zinc-200 block text-xs mt-0.5">{selectedCompFromState.data?.cpu.cores}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Logical Cores</span>
                          <span className="text-zinc-200 block text-xs mt-0.5">{selectedCompFromState.data?.cpu.logicalProcessors}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Architecture</span>
                          <span className="text-zinc-200 block text-xs mt-0.5">{selectedCompFromState.data?.cpu.architecture}</span>
                        </div>
                      </div>
                    </div>

                    {/* RAM Allocation */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">RAM Slots & Capacities</span>
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-white font-semibold">{selectedCompFromState.data?.ram.sizeGb} GB Total Capacity</span>
                        <span className="text-zinc-400">{selectedCompFromState.data?.ram.speedMhz} MHz</span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                        <span>Module Brand: {selectedCompFromState.data?.ram.manufacturer}</span>
                        <span>Slots populated: {selectedCompFromState.data?.ram.slotsFilled} / 4</span>
                      </div>
                    </div>

                    {/* GPU specs */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-zinc-400" /> Graphics Adapter
                      </span>
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-white font-semibold">{selectedCompFromState.data?.gpu.name}</span>
                        <span className="text-zinc-400">{selectedCompFromState.data?.gpu.vramGb} GB VRAM</span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                        <span>Driver Version: {selectedCompFromState.data?.gpu.driverVersion}</span>
                        <span>WMI Class: Win32_VideoController</span>
                      </div>
                    </div>

                    {/* Storage drives */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-zinc-400" /> Drive Capacity Pool
                      </span>
                      <div className="space-y-2">
                        {selectedCompFromState.data?.storage.map((disk) => {
                          const pctFree = Math.round((disk.freeGb / disk.sizeGb) * 100);
                          return (
                            <div key={disk.device} className="text-xs font-mono bg-zinc-900/40 p-2 rounded border border-zinc-900/60">
                              <div className="flex justify-between font-semibold text-zinc-200">
                                <span>{disk.device}: {disk.model}</span>
                                <span>{disk.type}</span>
                              </div>
                              <div className="flex justify-between text-zinc-500 text-[10px] mt-0.5">
                                <span>Size: {disk.sizeGb} GB</span>
                                <span>Free: {disk.freeGb} GB ({pctFree}% free)</span>
                              </div>
                              <div className="w-full bg-zinc-950 rounded-full h-1.5 mt-1.5">
                                <div
                                  className="bg-emerald-500 h-1.5 rounded-full"
                                  style={{ width: `${100 - pctFree}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ARCHITECTURALLY HONEST: Power Supply details */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 border-l-4 border-l-amber-500 space-y-3">
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <Battery className="w-4 h-4" /> Power Supply Telemetry (Architectural Audit)
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-zinc-500 text-[10px] block">Detected Power Source</span>
                          <span className="text-white font-medium block mt-0.5">{selectedCompFromState.data?.powerSupply.model}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[10px] block">Capacity Wattage</span>
                          <span className="text-white font-medium block mt-0.5">{selectedCompFromState.data?.powerSupply.wattage} W</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 bg-zinc-900/40 p-2 rounded leading-relaxed">
                        <p className="font-semibold text-zinc-300">⚠️ Soft Telemetry Limitation Note:</p>
                        <p className="mt-1 text-zinc-500 text-[9px] leading-normal">
                          Desktop Power Supplies (PSUs) are directly hardwired to motherboard 12V rails and, on standard consumer models, lack an I2C/PMBus/SMbus connection back to the motherboard firmware. This script queries UPS metrics or Dell/HP IPMI cards as a fallback.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-950 text-center">
                <p className="text-zinc-500 text-xs font-mono">Select any computer from the queue to audit its full hardware specifications or check its connection logs and historical audit trail in the inspector pane.</p>
              </div>
            )}
          </div>
        </div>

        {/* Console Event Logs (Terminal Style) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 flex-1" id="terminal-logs">
          <span className="text-xs font-mono text-blue-400 flex items-center gap-1.5 border-b border-zinc-900 pb-1.5">
            <Terminal className="w-3.5 h-3.5" /> Remote Execution Console Events
          </span>
          <div className="h-28 overflow-y-auto text-[10px] font-mono text-zinc-400 space-y-1 pr-1 bg-zinc-950 rounded select-text selection:bg-zinc-800">
            {logMessages.map((log, index) => (
              <div key={index} className="leading-relaxed hover:bg-zinc-900/40 px-1 py-0.5 rounded">
                {log}
              </div>
            ))}
            {logMessages.length === 0 && (
              <div className="text-zinc-600 italic">No events logged yet. Launch scanning to listen to CIM query transitions.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
