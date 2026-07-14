export interface MotherboardDetails {
  manufacturer: string;
  product: string;
  serialNumber: string;
}

export interface CpuDetails {
  name: string;
  cores: number;
  logicalProcessors: number;
  architecture: string;
}

export interface RamDetails {
  sizeGb: number;
  speedMhz: number;
  slotsFilled: number;
  manufacturer: string;
}

export interface GpuDetails {
  name: string;
  vramGb: number;
  driverVersion: string;
}

export interface StorageDevice {
  device: string; // e.g. Disk 0, Drive C:
  model: string;
  sizeGb: number;
  freeGb: number;
  type: string; // SSD or HDD
}

export interface PowerSupplyDetails {
  model: string;
  wattage: number;
  isUPS: boolean;
  queryMethod: string;
  note: string;
}

export interface HardwareData {
  ipAddress: string;
  macAddress: string;
  username: string;
  motherboard: MotherboardDetails;
  cpu: CpuDetails;
  ram: RamDetails;
  gpu: GpuDetails;
  storage: StorageDevice[];
  powerSupply: PowerSupplyDetails;
  osName: string;
  domain: string;
}

export type ScanStatus =
  | 'idle'
  | 'pinging'
  | 'connecting'
  | 'authenticating'
  | 'collecting'
  | 'success'
  | 'failed'
  | 'offline';

export interface Computer {
  hostname: string;
  status: ScanStatus;
  attempts: number;
  lastAttemptTime?: string;
  error?: string;
  data?: HardwareData;
  history?: AuditAttempt[];
  securityAudit?: SecurityAuditData;
}

export interface SecurityAuditData {
  firewallEnabled: boolean;
  defenderActive: boolean;
  smbV1Enabled: boolean;
  insecureAccounts: string[];
  auditTime: string;
  complianceScore: number;
}

export interface AuditAttempt {
  timestamp: string;
  status: ScanStatus;
  protocol: 'wmi' | 'winrm';
  message: string;
}

export interface CollectorConfig {
  protocol: 'wmi' | 'winrm';
  authMethod: 'domain' | 'local' | 'smartcard';
  username: string;
  retryIntervalMinutes: number;
  maxRetries: number;
  timeoutSeconds: number;
  selectedAttributes: string[];
}
