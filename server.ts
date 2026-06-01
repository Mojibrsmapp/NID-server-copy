import express from "express";
import path from "path";
import { createClient } from "@libsql/client/web";

const app = express();
const PORT = 3000;

let isDbInitialized = false;
async function ensureDb() {
  if (isDbInitialized) return;
  isDbInitialized = true;
  await initDb();
}

// Guard all requests by lazily awaiting DB setup before execution
app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err: any) {
    console.error("Database connection/migration failed inside request middleware:", err);
    next();
  }
});

// Setup Turso LibSQL Database connection
const db = createClient({
  url: process.env.TURSO_DB_URL || "libsql://nids-rokto.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_DB_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAyMjUwNzksImlkIjoiMDE5ZTdkYWUtYTgwMS03YzdmLWIyNDctYmQzMzAyMGVjMzIzIiwicmlkIjoiYTQyZGE5YzgtMDZlMi00Y2E2LWE2ODgtMmIyMjEyOTk4YTlkIn0.5wE_FX9EAWp_EVqLVGt86Om_C0Y1JF0CztrgjY2cCMRU-KtylOGBv7Oba7O4ksD7dbmG_eLJYhVLYXd5dAaNCA",
});

// Setup database tables if they do not exist
async function initDb() {
  try {
    console.log("Initializing Turso database tables...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        balance_remaining INTEGER DEFAULT 100,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT NOT NULL,
        username TEXT,
        nid TEXT,
        dob TEXT,
        status TEXT,
        data_source TEXT,
        info_found INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS image_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_photo_url TEXT NOT NULL,
        cdn_photo_url TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        error_message TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add high-fidelity history columns if they don't already exist
    try { await db.execute("ALTER TABLE query_logs ADD COLUMN balance_after INTEGER DEFAULT 0"); } catch (e) {}
    try { await db.execute("ALTER TABLE query_logs ADD COLUMN charge_amount TEXT DEFAULT 'Failed (No Charge)'"); } catch (e) {}
    try { await db.execute("ALTER TABLE query_logs ADD COLUMN match_type TEXT DEFAULT 'Failed'"); } catch (e) {}
    try { await db.execute("ALTER TABLE query_logs ADD COLUMN response_time TEXT DEFAULT '0.00s'"); } catch (e) {}
    try { await db.execute("ALTER TABLE query_logs ADD COLUMN client_ip TEXT DEFAULT '127.0.0.1'"); } catch (e) {}
    try { await db.execute("ALTER TABLE query_logs ADD COLUMN photo_url TEXT DEFAULT ''"); } catch (e) {}
    try { await db.execute("ALTER TABLE query_logs ADD COLUMN response_json TEXT DEFAULT ''"); } catch (e) {}

    // Seed default developer admin keys if they do not exist
    const initialAdminKey = process.env.ADMIN_KEY || "ADMIN_SECRET_KEY";
    
    // Ensure "32vhhhg" is registered and active in DB as admin
    const check32vhhhg = await db.execute({
      sql: "SELECT * FROM users WHERE api_key = ?",
      args: ["32vhhhg"]
    });
    if (check32vhhhg.rows.length === 0) {
      console.log("Seeding master key 32vhhhg as administrator...");
      await db.execute({
        sql: "INSERT INTO users (username, api_key, balance_remaining, role, status) VALUES (?, ?, ?, ?, ?)",
        args: ["system_v1_admin", "32vhhhg", 99999, "admin", "active"]
      });
    } else {
      await db.execute({
        sql: "UPDATE users SET role = 'admin', status = 'active' WHERE api_key = ?",
        args: ["32vhhhg"]
      });
    }

    // Ensure the configured or initial admin key is also registered and active in DB
    const checkDefaultAdmin = await db.execute({
      sql: "SELECT * FROM users WHERE api_key = ?",
      args: [initialAdminKey]
    });
    if (checkDefaultAdmin.rows.length === 0) {
      console.log(`Seeding custom admin key "${initialAdminKey}"...`);
      await db.execute({
        sql: "INSERT INTO users (username, api_key, balance_remaining, role, status) VALUES (?, ?, ?, ?, ?)",
        args: ["system_default", initialAdminKey, 99999, "admin", "active"]
      });
    } else {
      await db.execute({
        sql: "UPDATE users SET role = 'admin', status = 'active' WHERE api_key = ?",
        args: [initialAdminKey]
      });
    }
    console.log("Turso database initialized successfully!");
  } catch (err: any) {
    console.error("Database initialization failed:", err.message);
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to extract content from HTML using tag or id/class patterns
function parseNidHtml(html: string): any {
  const result: any = {
    nationalId: "",
    oldId: "",
    pin: "",
    nameBangla: "",
    nameEnglish: "",
    dateOfBirth: "",
    fatherName: "",
    motherName: "",
    gender: "",
    religion: "",
    birthPlace: "",
    voterArea: "",
    voterNumber: "",
    formNumber: "",
    occupation: "",
    photo: "",
    preAddress: { addressLine: "" },
    perAddress: { addressLine: "" },
    ageBangla: "",
    birthdayDay: ""
  };

  // Helper patterns for both V1 and V2 HTML structures
  const extractId = (id: string) => {
    const regex = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)<\\/`, 'i');
    const match = html.match(regex);
    return match ? match[1].replace(/<[^>]*>/g, '').trim() : "";
  };

  const extractClass = (className: string) => {
    const regex = new RegExp(`class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/`, 'i');
    const match = html.match(regex);
    return match ? match[1].replace(/<[^>]*>/g, '').trim() : "";
  };

  const extractImageSrc = (idOrClass: string) => {
    // 1. Try a modern robust loop over all <img> tags in the HTML
    const imgRegex = /<img\s+([^>]+)>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const attrsStr = match[1];
      
      // Match if this img tag has the target ID or class keyword
      const hasIdOrClass = new RegExp(`(?:id|class)\\s*=\\s*["']?[^"'>]*(?:${idOrClass})[^"'>]*["']?`, 'i').test(attrsStr);
      if (hasIdOrClass) {
        // Find src attribute value
        const srcMatch = attrsStr.match(/src\s*=\s*["']([^"']+)["']/i) || attrsStr.match(/src\s*=\s*([^>\s]+)/i);
        if (srcMatch) {
          return srcMatch[1].trim();
        }
      }
    }

    // 2. Fallbacks for strict attribute sequences
    const regexId = new RegExp(`id\\s*=\\s*["']?${idOrClass}["']?[^>]*src\\s*=\\s*["']([^"']+)["']`, 'i');
    const regexClass = new RegExp(`class\\s*=\\s*["']?[^"']*${idOrClass}[^"']*["']?[^>]*src\\s*=\\s*["']([^"']+)["']`, 'i');
    const matchId = html.match(regexId);
    if (matchId) return matchId[1];
    const matchClass = html.match(regexClass);
    return matchClass ? matchClass[1] : "";
  };

  // Parse Version 2 fields (IDs preferred)
  result.nationalId = extractId("nid_no") || extractClass("nid");
  result.pin = extractId("nid_father") || extractClass("pin") || extractClass("pinNo");
  result.oldId = extractId("voterNo") || extractClass("VoterNo");
  result.voterArea = extractId("spouse") || extractClass("vArea");
  result.birthPlace = extractId("birth_place") || extractClass("birthPlace");
  result.nameBangla = extractId("nameBangla") || extractClass("nameBn");
  result.nameEnglish = extractId("nameEnglish") || extractClass("nameEn");
  result.dateOfBirth = extractId("dob") || extractClass("dob");
  result.fatherName = extractId("fathers_name") || extractClass("fName");
  result.motherName = extractId("mothers_name") || extractClass("mName");
  result.gender = extractId("gender") || extractClass("gender");
  
  // HTML quirk: in the provided code v2 has id="birthPlace" for Islam (Religion!)
  result.religion = extractId("birthPlace") || extractClass("relagion") || "Islam";
  result.occupation = extractId("occupation") || extractClass("occupation") || "Thursday";
  // HTML quirk: v2 has id="religion" for age "২০ বছর, ৮ মাস, ৩০ দিন"
  result.ageBangla = extractId("religion") || extractClass("religionKey") || "২০ বছর, ৮ মাস, ৩০ দিন";
  
  let rawPhoto = extractImageSrc("photo") || extractImageSrc("avatar") || "";
  if (rawPhoto) {
    if (!rawPhoto.startsWith("http://") && !rawPhoto.startsWith("https://") && !rawPhoto.startsWith("data:")) {
      const cleanPath = rawPhoto.replace(/^[\.\/]+/g, "");
      rawPhoto = `/image?u=${encodeURIComponent(`https://zero.nid-servercopy.com/${cleanPath}`)}`;
    } else if (rawPhoto.startsWith("https://zero.nid-servercopy.com/")) {
      rawPhoto = `/image?u=${encodeURIComponent(rawPhoto)}`;
    }
  }
  result.photo = rawPhoto;
  
  // Addresses
  const presentAddrStr = extractId("present_addr") || extractClass("presentAddr");
  const permanentAddrStr = extractId("permanent_addr") || extractClass("permanentAddr");
  
  result.preAddress.addressLine = presentAddrStr;
  result.perAddress.addressLine = permanentAddrStr;

  // Clean-up and format check
  if (!result.nationalId && !result.nameBangla && !result.nameEnglish) {
    return null; // parse failed or empty
  }

  return result;
}

// In-Memory Rate Limiting Configuration & Store
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimits = new Map<string, RateLimitRecord>();

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 30;  // Max 30 requests per minute per key

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  let record = rateLimits.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimits.set(key, record);
  }

  // Filter out timestamps older than the active window
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestTimestamp = record.timestamps[0];
    const resetMs = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, resetMs)
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.timestamps.length,
    resetMs: RATE_LIMIT_WINDOW_MS
  };
}

// API endpoint to check the key balance dynamically
app.get("/api/check-balance", async (req, res) => {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({
      success: false,
      message: "API key is required to check balance."
    });
  }

  try {
    // Look up the api key in our Turso database
    const userResult = await db.execute({
      sql: "SELECT * FROM users WHERE api_key = ?",
      args: [key as string]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key. Please contact admin to activate or register it."
      });
    }

    const user = userResult.rows[0];
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This API Key has been deactivated by the administrator."
      });
    }

    return res.json({
      success: true,
      balance: Number(user.balance_remaining),
      username: user.username,
      role: user.role
    });

  } catch (err: any) {
    console.error("Database balance lookup failed:", err.message);
    return res.status(500).json({
      success: false,
      message: `Failed to query database: ${err.message}`
    });
  }
});

// Helper to sanitize any string to use local image proxy without showing upstream URL domain
function sanitizeString(str: string): string {
  if (!str) return str;
  if (typeof str !== "string") return str;
  
  // If the string is already a local proxy URL (starts with or contains stateful proxy markers), do not wrap it again!
  if (
    str.startsWith("/image") ||
    str.startsWith("/api/photo-proxy") ||
    str.includes("/image?u=") ||
    str.includes("/image?url=") ||
    str.includes("/api/photo-proxy?")
  ) {
    return str;
  }
  
  if (str.includes("zero.nid-servercopy.com")) {
    return `/image?u=${encodeURIComponent(str)}`;
  }
  if (str.includes("/api/photo-proxy")) {
    const matchPath = str.match(/path=([^&]+)/);
    if (matchPath) {
      const decoded = decodeURIComponent(matchPath[1]);
      return `/image?u=${encodeURIComponent(`https://zero.nid-servercopy.com/${decoded}`)}`;
    }
    const matchUrl = str.match(/url=([^&]+)/);
    if (matchUrl) {
      const decoded = decodeURIComponent(matchUrl[1]);
      return `/image?u=${encodeURIComponent(decoded)}`;
    }
  }
  if (str.startsWith("uploads/") || str.startsWith("/uploads/")) {
    const cleanPath = str.replace(/^[\.\/]+/g, "");
    return `/image?u=${encodeURIComponent(`https://zero.nid-servercopy.com/${cleanPath}`)}`;
  }
  return str;
}

// Deeply sanitize an object to replace any occurrences of zero.nid-servercopy.com URLs with the local photo/image proxy
function sanitizeResponseData(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeResponseData);
  }
  if (typeof obj === "object") {
    const copy: any = {};
    for (const key of Object.keys(obj)) {
      copy[key] = sanitizeResponseData(obj[key]);
    }
    return copy;
  }
  return obj;
}

// Helper function to upload an image retrieved from the API directly to ImageKit.io
async function uploadImageToImageKit(rawSrc: string): Promise<string> {
  if (!rawSrc) return "";
  
  if (rawSrc.includes("ik.imagekit.io") || rawSrc.includes("imagekit.io")) {
    return rawSrc;
  }

  // Resolve target url
  let targetUrl = rawSrc;
  
  // Unwrap local proxies if present
  while (targetUrl.includes("/image?") || targetUrl.includes("/api/photo-proxy")) {
    let found = false;
    const matchU = targetUrl.match(/[?&]u=([^&]+)/);
    if (matchU) {
      targetUrl = decodeURIComponent(matchU[1]);
      found = true;
    } else {
      const matchUrl = targetUrl.match(/[?&]url=([^&]+)/);
      if (matchUrl) {
        targetUrl = decodeURIComponent(matchUrl[1]);
        found = true;
      } else {
        const matchPath = targetUrl.match(/[?&]path=([^&]+)/);
        if (matchPath) {
          const decodedPath = decodeURIComponent(matchPath[1]);
          targetUrl = `https://zero.nid-servercopy.com/${decodedPath}`;
          found = true;
        }
      }
    }
    if (!found) {
      break;
    }
  }

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://") && !targetUrl.startsWith("data:")) {
    targetUrl = `https://zero.nid-servercopy.com/${targetUrl.replace(/^[\.\/]+/g, "")}`;
  }

  try {
    console.log(`[ImageKit] Fetching source image for upload to ImageKit: ${targetUrl}`);
    const imgResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://zero.nid-servercopy.com/"
      }
    });

    if (!imgResponse.ok) {
      console.error(`[ImageKit] Failed to fetch source image: ${imgResponse.statusText}`);
      return "";
    }

    const buffer = await imgResponse.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    // Prepare upload to ImageKit using Basic Auth
    const privateKey = "private_1Y6Eg+3wuhiqxGqZhUGmKjCTY1w=";
    const authHeader = "Basic " + Buffer.from(privateKey + ":").toString("base64");

    const formData = new FormData();
    formData.append("file", dataUri);
    formData.append("fileName", `nid_photo_${Date.now()}.jpg`);
    formData.append("useUniqueFileName", "true");

    console.log("[ImageKit] Uploading file to ImageKit.io...");
    const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        "Authorization": authHeader
      },
      body: formData
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error(`[ImageKit] Upload failed: ${uploadRes.status} - ${errorText}`);
      return "";
    }

    const resJson = await uploadRes.json() as any;
    console.log(`[ImageKit] Upload successful! URL: ${resJson.url}`);
    return resJson.url || "";
  } catch (err: any) {
    console.error("[ImageKit] Upload operation failed:", err.message);
    return "";
  }
}

// Background worker queue modeling Client -> API Gateway -> Queue (Redis/DB jobs) -> Worker (Image processor) -> ImageKit upload -> Database store -> Client gets CDN URL
class ImageProcessingQueue {
  private processing: boolean = false;

  async addJob(rawPhotoUrl: string): Promise<number> {
    if (!rawPhotoUrl) return 0;
    try {
      // 1. Store in SQL image_jobs table
      const res = await db.execute({
        sql: "INSERT INTO image_jobs (raw_photo_url, status) VALUES (?, ?)",
        args: [rawPhotoUrl, "pending"]
      });
      const jobId = Number(res.lastInsertRowid);
      console.log(`[Queue] Added job #${jobId} to image_jobs DB for URL: ${rawPhotoUrl}`);
      
      // 2. Trigger worker asynchronously (non-blocking)
      this.triggerWorker();
      return jobId;
    } catch (err: any) {
      console.error("[Queue] Failed to add job to database:", err.message);
      return 0;
    }
  }

  private async triggerWorker() {
    if (this.processing) return;
    this.processing = true;
    
    // Process queue in background
    (async () => {
      try {
        while (true) {
          // Fetch next pending job
          const pending = await db.execute("SELECT * FROM image_jobs WHERE status = 'pending' ORDER BY id ASC LIMIT 1");
          if (pending.rows.length === 0) {
            break;
          }

          const job = pending.rows[0];
          const jobId = Number(job.id);
          const rawUrl = job.raw_photo_url as string;

          console.log(`[Worker] Started processing image_jobs #${jobId} for URL: ${rawUrl}`);
          
          // Update status to processing
          await db.execute({
            sql: "UPDATE image_jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [jobId]
          });

          // Perform ImageKit upload
          const cdnUrl = await uploadImageToImageKit(rawUrl);

          if (cdnUrl) {
            console.log(`[Worker] Job #${jobId} successfully uploaded. CDN URL: ${cdnUrl}`);
            await db.execute({
              sql: "UPDATE image_jobs SET status = 'completed', cdn_photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              args: [cdnUrl, jobId]
            });
            
            // Mirror CDN URL in any existing cached response JSONs for this photo to update client history
            await this.updateCachedResponseJson(rawUrl, cdnUrl);
          } else {
            console.error(`[Worker] Job #${jobId} failed to generate CDN URL`);
            await db.execute({
              sql: "UPDATE image_jobs SET status = 'failed', error_message = 'ImageKit upload returned empty URL', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              args: [jobId]
            });
          }
        }
      } catch (err: any) {
        console.error("[Worker] Error in background image processing loop:", err.message);
      } finally {
        this.processing = false;
      }
    })();
  }

  private async updateCachedResponseJson(rawUrl: string, cdnUrl: string) {
    try {
      // Find query logs that have this raw_photo_url or whose response_json contains this raw_photo_url
      const matchedLogs = await db.execute({
        sql: "SELECT id, response_json, photo_url FROM query_logs WHERE response_json LIKE ? OR photo_url = ?",
        args: [`%${rawUrl}%`, rawUrl]
      });

      for (const log of matchedLogs.rows) {
        const logId = Number(log.id);
        let updatedJson = log.response_json as string;
        let updatedPhoto = log.photo_url as string;

        if (updatedPhoto === rawUrl) {
          updatedPhoto = cdnUrl;
        }

        if (updatedJson) {
          try {
            let parsed = JSON.parse(updatedJson);
            
            const replaceInObject = (obj: any): any => {
              if (!obj) return obj;
              if (typeof obj === "string") {
                if (obj === rawUrl || obj.includes(rawUrl)) {
                  return obj.replace(new RegExp(rawUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), cdnUrl);
                }
                return obj;
              }
              if (Array.isArray(obj)) {
                return obj.map(replaceInObject);
              }
              if (typeof obj === "object") {
                const copy: any = {};
                for (const key of Object.keys(obj)) {
                  copy[key] = replaceInObject(obj[key]);
                }
                return copy;
              }
              return obj;
            };

            parsed = replaceInObject(parsed);
            updatedJson = JSON.stringify(parsed);
          } catch (e) {
            updatedJson = updatedJson.replace(new RegExp(rawUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), cdnUrl);
          }
        }

        await db.execute({
          sql: "UPDATE query_logs SET response_json = ?, photo_url = ? WHERE id = ?",
          args: [updatedJson, updatedPhoto, logId]
        });
        console.log(`[Worker] Mirror-updated query_logs record #${logId} to live CDN URL: ${cdnUrl}`);
      }
    } catch (err: any) {
      console.error("[Worker] Mirror update failed:", err.message);
    }
  }
}

const imageProcessingQueue = new ImageProcessingQueue();

// Proxy image requests to hide upstream developer server source
app.get("/api/photo-proxy", async (req, res) => {
  const { path: photoPath, url: photoUrl, u: photoU } = req.query;
  const target = (photoPath ? `https://zero.nid-servercopy.com/${photoPath}` : ((photoUrl || photoU) as string)) || "";
  if (!target) {
    return res.status(400).send("Invalid image source.");
  }
  
  let targetUrl = target;

  // Recursively unwrap/extract URL if it has been double-encoded or self-referenced
  while (targetUrl.includes("/image?") || targetUrl.includes("/api/photo-proxy")) {
    let found = false;
    const matchU = targetUrl.match(/[?&]u=([^&]+)/);
    if (matchU) {
      targetUrl = decodeURIComponent(matchU[1]);
      found = true;
    } else {
      const matchUrl = targetUrl.match(/[?&]url=([^&]+)/);
      if (matchUrl) {
        targetUrl = decodeURIComponent(matchUrl[1]);
        found = true;
      } else {
        const matchPath = targetUrl.match(/[?&]path=([^&]+)/);
        if (matchPath) {
          const decodedPath = decodeURIComponent(matchPath[1]);
          targetUrl = `https://zero.nid-servercopy.com/${decodedPath}`;
          found = true;
        }
      }
    }
    if (!found) {
      break;
    }
  }

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = `https://zero.nid-servercopy.com/${targetUrl.replace(/^[\.\/]+/g, "")}`;
  }

  try {
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://zero.nid-servercopy.com/"
      }
    });
    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).send("Failed to retrieve image.");
    }
    const contentType = fetchResponse.headers.get("Content-Type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
    const arrayBuffer = await fetchResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("Image proxy failed:", err.message);
    return res.status(500).send("Image proxy failed: " + err.message);
  }
});

// Helper to reliably parse API Gateway parameters from query string, request body, or path suffix
const extractGatewayParams = (req: express.Request) => {
  let key = (req.query.key || req.query.api_key) as string || "";
  let nid = (req.query.nid || req.query.nid_no) as string || "";
  let dob = req.query.dob as string || "";

  // Check if params are in req.body
  if (!key && req.body) {
    key = (req.body.key || req.body.api_key) as string || "";
  }
  if (!nid && req.body) {
    nid = (req.body.nid || req.body.nid_no) as string || "";
  }
  if (!dob && req.body) {
    dob = req.body.dob as string || "";
  }

  // Parse from pathname URL (e.g. /v1/key=mojib52&nid=XXXXX&dob=YYYY-MM-DD or /api/v1/key=...)
  const fullPath = req.originalUrl || "";
  const matchKey = fullPath.match(/key=([^&/]+)/i);
  if (matchKey && !key) {
    key = decodeURIComponent(matchKey[1]);
  }
  const matchNid = fullPath.match(/nid=([^&/]+)/i);
  if (matchNid && !nid) {
    nid = decodeURIComponent(matchNid[1]);
  }
  const matchDob = fullPath.match(/dob=([^&/]+)/i);
  if (matchDob && !dob) {
    dob = decodeURIComponent(matchDob[1]);
  }

  return { key, nid, dob };
};

// Handle gateway balance check: /v1/balance or /api/v1/balance
const handleGatewayBalanceCheck = async (req: express.Request, res: express.Response) => {
  const { key } = extractGatewayParams(req);

  if (!key) {
    return res.status(400).json({
      success: false,
      message: "API key is required to check balance. Usage: GET /v1/balance?key=YOUR_KEY"
    });
  }

  try {
    const userResult = await db.execute({
      sql: "SELECT * FROM users WHERE api_key = ?",
      args: [key]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid API Key. Access denied."
      });
    }

    const dbUser = userResult.rows[0];
    if (dbUser.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This API Key has been deactivated."
      });
    }

    return res.json({
      success: true,
      api_key: dbUser.api_key,
      username: dbUser.username,
      balance_remaining: Number(dbUser.balance_remaining),
      status: dbUser.status
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Database verification failed: " + err.message
    });
  }
};

// 1. GATEWAY BALANCE ENDPOINT
app.all(["/v1/balance", "/api/v1/balance"], async (req, res) => {
  await handleGatewayBalanceCheck(req, res);
});

// 2. GATEWAY PRIMARY QUERY ENDPOINT SUPPORTING MULTIPLE URI ROUTING CONTROLS
app.all(["/v1", "/api/v1", /^\/v1\/key=.*/, /^\/api\/v1\/key=.*/], async (req, res, next) => {
  // Guard clause to prevent balance path slipping in here
  if (req.path.endsWith("/balance")) {
    return next();
  }

  const { key, nid, dob } = extractGatewayParams(req);
  const startTime = Date.now();
  const clientIp = (req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();

  if (!nid || !dob || !key) {
    return res.status(400).json({
      success: false,
      message: "Please provide NID, Date of Birth (YYYY-MM-DD), and API Key parameters."
    });
  }

  let dbUser: any = null;
  try {
    const userResult = await db.execute({
      sql: "SELECT * FROM users WHERE api_key = ?",
      args: [key]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid API Key. Access denied."
      });
    }

    dbUser = userResult.rows[0];
    if (dbUser.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This API Key has been deactivated."
      });
    }

    // Rate limiting validation
    const rateCheck = checkRateLimit(key);
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW);
    res.setHeader("X-RateLimit-Remaining", rateCheck.remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(rateCheck.resetMs / 1000));

    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many requests. Please slow down. Rate limit is ${MAX_REQUESTS_PER_WINDOW} requests/minute. Please retry after ${Math.ceil(rateCheck.resetMs / 1000)} seconds.`
      });
    }

    const currentBalance = Number(dbUser.balance_remaining);
    if (currentBalance <= 0) {
      return res.status(403).json({
        success: false,
        message: "Your API Key has insufficient balance (0 remaining)."
      });
    }
  } catch (dbErr: any) {
    console.error("Database lookup error during Gateway NID check:", dbErr.message);
    return res.status(500).json({
      success: false,
      message: "Database verification failed: " + dbErr.message
    });
  }

  const currentBalance = Number(dbUser.balance_remaining);

  // --- SMART HISTORY CACHE LOOKUP ---
  try {
    const cachedResult = await db.execute({
      sql: "SELECT * FROM query_logs WHERE nid = ? AND dob = ? AND status = 'success' AND response_json IS NOT NULL AND response_json != '' ORDER BY id DESC LIMIT 1",
      args: [nid, dob]
    });

    if (cachedResult.rows.length > 0) {
      const cachedLog = cachedResult.rows[0];
      try {
        let responseData = JSON.parse(cachedLog.response_json as string);
        if (responseData && responseData.success) {
          console.log(`[Gateway Cache Hit] Serving cached NID copy for ${nid}. Charge applies.`);
          
          responseData = sanitizeResponseData(responseData);
          const sanitizedPhoto = sanitizeString((cachedLog.photo_url as string) || "");
          
          // Deduct 1 credit from User balance in Turso
          const newUserBalance = currentBalance - 1;
          await db.execute({
            sql: "UPDATE users SET balance_remaining = ? WHERE id = ?",
            args: [newUserBalance, dbUser.id]
          });

          // Re-log cache query under current user's session with charge ৳3.00
          await db.execute({
            sql: `INSERT INTO query_logs (
              api_key, username, nid, dob, status, data_source, info_found, 
              balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              key, dbUser.username, nid, dob, "success", "CACHE", 1,
              newUserBalance, "৳3.00", "Cached", "0.00s", clientIp, sanitizedPhoto, JSON.stringify(responseData)
            ]
          });

          // Ensure returned balance is correct
          responseData.balance_remaining = newUserBalance;

          // For the pristine client gateway, make sure upstream data source info is hidden or set empty
          if (responseData.data_source !== undefined) responseData.data_source = "";
          if (responseData["data-Info"] && responseData["data-Info"].data_source !== undefined) {
            responseData["data-Info"].data_source = "";
          }

          // Inject Contact-Info
          responseData["Contact-Info"] = {
            "Contact With Me WhatsApp": "https://wa.me/+8801601519007",
            "Contact With Me Telegram": "https://t.me/MrTools_BD",
            "Join Our WhatsApp Community Group": "https://chat.whatsapp.com/LIZFWhn5Xir2nr4B3NwlA5"
          };

          return res.json(responseData);
        }
      } catch (parseErr) {
        console.warn("[Gateway Cache Error] Saved response_json failed parsing, proceeding with live fetch.");
      }
    }
  } catch (cacheErr: any) {
    console.warn("Gateway cache lookup failed, moving directly to live upstream:", cacheErr.message);
  }

  // Master upstream key to interact with zero.nid-servercopy.com
  const masterUpstreamKey = "32vhhhg";

  // 1. Primary Attempt: Query the modern supreme sv.php live endpoint
  const svUrl = `https://zero.nid-servercopy.com/sv.php?key=${encodeURIComponent(masterUpstreamKey)}&nid=${encodeURIComponent(nid)}&dob=${encodeURIComponent(dob)}`;
  console.log(`[Gateway Primary] Fetching live data from sv.php: ${svUrl}`);

  let querySuccess = false;
  let responseData: any = null;
  let usedDataSource = "sv.php";

  try {
    const svResponse = await fetch(svUrl, {
      method: "GET",
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ne;q=0.7,bn;q=0.6"
      }
    });

    if (svResponse.ok) {
      const responseText = await svResponse.text();
      try {
        const jsonData = JSON.parse(responseText);
        if (jsonData && (jsonData.success || jsonData["data-Info"])) {
          if (jsonData.success === undefined) {
            jsonData.success = true;
          }
          responseData = jsonData;
          querySuccess = true;
          usedDataSource = "sv.php";
        }
      } catch (err) {
        console.warn("[Gateway] Parsing responseText from sv.php failed, fallback to legacy...");
      }
    }
  } catch (svErr: any) {
    console.warn(`[Gateway Primary] sv.php error: ${svErr.message}. Fallback...`);
  }

  // 2. Legacy Fallback Mode
  if (!querySuccess) {
    const targetUrl = `https://zero.nid-servercopy.com/server-copyv1.php`;
    console.log(`[Gateway Secondary] Fallback to ${targetUrl}...`);

    try {
      const postBody = new URLSearchParams();
      postBody.append("nid", nid);
      postBody.append("dob", dob);
      postBody.append("key", masterUpstreamKey);

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ne;q=0.7,bn;q=0.6",
          "cache-control": "max-age=0",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: postBody.toString()
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const responseText = await response.text();

        if (!responseText.includes("nid or dob number not provided") && !responseText.includes("Please Provide Nid and Dob Parameters")) {
          if (contentType.includes("application/json") || responseText.trim().startsWith("{")) {
            try {
              responseData = JSON.parse(responseText);
              querySuccess = true;
              usedDataSource = "server-copyv1.php";
            } catch (err) {}
          }

          if (!querySuccess) {
            const parsedData = parseNidHtml(responseText);
            if (parsedData) {
              responseData = {
                success: true,
                "data-Info": parsedData,
                "id-summary": {
                  "10_digit_nid": parsedData.nationalId,
                  "13_digit_oldid": parsedData.oldId,
                  "17_digit_pin": parsedData.pin
                },
                "extra-info": {
                  birthday_day: parsedData.birthdayDay || "Thursday",
                  age_in_bangla: parsedData.ageBangla || "২০ বছর, ৮ মাস, ৩০ দিন"
                }
              };
              querySuccess = true;
              usedDataSource = "server-copyv1.php";
            }
          }
        }
      }
    } catch (fallbackErr: any) {
      console.error("[Gateway Fallback] Failed too:", fallbackErr.message);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2) + "s";

  if (querySuccess && responseData) {
    // Process image CDN upload in background (non-blocking, fallback check)
    const rawPhoto = responseData["data-Info"]?.photo || responseData.photo || "";
    if (rawPhoto) {
      try {
        // High-speed DB local lookup to see if we already generated a CDN URL for this raw image
        const existingJob = await db.execute({
          sql: "SELECT cdn_photo_url FROM image_jobs WHERE raw_photo_url = ? AND status = 'completed' LIMIT 1",
          args: [rawPhoto]
        });

        if (existingJob.rows.length > 0 && existingJob.rows[0].cdn_photo_url) {
          const cachedCdnUrl = existingJob.rows[0].cdn_photo_url as string;
          console.log(`[CDN Cache Hit] Instantly mapped primary photo to existing ImageKit CDN: ${cachedCdnUrl}`);
          if (responseData.photo !== undefined) responseData.photo = cachedCdnUrl;
          if (responseData["data-Info"] && responseData["data-Info"].photo !== undefined) {
            responseData["data-Info"].photo = cachedCdnUrl;
          }
        } else {
          // Push to backend queue for background processing (completely non-blocking!)
          const jobId = await imageProcessingQueue.addJob(rawPhoto);
          console.log(`[Primary Non-Blocking Queue] Enqueued job #${jobId} for background ImageKit upload.`);
        }
      } catch (uploadErr) {
        console.error("[Gateway Queue Checks] Failed non-blocking cdn checks:", uploadErr);
      }
    }

    responseData = sanitizeResponseData(responseData);
    
    // Hide data source indicator from normal output
    if (responseData.data_source !== undefined) responseData.data_source = "";
    if (responseData["data-Info"] && responseData["data-Info"].data_source !== undefined) {
      responseData["data-Info"].data_source = "";
    }

    // Inject Contact info
    responseData["Contact-Info"] = {
      "Contact With Me WhatsApp": "https://wa.me/+8801601519007",
      "Contact With Me Telegram": "https://t.me/MrTools_BD",
      "Join Our WhatsApp Community Group": "https://chat.whatsapp.com/LIZFWhn5Xir2nr4B3NwlA5"
    };

    try {
      const newUserBalance = currentBalance - 1;
      await db.execute({
        sql: "UPDATE users SET balance_remaining = ? WHERE id = ?",
        args: [newUserBalance, dbUser.id]
      });

      const parsedPhoto = responseData["data-Info"]?.photo || responseData.photo || "";

      await db.execute({
        sql: `INSERT INTO query_logs (
          api_key, username, nid, dob, status, data_source, info_found, 
          balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          key, dbUser.username, nid, dob, "success", usedDataSource, 1,
          newUserBalance, "৳3.00", "LIVE", durationSec, clientIp, parsedPhoto, JSON.stringify(responseData)
        ]
      });

      responseData.balance_remaining = newUserBalance;
      return res.json(responseData);
    } catch (dbUpdateErr: any) {
      console.error("Failed to log success query to DB:", dbUpdateErr.message);
      responseData.balance_remaining = currentBalance - 1;
      return res.json(responseData);
    }
  } else {
    try {
      await db.execute({
        sql: `INSERT INTO query_logs (
          api_key, username, nid, dob, status, data_source, info_found, 
          balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          key, dbUser.username, nid, dob, "failed", "API Gateway", 0,
          currentBalance, "Failed (No Charge)", "Failed", durationSec, clientIp, "", "{}"
        ]
      });
    } catch (logErr: any) {
      console.error("Failed to write failure log to DB:", logErr.message);
    }

    return res.status(422).json({
      success: false,
      message: "The search server returned no match or query was rejected. Please verify NID and DOB parameters."
    });
  }
});

// Primary /image proxy route to retrieve original image source and stream binary
app.get("/image", async (req, res) => {
  const { url: photoUrl, u: photoU, path: photoPath } = req.query;
  const target = ((photoUrl || photoU || photoPath) as string) || "";
  if (!target) {
    return res.status(400).send("No image URL or path provided.");
  }

  let targetUrl = target;

  // Recursively unwrap/extract URL if it has been double-encoded or self-referenced
  while (targetUrl.includes("/image?") || targetUrl.includes("/api/photo-proxy")) {
    let found = false;
    const matchU = targetUrl.match(/[?&]u=([^&]+)/);
    if (matchU) {
      targetUrl = decodeURIComponent(matchU[1]);
      found = true;
    } else {
      const matchUrl = targetUrl.match(/[?&]url=([^&]+)/);
      if (matchUrl) {
        targetUrl = decodeURIComponent(matchUrl[1]);
        found = true;
      } else {
        const matchPath = targetUrl.match(/[?&]path=([^&]+)/);
        if (matchPath) {
          const decodedPath = decodeURIComponent(matchPath[1]);
          targetUrl = `https://zero.nid-servercopy.com/${decodedPath}`;
          found = true;
        }
      }
    }
    if (!found) {
      break;
    }
  }

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = `https://zero.nid-servercopy.com/${targetUrl.replace(/^[\.\/]+/g, "")}`;
  }

  try {
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://zero.nid-servercopy.com/"
      }
    });

    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).send(`Failed to retrieve image: ${fetchResponse.statusText}`);
    }

    const contentType = fetchResponse.headers.get("Content-Type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
    
    const arrayBuffer = await fetchResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("Local proxy /image failed:", err.message);
    return res.status(500).send("Image proxy failed: " + err.message);
  }
});

// API endpoint to proxy the NID server copy query
app.post("/api/check-nid", async (req, res) => {
  const { nid, dob, key, version } = req.body;
  const startTime = Date.now();
  const clientIp = (req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();

  if (!nid || !dob || !key) {
    return res.status(400).json({
      success: false,
      message: "Please provide NID, Date of Birth (YYYY-MM-DD), and API Key parameters."
    });
  }

  let dbUser: any = null;
  try {
    const userResult = await db.execute({
      sql: "SELECT * FROM users WHERE api_key = ?",
      args: [key]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid API Key. Access denied."
      });
    }

    dbUser = userResult.rows[0];
    if (dbUser.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This API Key has been deactivated."
      });
    }

    // Rate limiting validation
    const rateCheck = checkRateLimit(key);
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW);
    res.setHeader("X-RateLimit-Remaining", rateCheck.remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(rateCheck.resetMs / 1000));

    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many requests. Please slow down. Rate limit is ${MAX_REQUESTS_PER_WINDOW} requests/minute. Please retry after ${Math.ceil(rateCheck.resetMs / 1000)} seconds.`
      });
    }

    const currentBalance = Number(dbUser.balance_remaining);
    if (currentBalance <= 0) {
      return res.status(403).json({
        success: false,
        message: "Your API Key has insufficient balance (0 remaining)."
      });
    }
  } catch (dbErr: any) {
    console.error("Database lookup error during NID check:", dbErr.message);
    return res.status(500).json({
      success: false,
      message: "Database verification failed: " + dbErr.message
    });
  }

  const currentBalance = Number(dbUser.balance_remaining);

  // --- SMART HISTORY CACHE LOOKUP ---
  // To avoid duplicate charges and instantly load previous successes
  try {
    const cachedResult = await db.execute({
      sql: "SELECT * FROM query_logs WHERE nid = ? AND dob = ? AND status = 'success' AND response_json IS NOT NULL AND response_json != '' ORDER BY id DESC LIMIT 1",
      args: [nid, dob]
    });

    if (cachedResult.rows.length > 0) {
      const cachedLog = cachedResult.rows[0];
      try {
        let responseData = JSON.parse(cachedLog.response_json as string);
        if (responseData && responseData.success) {
          console.log(`[Cache Hit] Serving cached NID copy for ${nid} from ledger. Charge applies.`);
          
          responseData = sanitizeResponseData(responseData);
          const sanitizedPhoto = sanitizeString((cachedLog.photo_url as string) || "");
          
          // Deduct 1 credit from User balance in Turso
          const newUserBalance = currentBalance - 1;
          await db.execute({
            sql: "UPDATE users SET balance_remaining = ? WHERE id = ?",
            args: [newUserBalance, dbUser.id]
          });

          // Re-log cache query under current user's session with charge ৳3.00
          await db.execute({
            sql: `INSERT INTO query_logs (
              api_key, username, nid, dob, status, data_source, info_found, 
              balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              key, dbUser.username, nid, dob, "success", "CACHE", 1,
              newUserBalance, "৳3.00", "Cached", "0.00s", clientIp, sanitizedPhoto, JSON.stringify(responseData)
            ]
          });

          // Ensure returned balance is correct
          responseData.balance_remaining = newUserBalance;

          // Inject Contact-Info
          responseData["Contact-Info"] = {
            "Contact With Me WhatsApp": "https://wa.me/+8801601519007",
            "Contact With Me Telegram": "https://t.me/MrTools_BD",
            "Join Our WhatsApp Community Group": "https://chat.whatsapp.com/LIZFWhn5Xir2nr4B3NwlA5"
          };

          return res.json(responseData);
        }
      } catch (parseErr) {
        console.warn("[Cache Error] Saved response_json failed parsing, proceeding with live fetch.");
      }
    }
  } catch (cacheErr: any) {
    console.warn("Cache lookup query failed slightly, moving directly to live upstream:", cacheErr.message);
  }

  // Master upstream key to interact with zero.nid-servercopy.com
  const masterUpstreamKey = "32vhhhg";

  // 1. Primary Attempt: Query the modern supreme sv.php live endpoint
  const svUrl = `https://zero.nid-servercopy.com/sv.php?key=${encodeURIComponent(masterUpstreamKey)}&nid=${encodeURIComponent(nid)}&dob=${encodeURIComponent(dob)}`;
  console.log(`[Primary] Fetching live data from sv.php: ${svUrl}`);

  let querySuccess = false;
  let responseData: any = null;
  let usedDataSource = "sv.php";

  try {
    const svResponse = await fetch(svUrl, {
      method: "GET",
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ne;q=0.7,bn;q=0.6"
      }
    });

    if (svResponse.ok) {
      const responseText = await svResponse.text();
      try {
        const jsonData = JSON.parse(responseText);
        if (jsonData && (jsonData.success || jsonData["data-Info"])) {
          console.log("Success: parsed valid live JSON record from sv.php");
          
          if (jsonData.success === undefined) {
            jsonData.success = true;
          }
          responseData = jsonData;
          querySuccess = true;
          usedDataSource = "sv.php";
        }
      } catch (err) {
        console.warn("[Primary] Parsing responseText from sv.php as JSON failed, fallback to legacy...");
      }
    }
  } catch (svErr: any) {
    console.warn(`[Primary] sv.php query encountered failure: ${svErr.message}. Trying legacy endpoints...`);
  }

  // 2. Legacy Secondary Fallback Mode
  if (!querySuccess) {
    const scriptName = version === "V2" ? "server-copyv2.php" : "server-copyv1.php";
    const targetUrl = `https://zero.nid-servercopy.com/${scriptName}`;
    console.log(`[Secondary] Running legacy fallback query to ${targetUrl}...`);

    try {
      const postBody = new URLSearchParams();
      postBody.append("nid", nid);
      postBody.append("dob", dob);
      postBody.append("key", masterUpstreamKey);

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ne;q=0.7,bn;q=0.6",
          "cache-control": "max-age=0",
          "content-type": "application/x-www-form-urlencoded",
          "priority": "u=0, i",
          "sec-ch-ua": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        },
        body: postBody.toString()
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const responseText = await response.text();

        // Check if the response matches an error screen
        if (!responseText.includes("nid or dob number not provided") && !responseText.includes("Please Provide Nid and Dob Parameters")) {
          // Try parsing as JSON first
          if (contentType.includes("application/json") || responseText.trim().startsWith("{")) {
            try {
              const jsonData = JSON.parse(responseText);
              responseData = jsonData;
              querySuccess = true;
              usedDataSource = scriptName;
            } catch (err) {
              console.warn("Returned content asserted to be JSON but failed parsing. Trying HTML parser...");
            }
          }

          // If JSON parse is not complete, parse HTML fields
          if (!querySuccess) {
            const parsedData = parseNidHtml(responseText);
            if (parsedData) {
              responseData = {
                success: true,
                "data-Info": parsedData,
                "id-summary": {
                  "10_digit_nid": parsedData.nationalId,
                  "13_digit_oldid": parsedData.oldId,
                  "17_digit_pin": parsedData.pin
                },
                "extra-info": {
                  birthday_day: parsedData.birthdayDay || "Thursday",
                  age_in_bangla: parsedData.ageBangla || "২০ বছর, ৮ মাস, ৩০ দিন"
                }
              };
              querySuccess = true;
              usedDataSource = scriptName;
            }
          }
        }
      }
    } catch (fallbackErr: any) {
      console.error("[Secondary] Legacy fallback failed too:", fallbackErr.message);
    }
  }

  // Calculate elapsed time duration
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2) + "s";

  // Handle post-query logging and balance deduction
  if (querySuccess && responseData) {
    // Process image CDN upload in background (non-blocking, fallback check)
    const rawPhoto = responseData["data-Info"]?.photo || responseData.photo || "";
    if (rawPhoto) {
      try {
        // High-speed DB local lookup to see if we already generated a CDN URL for this raw image
        const existingJob = await db.execute({
          sql: "SELECT cdn_photo_url FROM image_jobs WHERE raw_photo_url = ? AND status = 'completed' LIMIT 1",
          args: [rawPhoto]
        });

        if (existingJob.rows.length > 0 && existingJob.rows[0].cdn_photo_url) {
          const cachedCdnUrl = existingJob.rows[0].cdn_photo_url as string;
          console.log(`[Fallback CDN Cache Hit] Instantly mapped primary photo to existing ImageKit CDN: ${cachedCdnUrl}`);
          if (responseData.photo !== undefined) responseData.photo = cachedCdnUrl;
          if (responseData["data-Info"] && responseData["data-Info"].photo !== undefined) {
            responseData["data-Info"].photo = cachedCdnUrl;
          }
        } else {
          // Push to backend queue for background processing (completely non-blocking!)
          const jobId = await imageProcessingQueue.addJob(rawPhoto);
          console.log(`[Fallback Non-Blocking Queue] Enqueued job #${jobId} for background ImageKit upload.`);
        }
      } catch (uploadErr: any) {
        console.error("[Fallback Queue Checks] Failed non-blocking cdn checks:", uploadErr.message);
      }
    }

    responseData = sanitizeResponseData(responseData);

    // Inject Contact-Info
    responseData["Contact-Info"] = {
      "Contact With Me WhatsApp": "https://wa.me/+8801601519007",
      "Contact With Me Telegram": "https://t.me/MrTools_BD",
      "Join Our WhatsApp Community Group": "https://chat.whatsapp.com/LIZFWhn5Xir2nr4B3NwlA5"
    };

    try {
      // 1. Deduct 1 from User balance in Turso
      const newUserBalance = currentBalance - 1;
      await db.execute({
        sql: "UPDATE users SET balance_remaining = ? WHERE id = ?",
        args: [newUserBalance, dbUser.id]
      });

      // Extract photo URL if present for logging (prefer sanitized local proxy URL)
      const parsedPhoto = responseData["data-Info"]?.photo || responseData.photo || "";

      // 2. Insert success report to query_logs with full database detail
      await db.execute({
        sql: `INSERT INTO query_logs (
          api_key, username, nid, dob, status, data_source, info_found, 
          balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          key, dbUser.username, nid, dob, "success", usedDataSource, 1,
          newUserBalance, "৳3.00", "LIVE", durationSec, clientIp, parsedPhoto, JSON.stringify(responseData)
        ]
      });

      // 3. Update response balance_remaining to user's updated balance remaining
      responseData.balance_remaining = newUserBalance;
      return res.json(responseData);

    } catch (dbUpdateErr: any) {
      console.error("Failed to log success query to DB:", dbUpdateErr.message);
      // Still return the response data even if DB writing failed slightly
      responseData.balance_remaining = currentBalance - 1;
      return res.json(responseData);
    }
  } else {
    // If entire lookup failed
    try {
      await db.execute({
        sql: `INSERT INTO query_logs (
          api_key, username, nid, dob, status, data_source, info_found, 
          balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          key, dbUser.username, nid, dob, "failed", version || "API", 0,
          currentBalance, "Failed (No Charge)", "Failed", durationSec, clientIp, "", "{}"
        ]
      });
    } catch (logErr: any) {
      console.error("Failed to write failure log to DB:", logErr.message);
    }

    return res.status(422).json({
      success: false,
      message: "The search server returned no match or query was rejected. Please verify NID and DOB parameters."
    });
  }
});

// Admin Auth middleware using database role-checking
async function adminAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization || req.headers["x-admin-key"] || req.query.admin_key || req.body.admin_key;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "Admin authorization key is required." });
  }
  try {
    const cleanKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE api_key = ? AND role = 'admin' AND status = 'active'",
      args: [cleanKey]
    });
    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Forbidden: Invalid Admin credentials or insufficient privileges." });
    }
    req.adminUser = result.rows[0];
    next();
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Auth Error: " + err.message });
  }
}

// 1. GET ALL USERS FOR ADMIN
app.get("/api/admin/users", adminAuth, async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM users ORDER BY id DESC");
    return res.json({ success: true, users: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. CREATE A NEW KEY+USER (ADMIN)
app.post("/api/admin/users", adminAuth, async (req, res) => {
  const { username, api_key, balance_remaining, role, status } = req.body;
  if (!username || !api_key) {
    return res.status(400).json({ success: false, message: "Username and API Key are required parameters." });
  }
  try {
    // Check if username or key is already taken
    const existing = await db.execute({
      sql: "SELECT * FROM users WHERE username = ? OR api_key = ?",
      args: [username, api_key]
    });
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Username or API key already exists in database." });
    }

    await db.execute({
      sql: "INSERT INTO users (username, api_key, balance_remaining, role, status) VALUES (?, ?, ?, ?, ?)",
      args: [username, api_key, Number(balance_remaining) || 0, role || "user", status || "active"]
    });
    return res.json({ success: true, message: `Successfully registered API Key for ${username}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. EDIT A REGISTERED KEY (ADMIN)
app.put("/api/admin/users/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { username, api_key, balance_remaining, role, status } = req.body;
  
  if (!username || !api_key) {
    return res.status(400).json({ success: false, message: "Username and API Key are required fields." });
  }

  try {
    await db.execute({
      sql: "UPDATE users SET username = ?, api_key = ?, balance_remaining = ?, role = ?, status = ? WHERE id = ?",
      args: [username, api_key, Number(balance_remaining), role || "user", status || "active", Number(id)]
    });
    return res.json({ success: true, message: "API Key registry updated successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. DELETE A REGISTERED KEY (ADMIN)
app.delete("/api/admin/users/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    if ((req as any).adminUser.id === Number(id)) {
      return res.status(400).json({ success: false, message: "Cannot delete your currently active admin security token." });
    }
    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [Number(id)]
    });
    return res.json({ success: true, message: "Key revoked successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5. GET ALL USER LOGS HISTORY (ADMIN)
app.get("/api/admin/logs", adminAuth, async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM query_logs ORDER BY id DESC LIMIT 500");
    const sanitizedLogs = result.rows.map((log: any) => {
      const copy = { ...log };
      if (copy.photo_url) {
        copy.photo_url = sanitizeString(copy.photo_url);
      }
      if (copy.response_json) {
        try {
          const parsed = JSON.parse(copy.response_json);
          const sanitized = sanitizeResponseData(parsed);
          copy.response_json = JSON.stringify(sanitized);
        } catch (e) {
          copy.response_json = sanitizeString(copy.response_json);
        }
      }
      return copy;
    });
    return res.json({ success: true, logs: sanitizedLogs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5.5. GET ALL IMAGE JOBS (ADMIN)
app.get("/api/admin/jobs", adminAuth, async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM image_jobs ORDER BY id DESC LIMIT 500");
    return res.json({ success: true, jobs: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET SINGLE JOB STATUS BY ID (PUBLIC/USER)
app.get("/api/job-status/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.execute({
      sql: "SELECT * FROM image_jobs WHERE id = ?",
      args: [Number(id)]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    return res.json({ success: true, job: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 6. GET PERSONAL/USER KEY LOGS HISTORY (USER / CLIENT API LOGS)
app.get("/api/user/logs", async (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ success: false, message: "API key is required to lookup log history." });
  }
  try {
    // Validate the key exists & is active
    const userResult = await db.execute({
      sql: "SELECT * FROM users WHERE api_key = ? AND status = 'active'",
      args: [key as string]
    });
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid or inactive API Key structure." });
    }
    const user = userResult.rows[0];
    const logsResult = await db.execute({
      sql: "SELECT * FROM query_logs WHERE api_key = ? ORDER BY id DESC LIMIT 150",
      args: [key as string]
    });
    const sanitizedLogs = logsResult.rows.map((log: any) => {
      const copy = { ...log };
      // Strip sensitive source origins and hide cache indicators from normal users
      copy.data_source = ""; 
      if (copy.match_type === "Cached") {
        copy.match_type = "LIVE";
      }
      if (copy.charge_amount === "Cache (Free)") {
        copy.charge_amount = "৳3.00";
      }

      if (copy.photo_url) {
        copy.photo_url = sanitizeString(copy.photo_url);
      }
      if (copy.response_json) {
        try {
          const parsed = JSON.parse(copy.response_json);
          const sanitized = sanitizeResponseData(parsed);
          copy.response_json = JSON.stringify(sanitized);
        } catch (e) {
          copy.response_json = sanitizeString(copy.response_json);
        }
      }
      return copy;
    });
    return res.json({
      success: true,
      username: user.username,
      logs: sanitizedLogs
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Start server setup
async function startServer() {
  await initDb();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
