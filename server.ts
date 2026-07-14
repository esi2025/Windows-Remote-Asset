import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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
