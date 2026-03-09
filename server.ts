import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("fesga.db");
const JWT_SECRET = process.env.JWT_SECRET || "fesga_secret_key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    sector TEXT,
    region TEXT,
    ticker TEXT,
    confidence_score REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sector_weights (
    sector TEXT PRIMARY KEY,
    e_weight REAL,
    s_weight REAL,
    g_weight REAL
  );

  CREATE TABLE IF NOT EXISTS esg_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    e_score REAL,
    s_score REAL,
    g_score REAL,
    total_score REAL,
    stressed_score REAL,
    base_pd REAL,
    esg_adjusted_pd REAL,
    base_spread_bps INTEGER,
    loan_spread_bps INTEGER,
    e_weight REAL,
    s_weight REAL,
    g_weight REAL,
    reasoning TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS esg_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    e_score REAL,
    s_score REAL,
    g_score REAL,
    total_score REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    user_email TEXT,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    title TEXT,
    type TEXT,
    content TEXT,
    status TEXT,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    severity TEXT, -- 'info', 'warning', 'critical'
    message TEXT,
    is_predictive INTEGER DEFAULT 0,
    category TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- 'API', 'News', 'PDF'
    source TEXT,
    status TEXT, -- 'Pending', 'Processing', 'Completed', 'Failed'
    progress INTEGER DEFAULT 0,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS api_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    endpoint TEXT,
    last_sync DATETIME,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_type TEXT, -- 'Sector', 'Region'
    category_name TEXT,
    avg_e REAL,
    avg_s REAL,
    avg_g REAL,
    avg_total REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    role TEXT -- 'Analyst', 'Risk Manager', 'Admin', 'Auditor'
  );
`);

// Seed Users
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync("admin123", salt);
  const analystPass = bcrypt.hashSync("analyst123", salt);
  const riskPass = bcrypt.hashSync("risk123", salt);
  const auditorPass = bcrypt.hashSync("auditor123", salt);

  insertUser.run("admin@fesga.ai", adminPass, "Sarah Chen", "Admin");
  insertUser.run("analyst@fesga.ai", analystPass, "James Wilson", "Analyst");
  insertUser.run("risk@fesga.ai", riskPass, "Elena Rodriguez", "Risk Manager");
  insertUser.run("auditor@fesga.ai", auditorPass, "Marcus Thorne", "Auditor");
}

// Seed API Sources
const apiSourceCount = db.prepare("SELECT count(*) as count FROM api_sources").get() as { count: number };
if (apiSourceCount.count === 0) {
  const insertApi = db.prepare("INSERT INTO api_sources (name, endpoint, status) VALUES (?, ?, ?)");
  insertApi.run("Refinitiv ESG Proxy", "https://api.refinitiv.example/v1/esg", "Active");
  insertApi.run("MSCI ESG Proxy", "https://api.msci.example/v1/ratings", "Active");
  insertApi.run("Public ESG Feed", "https://esg-data.public.example/feed", "Active");
}

// Seed Benchmarks
const benchmarkCount = db.prepare("SELECT count(*) as count FROM benchmarks").get() as { count: number };
if (benchmarkCount.count === 0) {
  const insertBenchmark = db.prepare("INSERT INTO benchmarks (category_type, category_name, avg_e, avg_s, avg_g, avg_total) VALUES (?, ?, ?, ?, ?, ?)");
  
  // Sectors
  insertBenchmark.run("Sector", "Energy", 45.5, 52.1, 61.2, 51.5);
  insertBenchmark.run("Sector", "Transportation", 58.2, 64.5, 55.0, 59.8);
  insertBenchmark.run("Sector", "Technology", 72.4, 68.1, 70.5, 70.2);
  insertBenchmark.run("Sector", "Automotive", 52.1, 55.4, 58.9, 54.8);
  
  // Regions
  insertBenchmark.run("Region", "Europe", 68.5, 70.2, 75.1, 71.0);
  insertBenchmark.run("Region", "North America", 55.2, 58.4, 62.1, 58.5);
  insertBenchmark.run("Region", "Asia", 48.9, 52.1, 55.4, 51.8);
}

// Migration: Add base_spread_bps to esg_scores if it doesn't exist
try {
  db.exec("ALTER TABLE esg_scores ADD COLUMN base_spread_bps INTEGER");
} catch (e) {}

try {
  db.exec("ALTER TABLE esg_scores ADD COLUMN reasoning TEXT");
} catch (e) {}

// Seed data if empty
const companyCount = db.prepare("SELECT count(*) as count FROM companies").get() as { count: number };
if (companyCount.count === 0) {
  // Sector Weights (Auditable Methodology)
  const insertWeight = db.prepare("INSERT INTO sector_weights (sector, e_weight, s_weight, g_weight) VALUES (?, ?, ?, ?)");
  insertWeight.run("Energy", 0.5, 0.2, 0.3);
  insertWeight.run("Transportation", 0.4, 0.3, 0.3);
  insertWeight.run("Technology", 0.2, 0.4, 0.4);
  insertWeight.run("Automotive", 0.4, 0.3, 0.3);

  const insertCompany = db.prepare("INSERT INTO companies (name, sector, region, ticker, confidence_score) VALUES (?, ?, ?, ?, ?)");
  insertCompany.run("EcoPower Solutions", "Energy", "Europe", "EPS.EU", 0.95);
  insertCompany.run("Global Logistics Corp", "Transportation", "North America", "GLC.US", 0.88);
  insertCompany.run("TechNova Systems", "Technology", "Asia", "TNS.HK", 0.92);
  insertCompany.run("Future Mobility Ltd", "Automotive", "Europe", "FML.UK", 0.45);

  const companies = db.prepare("SELECT id, name, sector FROM companies").all() as { id: number, name: string, sector: string }[];
  const insertScore = db.prepare(`
    INSERT INTO esg_scores (company_id, e_score, s_score, g_score, total_score, stressed_score, base_pd, esg_adjusted_pd, base_spread_bps, loan_spread_bps, e_weight, s_weight, g_weight, reasoning) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSnapshot = db.prepare(`
    INSERT INTO esg_snapshots (company_id, e_score, s_score, g_score, total_score, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (company_id, user_email, action, details)
    VALUES (?, ?, ?, ?)
  `);

  companies.forEach(c => {
    if (c.name !== "Future Mobility Ltd") {
      const e = Math.random() * 100;
      const s = Math.random() * 100;
      const g = Math.random() * 100;
      
      const weights = db.prepare("SELECT * FROM sector_weights WHERE sector = ?").get(c.sector) as { e_weight: number, s_weight: number, g_weight: number };
      const total = (e * weights.e_weight) + (s * weights.s_weight) + (g * weights.g_weight);
      
      // Risk Metrics
      const basePd = 1.5 + Math.random() * 2; // 1.5% - 3.5%
      const esgAdjustedPd = basePd * (1 + (50 - total) / 200); // ESG can swing PD by +/- 25%
      const baseSpread = 150 + Math.random() * 100; // 150 - 250 bps
      const loanSpread = baseSpread - (total - 50) * 0.4; // ESG can swing spread by +/- 20 bps

      // Scenario-based scoring (stressed: double the weight of the lowest pillar)
      const scores = [{v: e, w: weights.e_weight}, {v: s, w: weights.s_weight}, {v: g, w: weights.g_weight}];
      const lowest = scores.reduce((prev, curr) => prev.v < curr.v ? prev : curr);
      const stressedTotal = scores.reduce((sum, curr) => {
        const weight = curr === lowest ? curr.w * 1.5 : curr.w * 0.75; 
        return sum + (curr.v * weight);
      }, 0);

      const reasoning = `Score driven by strong ${e > 70 ? 'environmental' : 'operational'} performance. Sector weights applied: E(${weights.e_weight*100}%), S(${weights.s_weight*100}%), G(${weights.g_weight*100}%).`;

      insertScore.run(c.id, e, s, g, total, stressedTotal, basePd, esgAdjustedPd, Math.round(baseSpread), Math.round(loanSpread), weights.e_weight, weights.s_weight, weights.g_weight, reasoning);
      
      // Add historical snapshots
      for (let i = 1; i <= 5; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        insertSnapshot.run(c.id, e - Math.random()*10, s - Math.random()*10, g - Math.random()*10, total - Math.random()*10, date.toISOString());
      }

      insertAudit.run(c.id, "system@fesga.ai", "Initial Score Generation", "Automated ESG risk assessment performed during onboarding.");
      
      // Seed some initial alerts
      const insertAlert = db.prepare(`
        INSERT INTO alerts (company_id, severity, message, is_predictive, category)
        VALUES (?, ?, ?, ?, ?)
      `);

      if (c.name === "EcoPower Solutions") {
        insertAlert.run(c.id, 'info', 'Stable environmental outlook for next 12 months.', 1, 'Environmental');
        insertAlert.run(c.id, 'warning', 'Potential supply chain disruption predicted in Q3 due to regional labor strikes.', 1, 'Social');
      }
      if (c.name === "Future Mobility Ltd") {
        insertAlert.run(c.id, 'critical', 'Governance score dropped below threshold. Immediate review required.', 0, 'Governance');
        insertAlert.run(c.id, 'critical', 'High probability of regulatory non-compliance in upcoming EU audit.', 1, 'Governance');
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Authentication Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const authorize = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    };
  };

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none", 
      maxAge: 24 * 60 * 60 * 1000 
    });
    res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none" 
    });
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  // API Routes
  app.get("/api/companies", authenticate, (req, res) => {
    const companies = db.prepare(`
      SELECT c.*, s.e_score, s.s_score, s.g_score, s.total_score, s.stressed_score,
             s.base_pd, s.esg_adjusted_pd, s.base_spread_bps, s.loan_spread_bps,
             s.e_weight, s.s_weight, s.g_weight, s.reasoning
      FROM companies c 
      LEFT JOIN esg_scores s ON c.id = s.company_id
    `).all().map((c: any) => ({
      ...c,
      weights: { e: c.e_weight, s: c.s_weight, g: c.g_weight }
    }));
    res.json(companies);
  });

  app.get("/api/companies/:id", authenticate, (req, res) => {
    const company: any = db.prepare(`
      SELECT c.*, s.e_score, s.s_score, s.g_score, s.total_score, s.stressed_score,
             s.base_pd, s.esg_adjusted_pd, s.base_spread_bps, s.loan_spread_bps,
             s.e_weight, s.s_weight, s.g_weight, s.reasoning
      FROM companies c 
      LEFT JOIN esg_scores s ON c.id = s.company_id
      WHERE c.id = ?
    `).get(req.params.id);
    
    if (company) {
      company.weights = { e: company.e_weight, s: company.s_weight, g: company.g_weight };
      
      company.snapshots = db.prepare(`
        SELECT * FROM esg_snapshots WHERE company_id = ? ORDER BY timestamp DESC
      `).all(req.params.id);

      company.audit_logs = db.prepare(`
        SELECT * FROM audit_logs WHERE company_id = ? ORDER BY timestamp DESC
      `).all(req.params.id);
    }
    res.json(company);
  });

  app.get("/api/alerts", authenticate, (req, res) => {
    const alerts = db.prepare(`
      SELECT a.*, c.name as company_name 
      FROM alerts a 
      JOIN companies c ON a.company_id = c.id 
      ORDER BY timestamp DESC LIMIT 50
    `).all().map((a: any) => ({
      ...a,
      is_predictive: !!a.is_predictive
    }));
    res.json(alerts);
  });

  app.get("/api/benchmarks", authenticate, (req, res) => {
    const benchmarks = db.prepare("SELECT * FROM benchmarks").all();
    res.json(benchmarks);
  });

  // Pipeline Endpoints
  app.get("/api/pipeline/jobs", authenticate, (req, res) => {
    const jobs = db.prepare("SELECT * FROM ingestion_jobs ORDER BY created_at DESC LIMIT 50").all();
    res.json(jobs);
  });

  app.get("/api/pipeline/sources", authenticate, (req, res) => {
    const sources = db.prepare("SELECT * FROM api_sources").all();
    res.json(sources);
  });

  app.get("/api/users", authenticate, authorize(["Admin"]), (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.post("/api/pipeline/ingest", authenticate, authorize(["Admin", "Analyst"]), (req, res) => {
    const { type, source } = req.body;
    const info = db.prepare("INSERT INTO ingestion_jobs (type, source, status) VALUES (?, ?, ?)").run(type, source, "Pending");
    res.json({ id: info.lastInsertRowid, status: "Pending" });
  });

  app.post("/api/companies/:id/scores", authenticate, authorize(["Admin", "Analyst"]), (req, res) => {
    const { e_score, s_score, g_score, reasoning } = req.body;
    const companyId = req.params.id;
    
    const total_score = (e_score * 0.4) + (s_score * 0.3) + (g_score * 0.3);
    
    db.prepare(`
      UPDATE esg_scores 
      SET e_score = ?, s_score = ?, g_score = ?, total_score = ?, last_updated = CURRENT_TIMESTAMP, reasoning = ?
      WHERE company_id = ?
    `).run(e_score, s_score, g_score, total_score, reasoning, companyId);

    db.prepare(`
      INSERT INTO esg_snapshots (company_id, e_score, s_score, g_score, total_score)
      VALUES (?, ?, ?, ?, ?)
    `).run(companyId, e_score, s_score, g_score, total_score);

    db.prepare(`
      INSERT INTO audit_logs (company_id, user_email, action, details)
      VALUES (?, ?, ?, ?)
    `).run(companyId, (req as any).user.email, "Manual Score Update", `Scores updated via AI Analysis: E=${e_score}, S=${s_score}, G=${g_score}`);

    res.json({ success: true });
  });

  // Background Worker Simulation
  setInterval(() => {
    const job: any = db.prepare("SELECT * FROM ingestion_jobs WHERE status = 'Pending' LIMIT 1").get();
    if (job) {
      db.prepare("UPDATE ingestion_jobs SET status = 'Processing', progress = 10, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(job.id);
      
      // Simulate work
      setTimeout(() => {
        const companiesData = db.prepare("SELECT id, name FROM companies").all() as { id: number, name: string }[];
        companiesData.forEach(c => {
          // Simulate data update
          const e = 40 + Math.random() * 50;
          const s = 40 + Math.random() * 50;
          const g = 40 + Math.random() * 50;
          const total = (e * 0.4) + (s * 0.3) + (g * 0.3);
          
          db.prepare(`
            UPDATE esg_scores 
            SET e_score = ?, s_score = ?, g_score = ?, total_score = ?, last_updated = CURRENT_TIMESTAMP 
            WHERE company_id = ?
          `).run(e, s, g, total, c.id);

          db.prepare(`
            INSERT INTO esg_snapshots (company_id, e_score, s_score, g_score, total_score)
            VALUES (?, ?, ?, ?, ?)
          `).run(c.id, e, s, g, total);

          db.prepare(`
            INSERT INTO audit_logs (company_id, user_email, action, details)
            VALUES (?, ?, ?, ?)
          `).run(c.id, "pipeline-worker@fesga.ai", `Pipeline Ingestion: ${job.type}`, `Updated scores via ${job.source} automated feed.`);
        });

        db.prepare("UPDATE ingestion_jobs SET status = 'Completed', progress = 100, updated_at = CURRENT_TIMESTAMP, result = ? WHERE id = ?")
          .run(`Successfully ingested data for ${companiesData.length} companies.`, job.id);
      }, 5000);
    }
  }, 10000);

  app.post("/api/documents", authenticate, (req, res) => {
    const { company_id, title, type, content } = req.body;
    const info = db.prepare("INSERT INTO documents (company_id, title, type, content, status) VALUES (?, ?, ?, ?, ?)")
      .run(company_id, title, type, content, "Processing");
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
