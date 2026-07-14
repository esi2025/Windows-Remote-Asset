import React from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Computer } from "../types";
import { Server, Cpu, HardDrive, ShieldCheck, AlertOctagon, PowerOff, Download, Monitor } from "lucide-react";

interface NetworkDashboardProps {
  computers: Computer[];
}

export default function NetworkDashboard({ computers }: NetworkDashboardProps) {
  // Compute statuses
  const total = computers.length;
  const successful = computers.filter((c) => c.status === "success").length;
  const failed = computers.filter((c) => c.status === "failed").length;
  const offline = computers.filter((c) => c.status === "offline").length;
  const scanning = computers.filter((c) =>
    ["pinging", "connecting", "authenticating", "collecting"].includes(c.status)
  ).length;
  const idle = computers.filter((c) => c.status === "idle").length;

  // Export current hardware inventory to CSV
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
    link.setAttribute("download", `dashboard_inventory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status data for Pie Chart
  const statusData = [
    { name: "Collected", value: successful, color: "#10B981" }, // emerald
    { name: "Access Denied", value: failed, color: "#EF4444" }, // red
    { name: "Offline / Timeout", value: offline, color: "#F59E0B" }, // amber
    { name: "Active Scan", value: scanning, color: "#3B82F6" }, // blue
    { name: "Pending", value: idle, color: "#6B7280" }, // gray
  ].filter((item) => item.value > 0);

  // CPU Vendor distribution
  const cpuBrands: { [key: string]: number } = {};
  computers.forEach((c) => {
    if (c.status === "success" && c.data) {
      const name = c.data.cpu.name.toLowerCase();
      const brand = name.includes("intel") ? "Intel Core/Xeon" : name.includes("amd") ? "AMD Ryzen" : "Other";
      cpuBrands[brand] = (cpuBrands[brand] || 0) + 1;
    }
  });
  const cpuData = Object.keys(cpuBrands).map((brand) => ({
    name: brand,
    count: cpuBrands[brand],
  }));

  // Manufacturer split (Motherboard)
  const manufacturers: { [key: string]: number } = {};
  computers.forEach((c) => {
    if (c.status === "success" && c.data) {
      const rawMfg = c.data.motherboard.manufacturer;
      let mfg = "Other";
      if (rawMfg.toLowerCase().includes("dell")) mfg = "Dell";
      else if (rawMfg.toLowerCase().includes("hp")) mfg = "HP";
      else if (rawMfg.toLowerCase().includes("asus")) mfg = "ASUS";
      else if (rawMfg.toLowerCase().includes("micro-star") || rawMfg.toLowerCase().includes("msi")) mfg = "MSI";
      else if (rawMfg.toLowerCase().includes("gigabyte")) mfg = "Gigabyte";
      manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
    }
  });
  const mfgData = Object.keys(manufacturers).map((mfg) => ({
    name: mfg,
    value: manufacturers[mfg],
  }));

  const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B"];

  // Operating System distribution
  const osDistribution: { [key: string]: number } = {};
  computers.forEach((c) => {
    if (c.status === "success" && c.data) {
      const os = c.data.osName || "Unknown OS";
      osDistribution[os] = (osDistribution[os] || 0) + 1;
    }
  });
  const osData = Object.keys(osDistribution).map((os) => ({
    name: os,
    value: osDistribution[os],
  }));

  const OS_COLORS = ["#0078D4", "#60A5FA", "#3B82F6", "#1D4ED8", "#8B5CF6", "#EC4899"];

  // Average free disk percentage
  let totalDiskSize = 0;
  let totalDiskFree = 0;
  computers.forEach((c) => {
    if (c.status === "success" && c.data) {
      c.data.storage.forEach((disk) => {
        totalDiskSize += disk.sizeGb;
        totalDiskFree += disk.freeGb;
      });
    }
  });

  const storageUsedGb = totalDiskSize - totalDiskFree;
  const storageData = totalDiskSize > 0 ? [
    { name: "Used Space", value: Math.round(storageUsedGb), color: "#4B5563" },
    { name: "Free Space", value: Math.round(totalDiskFree), color: "#10B981" }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Dashboard Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-xl" id="dashboard-export-header">
        <div>
          <h2 className="text-sm font-mono text-zinc-300 uppercase tracking-wider font-semibold">Analytical Intelligence Overview</h2>
          <p className="text-xs text-zinc-500 font-sans mt-0.5">Visual representation of telemetry and assets gathered from domain workstation scans.</p>
        </div>
        {successful > 0 && (
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 text-xs font-mono transition-all font-semibold shadow-md shadow-emerald-950/20 cursor-pointer"
            id="dashboard-export-btn"
          >
            <Download className="w-4 h-4" /> Export Inventory (CSV)
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="overview-metrics">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between" id="metric-total">
          <div>
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">Total Machines</span>
            <span className="text-3xl font-sans font-bold text-white mt-1 block">{total}</span>
          </div>
          <div className="p-3 bg-zinc-800 rounded-lg text-zinc-300">
            <Server className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between" id="metric-success">
          <div>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block">Collected Success</span>
            <span className="text-3xl font-sans font-bold text-emerald-500 mt-1 block">{successful}</span>
          </div>
          <div className="p-3 bg-emerald-950/40 rounded-lg text-emerald-400 border border-emerald-900/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between" id="metric-failed">
          <div>
            <span className="text-xs font-mono text-red-400 uppercase tracking-wider block">Access Denied</span>
            <span className="text-3xl font-sans font-bold text-red-500 mt-1 block">{failed}</span>
          </div>
          <div className="p-3 bg-red-950/40 rounded-lg text-red-400 border border-red-900/30">
            <AlertOctagon className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between" id="metric-offline">
          <div>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">Offline / Timeouts</span>
            <span className="text-3xl font-sans font-bold text-amber-500 mt-1 block">{offline}</span>
          </div>
          <div className="p-3 bg-amber-950/40 rounded-lg text-amber-400 border border-amber-900/30">
            <PowerOff className="h-6 w-6" />
          </div>
        </div>
      </div>

      {successful === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-400 font-sans">No data collected yet. Go to the <span className="text-white font-semibold">Collector Panel</span>, specify hostnames, and initiate remote scanning to populate charts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown Pie */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" id="chart-status">
            <h3 className="text-sm font-mono text-zinc-300 mb-4 border-b border-zinc-800 pb-2">Remote Collection Status Split</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181B", borderColor: "#27272A", borderRadius: "8px" }}
                    itemStyle={{ color: "#FFF" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Motherboard Manufacturer Split */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" id="chart-mfg">
            <h3 className="text-sm font-mono text-zinc-300 mb-4 border-b border-zinc-800 pb-2">Manufacturer Brand Profile</h3>
            <div className="h-64 flex items-center justify-center">
              {mfgData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mfgData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {mfgData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181B", borderColor: "#27272A", borderRadius: "8px" }}
                      itemStyle={{ color: "#FFF" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-zinc-500 text-xs">Awaiting data...</p>
              )}
            </div>
          </div>

          {/* CPU Type Split */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" id="chart-cpu">
            <h3 className="text-sm font-mono text-zinc-300 mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-zinc-400" /> CPU Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cpuData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#71717A" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181B", borderColor: "#27272A", borderRadius: "8px" }}
                    itemStyle={{ color: "#FFF" }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total Storage Usage */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" id="chart-storage">
            <h3 className="text-sm font-mono text-zinc-300 mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-zinc-400" /> Network Storage Pool
            </h3>
            <div className="h-64 flex items-center justify-center">
              <div className="w-full flex flex-col items-center">
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={storageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {storageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181B", borderColor: "#27272A", borderRadius: "8px" }}
                        itemStyle={{ color: "#FFF" }}
                        formatter={(value) => `${value} GB`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-6 mt-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#4B5563]" />
                    <span className="text-zinc-300">Used: {Math.round(storageUsedGb)} GB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span className="text-zinc-300">Free: {Math.round(totalDiskFree)} GB</span>
                  </div>
                </div>
                <div className="text-center mt-3">
                  <span className="text-xs text-zinc-400 block">Total Pool Capacity</span>
                  <span className="text-xl font-bold text-white block">{Math.round(totalDiskSize)} GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operating System Distribution */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" id="chart-os">
            <h3 className="text-sm font-mono text-zinc-300 mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-zinc-400" /> Operating System Distribution
            </h3>
            <div className="h-64 flex items-center justify-center">
              {osData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={osData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#0078D4"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {osData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={OS_COLORS[index % OS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181B", borderColor: "#27272A", borderRadius: "8px" }}
                      itemStyle={{ color: "#FFF" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-zinc-500 text-xs font-mono">Awaiting operating system telemetry...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
