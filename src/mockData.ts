import { Computer, HardwareData, CollectorConfig, ScanStatus } from "./types";

const CPU_PRESETS = [
  { name: "Intel Core i7-13700K @ 3.40GHz", cores: 16, logicalProcessors: 24, architecture: "x64" },
  { name: "AMD Ryzen 9 7900X @ 4.70GHz", cores: 12, logicalProcessors: 24, architecture: "x64" },
  { name: "Intel Core i5-12400 @ 2.50GHz", cores: 6, logicalProcessors: 12, architecture: "x64" },
  { name: "Intel Xeon Silver 4314 @ 2.40GHz", cores: 16, logicalProcessors: 32, architecture: "x64" },
  { name: "AMD Ryzen 5 5600X @ 3.70GHz", cores: 6, logicalProcessors: 12, architecture: "x64" },
];

const GPU_PRESETS = [
  { name: "NVIDIA GeForce RTX 4070 Ti", vramGb: 12, driverVersion: "551.23" },
  { name: "NVIDIA RTX A4000 (Enterprise)", vramGb: 16, driverVersion: "537.99" },
  { name: "Intel UHD Graphics 770 (Integrated)", vramGb: 2, driverVersion: "31.0.101" },
  { name: "AMD Radeon RX 6700 XT", vramGb: 12, driverVersion: "23.12.1" },
];

const MB_PRESETS = [
  { manufacturer: "ASUSTeK COMPUTER INC.", product: "PRIME Z790-P WIFI", serialNumber: "MB-2834710293" },
  { manufacturer: "Micro-Star International Co., Ltd.", product: "MAG B650 TOMAHAWK", serialNumber: "MB-9092834711" },
  { manufacturer: "GIGABYTE", product: "Z790 AORUS ELITE AX", serialNumber: "MB-112398234" },
  { manufacturer: "Dell Inc.", product: "0M6C8D (OptiPlex 7000)", serialNumber: "CN-0M6C8D-DELL-2A3" },
  { manufacturer: "HP", product: "8A25 (EliteDesk 800 G9)", serialNumber: "PH-8A25-HP-0012" },
];

export const INITIAL_HOSTNAMES = [
  "DESKTOP-R72A1B",
  "CORP-DC-01",
  "DEV-STATION-09",
  "MARKETING-LAP04",
  "CAD-RENDER-02",
  "HR-RECP-WIN11",
  "OFFLINE-SYS-03",
  "SECURE-VAULT-01"
];

// Generates simulated enterprise data for a specific machine
export function getSimulatedHardware(hostname: string): HardwareData {
  const hash = hostname.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const ipIdx = hash % 254 + 1;
  const ipAddress = `10.142.4.${ipIdx}`;
  
  const macParts = [];
  for (let i = 0; i < 6; i++) {
    const part = ((hash + i * 17) % 256).toString(16).toUpperCase().padStart(2, "0");
    macParts.push(part);
  }
  const macAddress = macParts.join(":");

  const domain = hostname.includes("CORP") || hostname.includes("SECURE") ? "CORP.ENTERPRISE.LOCAL" : "WORKGROUP";
  
  const userList = ["a.jones", "s.patel", "m.smith", "admin.local", "k.williams", "engineer_01"];
  const username = `${domain !== "WORKGROUP" ? "CORP" : hostname}\\${userList[hash % userList.length]}`;

  const cpu = CPU_PRESETS[hash % CPU_PRESETS.length];
  const gpu = GPU_PRESETS[hash % GPU_PRESETS.length];
  const motherboard = MB_PRESETS[hash % MB_PRESETS.length];

  const ramSizes = [8, 16, 32, 64, 128];
  const ramSizeGb = ramSizes[hash % ramSizes.length];
  const ramSpeed = hash % 2 === 0 ? 4800 : 5200;
  const ramManufacturer = hash % 3 === 0 ? "Crucial" : hash % 3 === 1 ? "Kingston" : "Corsair";
  const ram = {
    sizeGb: ramSizeGb,
    speedMhz: ramSpeed,
    slotsFilled: ramSizeGb > 16 ? 4 : 2,
    manufacturer: ramManufacturer
  };

  const storage = [
    {
      device: "Disk 0 (System)",
      model: hash % 2 === 0 ? "Samsung SSD 980 PRO 1TB" : "Crucial P5 Plus 2TB",
      sizeGb: hash % 2 === 0 ? 1024 : 2048,
      freeGb: hash % 2 === 0 ? 421 : 1290,
      type: "SSD"
    }
  ];

  if (ramSizeGb >= 32) {
    storage.push({
      device: "Disk 1 (Data)",
      model: "WD Blue 4TB (WD40EZAZ)",
      sizeGb: 4096,
      freeGb: 1980,
      type: "HDD"
    });
  }

  // Architecturally honest representation of Power Supply
  // Real PCs do not present PSU details via standard WMI.
  // We represent the simulated telemetry query method
  const isUPS = hostname.includes("DC") || hostname.includes("VAULT");
  const psuWattages = [500, 650, 750, 850, 1000];
  const wattage = psuWattages[hash % psuWattages.length];
  
  const powerSupply = {
    model: isUPS ? "APC Smart-UPS SMT1500" : `Corsair RM${wattage}x (Simulated via Manufacturer API)`,
    wattage: wattage,
    isUPS: isUPS,
    queryMethod: isUPS ? "WMI Win32_Battery / APC Smart UPS Daemon" : "Dell iDRAC IPMI Power Monitor / Vendor WMI Extension",
    note: isUPS 
      ? "Direct UPS query succeeded via Standard Battery interface."
      : "Standard WMI does not fetch PSU hardware details. This value is estimated or queried via OEM management tools."
  };

  const osVersions = ["Windows 11 Enterprise (Build 22631)", "Windows 10 Pro (Build 19045)", "Windows Server 2022 Datacenter"];
  const osName = osVersions[hash % osVersions.length];

  return {
    ipAddress,
    macAddress,
    username,
    motherboard,
    cpu,
    ram,
    gpu,
    storage,
    powerSupply,
    osName,
    domain
  };
}

// Emulate network scanning behavior
export function simulateScanStateTransition(
  computer: Computer,
  stepIndex: number,
  config: CollectorConfig
): { status: ScanStatus; error?: string; data?: HardwareData } {
  // Let some computers be inherently offline or fail credentials
  const hash = computer.hostname.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // SECURE-VAULT-01 fails credentials (to showcase failed logs and retry possibilities)
  const isAccessDenied = computer.hostname.includes("SECURE");
  // OFFLINE-SYS-03 is offline
  const isOffline = computer.hostname.includes("OFFLINE");

  const steps: ScanStatus[] = ['pinging', 'connecting', 'authenticating', 'collecting'];

  if (stepIndex < steps.length) {
    const currentStatus = steps[stepIndex];
    
    // Check if it should stop early
    if (currentStatus === 'connecting' && isOffline) {
      return { 
        status: 'offline', 
        error: `Ping timed out after ${config.timeoutSeconds}s or RPC service (TCP 135 / TCP 5985) is blocked on ${computer.hostname}.` 
      };
    }
    
    if (currentStatus === 'authenticating' && isAccessDenied) {
      return { 
        status: 'failed', 
        error: `WMI Connection Failed: Access Denied. User '${config.username}' does not have local Administrative privileges on ${computer.hostname}.` 
      };
    }

    return { status: currentStatus };
  }

  // Final success!
  const fullData = getSimulatedHardware(computer.hostname);
  
  // Filter data based on selectedAttributes
  return {
    status: 'success',
    data: fullData
  };
}
