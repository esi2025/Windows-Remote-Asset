import React, { useState } from "react";
import { ShieldAlert, Check, Copy, Wifi, Network, Key, Terminal, Info } from "lucide-react";

export default function GPOHelper() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const winrmGpoScript = `# PowerShell Script to Enable and Configure WinRM (HTTP & HTTPS) for Remote Management
# Execute this script as Administrator on the target machines or distribute via startup GPO.

# 1. Enable WinRM QuickConfig
Write-Host "Enabling and configuring WinRM services..." -ForegroundColor Green
Enable-PSRemoting -Force -SkipNetworkProfileCheck

# 2. Configure Local Firewall rules to allow WinRM (Port 5985)
New-NetFirewallRule -Name "Allow_WinRM_HTTP" \`
    -DisplayName "Windows Remote Management (HTTP-In)" \`
    -Description "Allow Remote Administration via WS-Management" \`
    -Direction Inbound \`
    -Action Allow \`
    -Protocol TCP \`
    -LocalPort 5985 \`
    -Enabled True

# 3. Restrict WinRM to trusted Subnets (Highly Recommended)
# Set-NetFirewallRule -Name "Allow_WinRM_HTTP" -RemoteAddress "10.142.4.0/24"

# 4. Set WinRM startup type to automatic
Set-Service -Name "WinRM" -StartupType Automatic
Start-Service -Name "WinRM" -ErrorAction SilentlyContinue

Write-Host "WinRM setup completed successfully." -ForegroundColor Green`;

  const dcomWmiGpoScript = `# PowerShell Script to Enable Classic WMI & DCOM firewall exceptions
# Run this on target Windows servers/desktops to enable remote CIM scans.

Write-Host "Configuring WMI & DCOM firewall protocols..." -ForegroundColor Green

# Enable WMI Inbound Firewall Rules
Enable-NetFirewallRule -DisplayGroup "Windows Management Instrumentation (WMI)"

# Allow Remote Administration
Enable-NetFirewallRule -DisplayGroup "Remote Administration"

# Allow Ping (ICMPv4) for reachability tests
New-NetFirewallRule -DisplayName "Allow ICMPv4-In" \`
    -Protocol ICMPv4 \`
    -IcmpType 8 \`
    -Direction Inbound \`
    -Action Allow \`
    -Enabled True

Write-Host "WMI and ICMP ports opened on local firewall." -ForegroundColor Green`;

  return (
    <div className="space-y-6">
      {/* Port Table Overview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" id="gpo-ports">
        <h3 className="text-sm font-mono text-zinc-300 mb-4 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-emerald-400" /> Required Network Port Mapping
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
          To perform non-intrusive remote scans in an enterprise Windows Active Directory, the following ports must be opened inbound on target machine firewalls and allowed through internal VLAN/segment routing firewalls.
        </p>

        <div className="overflow-x-auto rounded-lg border border-zinc-850">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-850">
              <tr>
                <th className="p-3">Protocol</th>
                <th className="p-3">Port</th>
                <th className="p-3">Service Name</th>
                <th className="p-3">GPO Policy Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 bg-zinc-950/40">
              <tr>
                <td className="p-3 text-white font-semibold">ICMPv4</td>
                <td className="p-3">Echo request (Type 8)</td>
                <td className="p-3 text-zinc-400">Ping Reachability</td>
                <td className="p-3 text-zinc-500">Allows collector to pre-screen online status and avoid long timeouts.</td>
              </tr>
              <tr>
                <td className="p-3 text-white font-semibold">WMI / DCOM</td>
                <td className="p-3">TCP 135</td>
                <td className="p-3 text-zinc-400">RPC Endpoint Mapper</td>
                <td className="p-3 text-zinc-500">Initial connection handshake for classic DCOM based scans.</td>
              </tr>
              <tr>
                <td className="p-3 text-white font-semibold">RPC Dynamic</td>
                <td className="p-3">TCP 49152 - 65535</td>
                <td className="p-3 text-zinc-400">Ephemeral Dynamic RPC</td>
                <td className="p-3 text-zinc-500">DCOM dynamic allocations (can be locked down to single port in registry).</td>
              </tr>
              <tr>
                <td className="p-3 text-white font-semibold">WinRM HTTP</td>
                <td className="p-3">TCP 5985</td>
                <td className="p-3 text-zinc-400">WS-Management (Clear)</td>
                <td className="p-3 text-zinc-500">Modern Microsoft Remote Management. Recommended over WMI. Handles kerberos encrypt.</td>
              </tr>
              <tr>
                <td className="p-3 text-white font-semibold">WinRM HTTPS</td>
                <td className="p-3">TCP 5986</td>
                <td className="p-3 text-zinc-400">WS-Management (Secure)</td>
                <td className="p-3 text-zinc-500">Encrypted transmission using local TLS certifications. High secure standard.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* GPO GPO Scripts tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="gpo-scripts-split">
        {/* Modern WinRM Script GPO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" /> [A] Enable WinRM Automation Script
            </span>
            <button
              onClick={() => copyText(winrmGpoScript, "winrmGpo")}
              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition cursor-pointer"
            >
              {copiedKey === "winrmGpo" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-4 bg-zinc-950 flex-1 overflow-auto max-h-72">
            <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre leading-relaxed select-text">
              <code>{winrmGpoScript}</code>
            </pre>
          </div>
          <div className="p-3 bg-zinc-950 text-[10px] font-mono text-zinc-500 border-t border-zinc-850 flex gap-2">
            <Info className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
            <span>Distribution Guide: Deploy via Active Directory Startup Scripts in GPO under Computer Configuration \ Policies \ Windows Settings \ Scripts \ Startup.</span>
          </div>
        </div>

        {/* Classic WMI DCOM Script GPO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" /> [B] Classic WMI Firewall Script
            </span>
            <button
              onClick={() => copyText(dcomWmiGpoScript, "wmiGpo")}
              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition cursor-pointer"
            >
              {copiedKey === "wmiGpo" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-4 bg-zinc-950 flex-1 overflow-auto max-h-72">
            <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre leading-relaxed select-text">
              <code>{dcomWmiGpoScript}</code>
            </pre>
          </div>
          <div className="p-3 bg-zinc-950 text-[10px] font-mono text-zinc-500 border-t border-zinc-850 flex gap-2">
            <Info className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
            <span>Scope Note: WMI requires multiple dynamic RPC ports. Use this classic model if target computers cannot run WSMan / WinRM core engines.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
