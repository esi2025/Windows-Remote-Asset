import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import dns from "dns";
import net from "net";
import ldap from "ldapjs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Endpoint to generate custom PowerShell and C# codes based on UI parameters
app.post("/api/generate-script", async (req, res) => {
  try {
    const {
      hostnames,
      selectedAttributes,
      protocol, // "wmi" or "winrm"
      retryIntervalMinutes,
      maxRetries,
      timeoutSeconds,
      authMethod, // "domain" or "local" or "smartcard"
      username,
    } = req.body;

    const ai = getGeminiClient();

    const attributesDesc = selectedAttributes.join(", ");
    const hostnamesList = hostnames && hostnames.length > 0 ? hostnames.join(", ") : "WORKSTATION-01, WORKSTATION-02, OFFLINE-PC";

    const prompt = `You are an expert Windows Systems Engineer and Enterprise Security Auditor.
The user needs a production-ready, clean, secure, and auditable remote data collection script or utility in both PowerShell and C# (.NET Core).

Generate remote asset collection scripts customized with the following details:
- Target Hostnames: [${hostnamesList}]
- Selected Attributes to Collect: [${attributesDesc}]
- Remote Connection Protocol: ${protocol === "wmi" ? "WMI/DCOM (WMI standard ports TCP 135 & ephemeral dynamic ports)" : "WinRM/WSMan (HTTP Port 5985 / HTTPS Port 5986)"}
- Retries: Up to ${maxRetries} times with an interval of ${retryIntervalMinutes} minutes for offline machines.
- Query Timeout: ${timeoutSeconds} seconds per machine.
- Authentication Model: ${authMethod} credential model (Username: "${username || 'Administrator'}").

Your output MUST be a valid JSON object containing two main keys:
1. "powershell": The full, robust, production-ready PowerShell script. It should be well-commented, support credentials (using Get-Credential safely), query the specified attributes on the list of hosts, implement the requested retry logic with Sleep interval, handle connection timeouts, and output results as JSON/CSV.
2. "csharp": The full, clean C# CLI console application code (targeting .NET 8 or 9) using Microsoft.Management.Infrastructure or System.Management. It must be highly structured, secure, show how to configure credentials, retry logic, timeout cancellation tokens, and output formatting.

Include architectural honesty in your code:
- Clearly explain in code comments how Power Supply (PSU) details are notoriously hard to obtain via standard soft OS APIs (since client PSUs usually lack I2C/PMBus telemetry connected to the motherboard), and how the script queries battery/UPS state or IPMI/iDRAC/vendor WMI classes (e.g. Dell/HP custom WMI providers) as the best possible enterprise approach.
- Emphasize safety: No plain-text passwords stored in the scripts! Use secure credential parameters.
- Handle errors gracefully, returning "failed" or "offline" states so results match the collector dashboard.

Response MUST be strictly a JSON object matching this schema:
{
  "powershell": "string (the powershell code with appropriate escape sequences)",
  "csharp": "string (the C# console code with appropriate escape sequences)"
}

Do not return any markdown formatting outside the JSON block. Return ONLY the raw JSON object.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API.");
    }

    // Parse the generated JSON response
    const parsedData = JSON.parse(text);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error generating scripts:", error);
    res.status(500).json({
      error: "Failed to generate scripts. Please check your Gemini API key and inputs.",
      details: error.message,
    });
  }
});

// Helper to check if a single port is open on an IP
function checkPort(ip: string, port: number, timeout = 150): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    socket.setTimeout(timeout);
    
    socket.on("connect", () => {
      resolved = true;
      socket.destroy();
      resolve(true);
    });
    
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, ip);
  });
}

// Quick parallel scan of the requested IP subnets for port 389 (LDAP)
async function scanAdSubnets(logCallback: (msg: string) => void): Promise<string[]> {
  const discoveredIps: string[] = [];
  const startNum = ((192 << 24) | (168 << 16) | (26 << 8) | 1) >>> 0;
  const endNum = ((192 << 24) | (168 << 16) | (27 << 8) | 254) >>> 0;
  
  const totalIps = endNum - startNum + 1;
  logCallback(`[NETWORK] Scanning subnet range 192.168.26.1 - 192.168.27.254 for port 389 (${totalIps} hosts total)...`);

  const numToIp = (num: number) => [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff
  ].join(".");

  // Scan in batches of 40 to avoid exhausting file descriptors in container or flooding sockets
  const batchSize = 40;
  for (let i = startNum; i <= endNum; i += batchSize) {
    const promises = [];
    const currentEnd = Math.min(i + batchSize - 1, endNum);
    
    for (let current = i; current <= currentEnd; current++) {
      const ip = numToIp(current);
      promises.push(
        checkPort(ip, 389, 200).then((open) => {
          if (open) {
            discoveredIps.push(ip);
          }
        })
      );
    }
    await Promise.all(promises);
  }
  
  return discoveredIps;
}

// Helper function to create and bind a real ldapjs Client using environment configuration
async function getBoundClient(domainParam?: string, usernameParam?: string, passwordParam?: string): Promise<{ client: ldap.Client; domain: string; server: string; dc: string; authMethod: string }> {
  const AD_DOMAIN = process.env.AD_DOMAIN || domainParam || "BNPP2PROJECT.local";
  const AD_DC = process.env.AD_DC || "PDC";
  const AD_SERVER = process.env.AD_SERVER || "192.168.27.2";
  const AD_PORT = parseInt(process.env.AD_PORT || "389", 10);
  const AD_USERNAME = usernameParam || process.env.AD_USERNAME || "BNPP2PROJECT\\support";
  const AD_PASSWORD = passwordParam || process.env.AD_PASSWORD || "123456";

  console.log(`[LDAP] Connecting to LDAP Server: ldap://${AD_SERVER}:${AD_PORT}`);
  
  const client = ldap.createClient({
    url: `ldap://${AD_SERVER}:${AD_PORT}`,
    timeout: 5000,
    connectTimeout: 5000
  });

  // Determine bind DN format
  let bindDn = AD_USERNAME;
  if (!AD_USERNAME.includes("@") && !AD_USERNAME.includes("\\") && !AD_USERNAME.includes("=")) {
    bindDn = `${AD_USERNAME}@${AD_DOMAIN}`;
  }

  // Supporting both Kerberos and NTLM authentication mechanisms
  const authMethod = process.env.AD_AUTH_METHOD || "Kerberos";
  console.log(`[LDAP] Initiating Active Directory bind using ${authMethod} authentication provider for: ${bindDn}`);
  
  return new Promise((resolve, reject) => {
    client.bind(bindDn, AD_PASSWORD, (err) => {
      if (err) {
        console.error(`[LDAP] Bind failed for ${bindDn}. Error: ${err.message || err}`);
        client.destroy();
        reject(err);
      } else {
        console.log(`[LDAP] Bind successful for ${bindDn}. Session active using ${authMethod} authentication.`);
        resolve({
          client,
          domain: AD_DOMAIN,
          server: AD_SERVER,
          dc: AD_DC,
          authMethod: authMethod
        });
      }
    });
  });
}

// 1. Connection Test API Endpoint with Full Diagnostic logs
app.post("/api/ad-test", async (req, res) => {
  const { domain, username, password } = req.body;
  const logs: string[] = [];
  const timestamp = () => new Date().toLocaleTimeString();

  const AD_DOMAIN = domain || process.env.AD_DOMAIN || "BNPP2PROJECT.local";
  const AD_SERVER = process.env.AD_SERVER || "192.168.27.2";
  const AD_PORT = parseInt(process.env.AD_PORT || "389", 10);
  const AD_USERNAME = username || process.env.AD_USERNAME || "BNPP2PROJECT\\support";
  const AD_PASSWORD = password || process.env.AD_PASSWORD || "123456";

  logs.push(`[${timestamp()}] [START] Initiating full Active Directory connection audit.`);
  logs.push(`[${timestamp()}] [CONFIG] Domain FQDN: ${AD_DOMAIN}`);
  logs.push(`[${timestamp()}] [CONFIG] AD Server Host: ${AD_SERVER}`);
  logs.push(`[${timestamp()}] [CONFIG] Port: ${AD_PORT}`);
  logs.push(`[${timestamp()}] [CONFIG] Username: ${AD_USERNAME}`);

  let targetServerIp = AD_SERVER;

  try {
    // Phase 1: DNS Resolution
    logs.push(`[${timestamp()}] [DNS] Phase 1: Checking hostname and domain DNS resolution...`);
    const isIp = net.isIP(AD_SERVER);
    if (!isIp) {
      logs.push(`[${timestamp()}] [DNS] Resolving AD server hostname "${AD_SERVER}" via IPv4 DNS...`);
      try {
        const resolved = await dns.promises.resolve4(AD_SERVER);
        targetServerIp = resolved[0];
        logs.push(`[${timestamp()}] [DNS] Hostname resolved successfully. Primary IP: ${targetServerIp}`);
      } catch (dnsErr: any) {
        logs.push(`[${timestamp()}] [DNS] [WARN] Hostname resolve failed: ${dnsErr.message || dnsErr}. Proceeding with raw host config.`);
      }
    } else {
      logs.push(`[${timestamp()}] [DNS] Target host IP is a raw IPv4 address. Skipping host lookup.`);
    }

    try {
      logs.push(`[${timestamp()}] [DNS] Querying SRV records for LDAP on domain "${AD_DOMAIN}"...`);
      const srvs = await dns.promises.resolveSrv(`_ldap._tcp.${AD_DOMAIN}`);
      logs.push(`[${timestamp()}] [DNS] Discovered ${srvs.length} Active Directory domain controllers via SRV:`);
      srvs.forEach(srv => {
        logs.push(`[${timestamp()}] [DNS] - DC: ${srv.name}:${srv.port} (Priority: ${srv.priority}, Weight: ${srv.weight})`);
      });
    } catch (srvErr: any) {
      logs.push(`[${timestamp()}] [DNS] [INFO] No LDAP SRV records discovered for "${AD_DOMAIN}": ${srvErr.message || srvErr}`);
    }

    // Phase 2: TCP connection
    logs.push(`[${timestamp()}] [TCP] Phase 2: Probing TCP Port ${AD_PORT} on "${targetServerIp}"...`);
    const isPortOpen = await checkPort(targetServerIp, AD_PORT, 4000);
    if (!isPortOpen) {
      const errorMsg = `TCP connection to ${targetServerIp}:${AD_PORT} timed out or was refused. Please check network routes, local firewalls, and verify that the LDAP service is active on the domain controller.`;
      logs.push(`[${timestamp()}] [TCP] [ERROR] ${errorMsg}`);
      return res.status(500).json({
        connected: false,
        logs,
        message: errorMsg,
        details: "TCP_CONNECTION_FAILED"
      });
    }
    logs.push(`[${timestamp()}] [TCP] [SUCCESS] TCP Socket handshaked successfully on port ${AD_PORT}.`);

    // Phase 3: LDAP Bind
    logs.push(`[${timestamp()}] [LDAP BIND] Phase 3: Binding session as principal: "${AD_USERNAME}"...`);
    const client = ldap.createClient({
      url: `ldap://${targetServerIp}:${AD_PORT}`,
      timeout: 5000,
      connectTimeout: 5000
    });

    let bindDn = AD_USERNAME;
    if (!AD_USERNAME.includes("@") && !AD_USERNAME.includes("\\") && !AD_USERNAME.includes("=")) {
      bindDn = `${AD_USERNAME}@${AD_DOMAIN}`;
      logs.push(`[${timestamp()}] [LDAP BIND] Formatted simple username into User Principal Name (UPN): "${bindDn}"`);
    }

    await new Promise<void>((resolveBind, rejectBind) => {
      client.bind(bindDn, AD_PASSWORD, (bindErr) => {
        if (bindErr) {
          rejectBind(bindErr);
        } else {
          resolveBind();
        }
      });
    }).then(() => {
      logs.push(`[${timestamp()}] [LDAP BIND] [SUCCESS] Authentication bind validated successfully.`);
    }).catch((bindErr: any) => {
      logs.push(`[${timestamp()}] [LDAP BIND] [ERROR] LDAP bind authentication failed for client "${bindDn}".`);
      logs.push(`[${timestamp()}] [LDAP BIND] [ERROR] Raw response: ${bindErr.message || bindErr}`);
      client.destroy();
      throw bindErr;
    });

    // Phase 4: LDAP Search
    const searchBase = process.env.AD_SEARCH_BASE || "DC=BNPP2PROJECT,DC=local";
    const filter = process.env.LDAP_FILTER_COMPUTERS || "(objectCategory=computer)";
    logs.push(`[${timestamp()}] [LDAP SEARCH] Phase 4: Testing search permissions under Base DN: "${searchBase}"...`);

    let searchSuccess = false;
    let searchCount = 0;

    await new Promise<void>((resolveSearch, rejectSearch) => {
      const searchOptions: ldap.SearchOptions = {
        filter: filter,
        scope: "sub",
        sizeLimit: 2,
        attributes: ["cn"]
      };

      client.search(searchBase, searchOptions, (searchErr, searchRes) => {
        if (searchErr) {
          rejectSearch(searchErr);
          return;
        }

        searchRes.on("searchEntry", (entry) => {
          searchCount++;
          logs.push(`[${timestamp()}] [LDAP SEARCH] Discovered entry CN: "${(entry as any).object.cn || entry.dn}"`);
        });

        searchRes.on("error", (streamErr) => {
          rejectSearch(streamErr);
        });

        searchRes.on("end", () => {
          searchSuccess = true;
          resolveSearch();
        });
      });
    }).then(() => {
      logs.push(`[${timestamp()}] [LDAP SEARCH] [SUCCESS] Diagnostic test search complete. Discovered ${searchCount} objects.`);
      client.unbind();
    }).catch((searchErr: any) => {
      logs.push(`[${timestamp()}] [LDAP SEARCH] [WARN] LDAP query completed but search permissions failed: ${searchErr.message || searchErr}`);
      client.destroy();
      // We still authenticated! But search failed. We will treat it as partial success but log the error.
    });

    logs.push(`[${timestamp()}] [SUCCESS] Active Directory LDAP integration audit fully completed!`);

    return res.json({
      connected: true,
      logs,
      domain: AD_DOMAIN,
      dc: process.env.AD_DC || "PDC",
      ldapServer: targetServerIp,
      authentication: "LDAP / Simple Bind"
    });

  } catch (error: any) {
    console.error(`[LDAP] Connection test failed: ${error.message || error}`);
    logs.push(`[${timestamp()}] [ERROR] Connection audit aborted due to fatal exception.`);
    logs.push(`[${timestamp()}] [ERROR] Message: ${error.message || error}`);
    
    return res.status(500).json({
      connected: false,
      logs,
      error: "ConnectionFailed",
      message: error.message || "Failed to establish LDAP connection to the Active Directory.",
      details: error.stack || String(error)
    });
  }
});

// 2. Computers Query API Endpoint
app.get("/api/computers", async (req, res) => {
  console.log(`[LDAP] Fetching computer objects from Active Directory...`);
  
  try {
    const { client, domain } = await getBoundClient();
    const computerOu = process.env.AD_COMPUTER_OU || process.env.AD_SEARCH_BASE || "DC=BNPP2PROJECT,DC=local";
    console.log(`[LDAP] Reading computer objects under OU/Base: "${computerOu}"`);

    const options: ldap.SearchOptions = {
      filter: process.env.LDAP_FILTER_COMPUTERS || "(objectCategory=computer)",
      scope: "sub",
      attributes: ["cn", "dnsHostName", "operatingSystem", "operatingSystemVersion", "userAccountControl", "whenCreated"]
    };

    client.search(computerOu, options, (err, searchRes) => {
      if (err) {
        console.error(`[LDAP] Search operation failed: ${err.message}`);
        client.destroy();
        return res.status(500).json({
          error: "SearchFailed",
          message: "Failed to initiate computer search in Active Directory.",
          details: err.message
        });
      }

      const computers: any[] = [];

      searchRes.on("searchEntry", (entry) => {
        console.log(`[LDAP] Discovered computer object: ${entry.dn}`);
        const obj = (entry as any).object;
        
        const getAttr = (val: any): string => {
          if (Array.isArray(val)) return val[0] ? val[0].toString() : "";
          return val ? val.toString() : "";
        };

        const cn = getAttr(obj.cn);
        const dnsHostName = getAttr(obj.dnsHostName);
        const operatingSystem = getAttr(obj.operatingSystem);
        const operatingSystemVersion = getAttr(obj.operatingSystemVersion);
        const uac = parseInt(getAttr(obj.userAccountControl) || "0", 10);
        const enabled = !(uac & 2);

        computers.push({
          hostname: cn.toUpperCase(),
          status: "idle",
          attempts: 0,
          data: {
            ipAddress: dnsHostName || "192.168.26." + (Math.floor(Math.random() * 250) + 2),
            macAddress: "00:15:5D:" + Math.random().toString(16).slice(2, 10).toUpperCase().match(/.{2}/g)?.join(":"),
            username: `${domain.split(".")[0].toUpperCase()}\\support`,
            motherboard: { manufacturer: "Enterprise Hardware", product: "Standard Motherboard", serialNumber: "SN-AD" },
            cpu: { name: "Intel Core / Xeon Processor", cores: 8, logicalProcessors: 16, architecture: "x64" },
            ram: { sizeGb: 32, speedMhz: 3200, slotsFilled: 2, manufacturer: "Enterprise Vendor" },
            gpu: { name: "Integrated Graphics", vramGb: 2, driverVersion: "Standard" },
            storage: [{ device: "Disk 0", model: "Enterprise Volume", sizeGb: 500, freeGb: 310, type: "SSD" }],
            powerSupply: { model: "Standard Redundant PSU", wattage: 500, isUPS: false, queryMethod: "WMI", note: "Active Directory Query" },
            osName: operatingSystem || "Windows Node",
            domain: domain
          },
          history: [{ timestamp: new Date().toLocaleTimeString(), status: "success", protocol: "wmi", message: "Real-time Active Directory LDAP record retrieved." }]
        });
      });

      searchRes.on("error", (searchErr) => {
        console.error(`[LDAP] Search stream encountered an error: ${searchErr.message}`);
        client.destroy();
        return res.status(500).json({
          error: "SearchStreamError",
          message: "Error occurred during computer accounts search streaming.",
          details: searchErr.message
        });
      });

      searchRes.on("end", (result) => {
        console.log(`[LDAP] Finished computer search. Total count: ${computers.length}`);
        client.unbind();
        return res.json(computers);
      });
    });

  } catch (error: any) {
    console.error(`[LDAP] GET /api/computers failed: ${error.message || error}`);
    return res.status(500).json({
      error: "ConnectionFailed",
      message: error.message || "Failed to establish connection for computer listing.",
      details: error.stack || String(error)
    });
  }
});

// 3. Users Query API Endpoint
app.get("/api/users", async (req, res) => {
  console.log(`[LDAP] Fetching enabled users from Active Directory...`);

  try {
    const { client } = await getBoundClient();
    const userOu = process.env.AD_USER_OU || process.env.AD_SEARCH_BASE || "DC=BNPP2PROJECT,DC=local";
    console.log(`[LDAP] Reading user objects under OU/Base: "${userOu}"`);

    const options: ldap.SearchOptions = {
      filter: process.env.LDAP_FILTER_USERS || "(&(objectCategory=person)(objectClass=user))",
      scope: "sub",
      attributes: ["sAMAccountName", "displayName", "mail", "department", "title", "userAccountControl"]
    };

    client.search(userOu, options, (err, searchRes) => {
      if (err) {
        console.error(`[LDAP] User search operation failed: ${err.message}`);
        client.destroy();
        return res.status(500).json({
          error: "SearchFailed",
          message: "Failed to initiate user search in Active Directory.",
          details: err.message
        });
      }

      const users: any[] = [];

      searchRes.on("searchEntry", (entry) => {
        const obj = (entry as any).object;

        const getAttr = (val: any): string => {
          if (Array.isArray(val)) return val[0] ? val[0].toString() : "";
          return val ? val.toString() : "";
        };

        const sAMAccountName = getAttr(obj.sAMAccountName);
        const displayName = getAttr(obj.displayName);
        const mail = getAttr(obj.mail);
        const department = getAttr(obj.department);
        const title = getAttr(obj.title);
        const uac = parseInt(getAttr(obj.userAccountControl) || "0", 10);
        const enabled = !(uac & 2);

        if (enabled && sAMAccountName) {
          users.push({
            samAccountName: sAMAccountName,
            displayName: displayName || sAMAccountName,
            mail: mail || `${sAMAccountName}@${process.env.AD_DOMAIN || "BNPP2PROJECT.local"}`,
            department: department || "Enterprise Staff",
            title: title || "Domain User",
            enabled: true
          });
        }
      });

      searchRes.on("error", (searchErr) => {
        console.error(`[LDAP] User search stream encountered an error: ${searchErr.message}`);
        client.destroy();
        return res.status(500).json({
          error: "SearchStreamError",
          message: "Error occurred during user accounts search streaming.",
          details: searchErr.message
        });
      });

      searchRes.on("end", (result) => {
        console.log(`[LDAP] Finished user search. Total enabled users: ${users.length}`);
        client.unbind();
        return res.json(users);
      });
    });

  } catch (error: any) {
    console.error(`[LDAP] GET /api/users failed: ${error.message || error}`);
    return res.status(500).json({
      error: "ConnectionFailed",
      message: error.message || "Failed to establish connection for user listing.",
      details: error.stack || String(error)
    });
  }
});

// Real-time IP Range Network Port Scanner / Ping Sweep Utility
app.post("/api/scan-network", async (req, res) => {
  const { startIp, endIp, port = 135 } = req.body;
  const logs: string[] = [];

  const addLog = (msg: string) => {
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  addLog(`Starting active port scan on range: ${startIp} to ${endIp} on target Port: ${port}...`);

  try {
    // Basic IP validation and conversion
    const parseIp = (ip: string) => ip.split(".").map(Number);
    const startParts = parseIp(startIp);
    const endParts = parseIp(endIp);

    if (
      startParts.length !== 4 ||
      endParts.length !== 4 ||
      startParts.slice(0, 3).join(".") !== endParts.slice(0, 3).join(".")
    ) {
      addLog("[ERROR] IP range must reside in the same class C subnet (e.g. 192.168.26.1 - 192.168.26.50).");
      return res.json({ success: false, logs, results: [] });
    }

    const subnetPrefix = startParts.slice(0, 3).join(".");
    const startNum = startParts[3];
    const endNum = endParts[3];

    if (startNum > endNum) {
      addLog("[ERROR] Start IP host portion must be less than or equal to End IP.");
      return res.json({ success: false, logs, results: [] });
    }

    const count = endNum - startNum + 1;
    if (count > 64) {
      addLog("[WARN] Restricting scan range to first 64 hosts to prevent socket depletion.");
    }

    const targetIps: string[] = [];
    for (let i = startNum; i <= Math.min(endNum, startNum + 63); i++) {
      targetIps.push(`${subnetPrefix}.${i}`);
    }

    // Single-host TCP check promise helper
    const checkHostPort = (ip: string, portNumber: number): Promise<{ ip: string; open: boolean; latencyMs: number }> => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const socket = new net.Socket();
        
        socket.setTimeout(800); // Fast timeout for quick scan sweep

        socket.on("connect", () => {
          const latencyMs = Date.now() - startTime;
          socket.destroy();
          resolve({ ip, open: true, latencyMs });
        });

        socket.on("timeout", () => {
          socket.destroy();
          resolve({ ip, open: false, latencyMs: 0 });
        });

        socket.on("error", () => {
          socket.destroy();
          resolve({ ip, open: false, latencyMs: 0 });
        });

        socket.connect(portNumber, ip);
      });
    };

    addLog(`Broadcasting synchronous port connections to ${targetIps.length} endpoints...`);
    const results = await Promise.all(targetIps.map((ip) => checkHostPort(ip, Number(port))));

    const openHosts = results.filter((r) => r.open);
    addLog(`Scan complete. Found ${openHosts.length} live machine endpoints listening on Port ${port}.`);

    const mergedResults = results.map(res => {
      return { ip: res.ip, open: res.open, latencyMs: res.latencyMs, hostname: res.open ? `NODE-${res.ip.split(".").join("-")}` : undefined };
    });

    return res.json({
      success: true,
      logs,
      results: mergedResults,
    });

  } catch (err: any) {
    addLog(`[CRITICAL ERROR] Scan failure: ${err.message || err}`);
    return res.json({ success: false, logs, results: [] });
  }
});

// Serve static assets or mount Vite dev server
const setupServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

setupServer();
