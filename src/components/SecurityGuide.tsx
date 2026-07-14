import React from "react";
import { Shield, ShieldAlert, Key, UserCheck, EyeOff, FileText, AlertTriangle } from "lucide-react";

export default function SecurityGuide() {
  return (
    <div className="space-y-6">
      {/* High-Level warning alert */}
      <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-5 flex gap-4 text-xs font-mono text-amber-300" id="sec-notice">
        <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-400" />
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-amber-400">Security Warning: Avoid Domain Admin Overkill</p>
          <p className="leading-relaxed text-zinc-400">
            It is a common but dangerous practice in corporate IT environments to run asset collection scripts under full <strong className="text-white">Domain Admin</strong> credentials. If a target machine is compromised, dynamic session keys can be harvested from LSASS memory, leading to domain-wide lateral movement. Follow our least-privilege configurations below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="sec-details-split">
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
                $Credential.Password | ConvertFrom-SecureString | Out-File "C:\Secrets\pass.txt"
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Ethical Auditing Considerations */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3" id="sec-ethical">
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
  );
}
