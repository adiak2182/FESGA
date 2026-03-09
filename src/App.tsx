import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import { getCompanyNews, summarizeESGNews } from './services/geminiService';
import { List } from 'react-window';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  AlertTriangle, 
  PieChart, 
  Settings, 
  Search,
  TrendingUp,
  ShieldAlert,
  Globe,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CheckCircle2,
  Loader2,
  Newspaper,
  Fingerprint,
  History,
  Database,
  RefreshCw,
  Activity,
  Cpu,
  Zap,
  Flame,
  Globe2,
  BarChart3,
  UserCircle,
  ShieldCheck,
  Bell,
  Lock,
  Coins,
  ShieldOff,
  X,
  BrainCircuit,
  Filter,
  Download,
  FileSpreadsheet,
  Presentation,
  Printer,
  Share2,
  LogOut
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Company, Alert } from './types';

// --- Performance Utilities ---

const queryCache = new Map<string, any>();

const fetchWithCache = async (url: string) => {
  if (queryCache.has(url)) {
    return queryCache.get(url);
  }
  const response = await fetch(url);
  if (!response.ok) {
    const error: any = new Error(`HTTP error! status: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  queryCache.set(url, data);
  return data;
};

const LazyChart = ({ children, height = 300 }: { children: React.ReactNode, height?: number | string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ height, width: '100%' }}>
      {isVisible ? children : (
        <div className="w-full h-full bg-zinc-900/50 animate-pulse rounded-xl flex items-center justify-center">
          <Loader2 className="text-zinc-700 animate-spin" size={24} />
        </div>
      )}
    </div>
  );
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500' 
        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const StatCard = ({ label, value, trend, trendValue, presentationMode }: { label: string, value: string, trend: 'up' | 'down', trendValue: string, presentationMode?: boolean }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-xl transition-all duration-500 ${presentationMode ? 'p-8 shadow-2xl scale-105' : 'p-6'}`}>
    <p className={`text-zinc-500 uppercase tracking-wider font-semibold mb-2 ${presentationMode ? 'text-sm' : 'text-xs'}`}>{label}</p>
    <div className="flex items-end justify-between">
      <AnimatePresence mode="wait">
        <motion.h3 
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={`font-bold text-zinc-100 ${presentationMode ? 'text-4xl' : 'text-2xl'}`}
        >
          {value}
        </motion.h3>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div 
          key={trendValue}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`flex items-center gap-1 font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'} ${presentationMode ? 'text-sm' : 'text-xs'}`}
        >
          {trend === 'up' ? <ArrowUpRight size={presentationMode ? 18 : 14} /> : <ArrowDownRight size={presentationMode ? 18 : 14} />}
          {trendValue}
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
);

const ScoreProgressBar = ({ score, colorClass }: { score: number | null | undefined, colorClass: string }) => {
  const isAvailable = score !== null && score !== undefined && !isNaN(score as number);
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
        {isAvailable ? (
          <div 
            className={`h-full ${colorClass}`} 
            style={{ width: `${score}%` }}
          />
        ) : (
          <div className="h-full bg-zinc-700 w-full opacity-30" />
        )}
      </div>
      <span className="text-[10px] font-bold text-zinc-400">
        {isAvailable ? score!.toFixed(0) : 'N/A'}
      </span>
    </div>
  );
};

const PercentileGauge = ({ value, label }: { value: number, label: string }) => {
  const angle = (value / 100) * 180 - 90;
  const color = value > 75 ? '#10b981' : value > 40 ? '#f59e0b' : '#f43f5e';
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 border-[12px] border-zinc-800 rounded-full" />
        <motion.div 
          className="absolute top-0 left-0 w-32 h-32 border-[12px] rounded-full"
          style={{ borderColor: color, clipPath: 'inset(0 0 50% 0)' }}
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xl font-black text-zinc-100">
          {value.toFixed(0)}
        </div>
      </div>
      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-2 tracking-widest">{label}</p>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

function MainApp() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Company; direction: 'asc' | 'desc' } | null>(null);
  const [scenario, setScenario] = useState<'baseline' | 'stressed'>('baseline');
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ e: 0, s: 0, g: 0, reason: '' });

  // Registry Advanced Filtering State
  const [registryFilters, setRegistryFilters] = useState({
    sector: 'All',
    region: 'All',
    scoreRange: [0, 100] as [number, number],
    eRange: [0, 100] as [number, number],
    sRange: [0, 100] as [number, number],
    gRange: [0, 100] as [number, number],
    search: ''
  });
  const [savedViews, setSavedViews] = useState([
    { id: '1', name: 'High-risk Energy', filters: { sector: 'Energy', region: 'All', scoreRange: [0, 40] as [number, number], eRange: [0, 100] as [number, number], sRange: [0, 100] as [number, number], gRange: [0, 100] as [number, number], search: '' } },
    { id: '2', name: 'APAC Leaders', filters: { sector: 'All', region: 'APAC', scoreRange: [80, 100] as [number, number], eRange: [0, 100] as [number, number], sRange: [0, 100] as [number, number], gRange: [0, 100] as [number, number], search: '' } },
    { id: '3', name: 'Low Governance', filters: { sector: 'All', region: 'All', scoreRange: [0, 100] as [number, number], eRange: [0, 100] as [number, number], sRange: [0, 100] as [number, number], gRange: [0, 40] as [number, number], search: '' } }
  ]);
  const [isNLProcessing, setIsNLProcessing] = useState(false);
  const [nlQuery, setNlQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Document Analyzer State
  const [docContent, setDocContent] = useState('');
  const [targetCompanyId, setTargetCompanyId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'all' | 'predictive' | 'reactive'>('all');
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<string>('All');

  // Company News State
  const [companyNews, setCompanyNews] = useState<string | null>(null);
  const [newsSummary, setNewsSummary] = useState<string | null>(null);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [showStressResults, setShowStressResults] = useState(false);
  const [isStressSimulating, setIsStressSimulating] = useState(false);
  const [pipelineJobs, setPipelineJobs] = useState<any[]>([]);
  const [apiSources, setApiSources] = useState<any[]>([]);
  const [stressScenario, setStressScenario] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // RBAC State
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [benchmarkMode, setBenchmarkMode] = useState<'Sector' | 'Region'>('Sector');
  const [presentationMode, setPresentationMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isApplyingScores, setIsApplyingScores] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState<string | null>(null);

  const permissions = useMemo(() => {
    const role = user?.role || 'Auditor';
    return {
      canIngest: ['Admin', 'Analyst'].includes(role),
      canStressTest: ['Admin', 'Risk Manager'].includes(role),
      canAnalyzeDocs: ['Admin', 'Analyst'].includes(role),
      canManageAlerts: ['Admin', 'Risk Manager'].includes(role),
      canViewPipeline: ['Admin', 'Analyst'].includes(role),
      isAdmin: role === 'Admin'
    };
  }, [user]);

  const stressScenarios = [
    { id: 'carbon-tax', name: 'Carbon Tax Surge', icon: Flame, description: 'Global carbon price hits $150/tonne, impacting high-emitters.', color: 'text-rose-500' },
    { id: 'reg-shock', name: 'Regulatory Shock', icon: ShieldAlert, description: 'New mandatory ESG disclosure laws increase compliance costs by 30%.', color: 'text-yellow-500' },
    { id: 'supply-chain', name: 'Supply Chain Crisis', icon: Globe2, description: 'Human rights violations in key regions halt supply chains.', color: 'text-blue-500' },
    { id: 'inflation-shock', name: 'Inflation Shock', icon: Coins, description: 'Hyper-inflation leads to 25% increase in operational costs across all sectors.', color: 'text-amber-500' },
    { id: 'cyber-attack', name: 'Cyber Attack', icon: ShieldOff, description: 'Major data breach in financial infrastructure leads to temporary market freeze.', color: 'text-purple-500' },
  ];

  const simulatedPortfolioImpact = useMemo(() => {
    if (!stressScenario) return null;
    
    // Simulate VaR-style impact
    const baseValue = 4.2; // $4.2B
    let impact = 0;
    let riskShift = 0;
    let sectors: string[] = [];

    if (stressScenario === 'carbon-tax') {
      impact = -0.45; // -$450M
      riskShift = 18; // +18% risk
      sectors = ['Energy', 'Transport'];
    } else if (stressScenario === 'reg-shock') {
      impact = -0.15; // -$150M
      riskShift = 8;
      sectors = ['Finance', 'Tech'];
    } else if (stressScenario === 'supply-chain') {
      impact = -0.32; // -$320M
      riskShift = 12;
      sectors = ['Manufacturing', 'Retail'];
    } else if (stressScenario === 'inflation-shock') {
      impact = -0.68; // -$680M
      riskShift = 22;
      sectors = ['Consumer Goods', 'Real Estate', 'Retail'];
    } else if (stressScenario === 'cyber-attack') {
      impact = -0.28; // -$280M
      riskShift = 15;
      sectors = ['Finance', 'Tech', 'Utilities'];
    }

    return {
      loss: impact,
      newVaR: baseValue + Math.abs(impact) * 1.5,
      riskIncrease: riskShift,
      affectedSectors: sectors
    };
  }, [stressScenario]);

  const fetchPipelineData = async () => {
    try {
      const [jobsRes, sourcesRes] = await Promise.all([
        fetch('/api/pipeline/jobs'),
        fetch('/api/pipeline/sources')
      ]);
      
      if (jobsRes.status === 401 || sourcesRes.status === 401) {
        logout();
        return;
      }

      setPipelineJobs(await jobsRes.json());
      setApiSources(await sourcesRes.json());
    } catch (e) {
      console.error("Failed to fetch pipeline data", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'pipeline') {
      fetchPipelineData();
      const interval = setInterval(fetchPipelineData, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleTriggerIngest = async (type: string, source: string) => {
    try {
      await fetch('/api/pipeline/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, source })
      });
      fetchPipelineData();
    } catch (e) {
      console.error("Failed to trigger ingestion", e);
    }
  };

  const [simulatedScores, setSimulatedScores] = useState({ e: 0, s: 0, g: 0 });

  useEffect(() => {
    if (selectedCompany) {
      setSimulatedScores({
        e: selectedCompany.e_score || 50,
        s: selectedCompany.s_score || 50,
        g: selectedCompany.g_score || 50
      });
    }
  }, [selectedCompany]);

  const simulatedTotalScore = useMemo(() => {
    if (!selectedCompany?.weights) return 0;
    const { e, s, g } = selectedCompany.weights;
    return (simulatedScores.e * e) + (simulatedScores.s * s) + (simulatedScores.g * g);
  }, [simulatedScores, selectedCompany]);

  const simulatedSpread = useMemo(() => {
    if (!selectedCompany) return 0;
    // Logic: Base Spread - (ESG Score Delta from 50) * 0.4
    return Math.round(selectedCompany.base_spread_bps - (simulatedTotalScore - 50) * 0.4);
  }, [simulatedTotalScore, selectedCompany]);

  const handleFetchNews = async (companyName: string) => {
    setIsFetchingNews(true);
    setCompanyNews(null);
    setNewsSummary(null);
    try {
      const news = await getCompanyNews(companyName);
      setCompanyNews(news || "No news found.");
      if (news) {
        const summary = await summarizeESGNews(news);
        setNewsSummary(summary || null);
      }
    } catch (error) {
      console.error("Failed to fetch news", error);
      setCompanyNews("Failed to retrieve news. Please try again later.");
    } finally {
      setIsFetchingNews(false);
    }
  };

  const handleNewAnalysis = () => {
    setDocContent('');
    setTargetCompanyId('');
    setAnalysisResult(null);
    setActiveTab('documents');
  };

  const handleTriggerStressSim = () => {
    if (!stressScenario) {
      setStressScenario('carbon-tax'); // Default if none selected
    }
    setIsStressSimulating(true);
    setShowStressResults(true);
    setTimeout(() => {
      setIsStressSimulating(false);
    }, 1500);
  };

  const handleProcessDocument = async () => {
    if (!docContent || !targetCompanyId) return;
    
    setIsProcessing(true);
    setAnalysisResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following document for ESG risks and opportunities for the company. 
        Provide scores for Environmental, Social, and Governance pillars (0-100) and a brief summary.
        Document: ${docContent}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              e_score: { type: Type.NUMBER },
              s_score: { type: Type.NUMBER },
              g_score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ["e_score", "s_score", "g_score", "summary", "confidence"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setAnalysisResult(result);
    } catch (error) {
      console.error("AI Processing failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyScores = async () => {
    if (!analysisResult || !targetCompanyId) return;

    setIsApplyingScores(true);
    try {
      const response = await fetch(`/api/companies/${targetCompanyId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          e_score: analysisResult.e_score,
          s_score: analysisResult.s_score,
          g_score: analysisResult.g_score,
          reasoning: analysisResult.summary
        })
      });

      if (response.ok) {
        // Refresh companies data
        const companiesRes = await fetch('/api/companies');
        if (companiesRes.ok) {
          const data = await companiesRes.json();
          setCompanies(data);
        }
        setAnalysisResult(null);
        setDocContent('');
        setTargetCompanyId('');
        alert('Scores applied successfully to borrower profile.');
      } else {
        throw new Error('Failed to apply scores');
      }
    } catch (error) {
      console.error("Failed to apply scores", error);
      alert('Failed to apply scores. Please try again.');
    } finally {
      setIsApplyingScores(false);
    }
  };

  const handleSort = (key: keyof Company) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleOverride = async () => {
    if (!selectedCompany) return;
    
    const updatedCompany = {
      ...selectedCompany,
      overrides: {
        e_score: overrideForm.e,
        s_score: overrideForm.s,
        g_score: overrideForm.g,
        reason: overrideForm.reason,
        analyst_email: user?.email || 'analyst@bank.com',
        timestamp: new Date().toISOString()
      }
    };

    setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? updatedCompany : c));
    setSelectedCompany(updatedCompany);
    setIsOverriding(false);
    
    // In a real app, we'd POST this to the backend
    console.log("Override saved for", selectedCompany.name, updatedCompany.overrides);
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const searchMatch = company.name.toLowerCase().includes(registryFilters.search.toLowerCase()) ||
                         company.ticker.toLowerCase().includes(registryFilters.search.toLowerCase());
      const sectorMatch = registryFilters.sector === 'All' || company.sector === registryFilters.sector;
      const regionMatch = registryFilters.region === 'All' || company.region === registryFilters.region;
      
      const score = scenario === 'baseline' ? company.total_score : company.stressed_score;
      const scoreMatch = score >= registryFilters.scoreRange[0] && score <= registryFilters.scoreRange[1];
      
      const eMatch = (company.e_score || 0) >= registryFilters.eRange[0] && (company.e_score || 0) <= registryFilters.eRange[1];
      const sMatch = (company.s_score || 0) >= registryFilters.sRange[0] && (company.s_score || 0) <= registryFilters.sRange[1];
      const gMatch = (company.g_score || 0) >= registryFilters.gRange[0] && (company.g_score || 0) <= registryFilters.gRange[1];
      
      return searchMatch && sectorMatch && regionMatch && scoreMatch && eMatch && sMatch && gMatch;
    });
  }, [companies, registryFilters, scenario]);

  const sortedCompanies = useMemo(() => {
    let sortableItems = [...filteredCompanies];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCompanies, sortConfig]);

  const handleNLSearch = async (query: string) => {
    if (!query || query.length < 5) return;
    setIsNLProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Parse this natural language query for an ESG registry into filter parameters.
        Query: "${query}"
        Available Sectors: ${Array.from(new Set(companies.map(c => c.sector))).join(', ')}
        Available Regions: ${Array.from(new Set(companies.map(c => c.region))).join(', ')}
        
        Return JSON only: { 
          "sector": string | "All", 
          "region": string | "All", 
          "scoreRange": [number, number], 
          "eRange": [number, number], 
          "sRange": [number, number], 
          "gRange": [number, number], 
          "search": string 
        }
        
        Note: "low" usually means [0, 40], "high" means [70, 100], "mid" means [40, 70]. 
        If a specific pillar is mentioned (e.g. "low governance"), set the corresponding range (e.g. gRange: [0, 40]).`,
        config: { responseMimeType: "application/json" }
      });
      
      const result = JSON.parse(response.text || '{}');
      
      setRegistryFilters({
        sector: result.sector || 'All',
        region: result.region || 'All',
        scoreRange: (result.scoreRange || [0, 100]) as [number, number],
        eRange: (result.eRange || [0, 100]) as [number, number],
        sRange: (result.sRange || [0, 100]) as [number, number],
        gRange: (result.gRange || [0, 100]) as [number, number],
        search: result.search || '',
      });
      setNlQuery('');
    } catch (error) {
      console.error("NL Search failed", error);
    } finally {
      setIsNLProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('main-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#09090b',
        logging: false,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            /* Fallback colors for html2canvas which doesn't support oklch() */
            :root {
              --background: #09090b !important;
              --foreground: #f4f4f5 !important;
            }
            
            body, #main-content { 
              background-color: #09090b !important; 
              color: #f4f4f5 !important; 
            }

            .bg-zinc-950 { background-color: #09090b !important; }
            .bg-zinc-900 { background-color: #18181b !important; }
            .bg-zinc-800 { background-color: #27272a !important; }
            .bg-zinc-700 { background-color: #3f3f46 !important; }
            .bg-zinc-800\\/50 { background-color: rgba(39, 39, 42, 0.5) !important; }
            .bg-zinc-900\\/50 { background-color: rgba(24, 24, 27, 0.5) !important; }
            
            .bg-emerald-500 { background-color: #10b981 !important; }
            .bg-emerald-600 { background-color: #059669 !important; }
            .bg-emerald-500\\/10 { background-color: rgba(16, 185, 129, 0.1) !important; }
            .bg-emerald-500\\/20 { background-color: rgba(16, 185, 129, 0.2) !important; }
            
            .bg-amber-500 { background-color: #f59e0b !important; }
            .bg-amber-500\\/10 { background-color: rgba(245, 158, 11, 0.1) !important; }
            
            .bg-red-500 { background-color: #ef4444 !important; }
            .bg-red-500\\/10 { background-color: rgba(239, 68, 68, 0.1) !important; }
            
            .bg-blue-500 { background-color: #3b82f6 !important; }
            .bg-blue-500\\/10 { background-color: rgba(59, 130, 246, 0.1) !important; }
            
            .text-zinc-50 { color: #fafafa !important; }
            .text-zinc-100 { color: #f4f4f5 !important; }
            .text-zinc-200 { color: #e4e4e7 !important; }
            .text-zinc-300 { color: #d4d4d8 !important; }
            .text-zinc-400 { color: #a1a1aa !important; }
            .text-zinc-500 { color: #71717a !important; }
            
            .text-emerald-400 { color: #34d399 !important; }
            .text-emerald-500 { color: #10b981 !important; }
            .text-amber-400 { color: #fbbf24 !important; }
            .text-amber-500 { color: #f59e0b !important; }
            .text-red-400 { color: #f87171 !important; }
            .text-red-500 { color: #ef4444 !important; }
            .text-blue-400 { color: #60a5fa !important; }
            .text-blue-500 { color: #3b82f6 !important; }
            
            .border-zinc-800 { border-color: #27272a !important; }
            .border-zinc-700 { border-color: #3f3f46 !important; }
            .border-emerald-500\\/20 { border-color: rgba(16, 185, 129, 0.2) !important; }
            .border-amber-500\\/20 { border-color: rgba(245, 158, 11, 0.2) !important; }
            .border-red-500\\/20 { border-color: rgba(239, 68, 68, 0.2) !important; }
            
            /* Recharts specific fallbacks */
            .recharts-cartesian-grid-horizontal line,
            .recharts-cartesian-grid-vertical line {
              stroke: #27272a !important;
            }
            .recharts-text {
              fill: #a1a1aa !important;
            }
            .recharts-legend-item-text {
              color: #a1a1aa !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FESGA_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    const data = companies.map(c => ({
      'Company Name': c.name,
      'Ticker': c.ticker,
      'Sector': c.sector,
      'Region': c.region,
      'Total ESG Score': c.total_score,
      'Environmental': c.e_score,
      'Social': c.s_score,
      'Governance': c.g_score,
      'Confidence Score': `${((c.confidence_score || 0) * 100).toFixed(0)}%`
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ESG Registry");
    XLSX.writeFile(wb, `FESGA_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  useEffect(() => {
    if (!user) {
      queryCache.clear();
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesData, alertsData, benchmarksData] = await Promise.all([
          fetchWithCache('/api/companies'),
          fetchWithCache('/api/alerts'),
          fetchWithCache('/api/benchmarks')
        ]);
        setCompanies(companiesData);
        setAlerts(alertsData);
        setBenchmarks(benchmarksData);

        if (permissions.isAdmin) {
          const usersRes = await fetch('/api/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setAllUsers(usersData);
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch data", error);
        if (error.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user, permissions.isAdmin]);

  const avgConfidence = useMemo(() => {
    if (companies.length === 0) return 0;
    const total = companies.reduce((sum, c) => sum + (c.confidence_score || 0), 0);
    return (total / companies.length) * 100;
  }, [companies]);

  const SortIcon = ({ columnKey, currentSort }: { columnKey: keyof Company, currentSort: { key: keyof Company; direction: 'asc' | 'desc' } | null }) => {
    if (!currentSort || currentSort.key !== columnKey) return <ArrowUpDown size={12} className="ml-1 opacity-30" />;
    return currentSort.direction === 'asc' ? <ArrowUp size={12} className="ml-1 text-emerald-500" /> : <ArrowDown size={12} className="ml-1 text-emerald-500" />;
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const typeMatch = alertFilter === 'all' 
        ? true 
        : alertFilter === 'predictive' 
          ? alert.is_predictive 
          : !alert.is_predictive;
      
      const categoryMatch = alertCategoryFilter === 'All' 
        ? true 
        : alert.category === alertCategoryFilter;

      return typeMatch && categoryMatch;
    });
  }, [alerts, alertFilter, alertCategoryFilter]);

  const clusteredAlerts = useMemo(() => {
    const clusters: Record<string, Alert[]> = {};
    filteredAlerts.forEach(alert => {
      // Cluster by company and category to reduce noise
      const key = `${alert.company_name}-${alert.category}`;
      if (!clusters[key]) clusters[key] = [];
      clusters[key].push(alert);
    });
    return Object.entries(clusters).map(([key, items]) => ({
      id: key,
      companyId: items[0].company_id,
      company: items[0].company_name,
      category: items[0].category,
      alerts: items,
      maxSeverity: items.reduce((max, a) => {
        const levels = { info: 0, warning: 1, critical: 2 };
        return levels[a.severity] > levels[max] ? a.severity : max;
      }, 'info' as 'info' | 'warning' | 'critical'),
      isPredictive: items.some(a => a.is_predictive)
    }));
  }, [filteredAlerts]);

  const renderModelMonitoring = () => {
    const driftData = [
      { date: '2025-10', drift: 0.012, confidence: 96 },
      { date: '2025-11', drift: 0.015, confidence: 95 },
      { date: '2025-12', drift: 0.018, confidence: 95 },
      { date: '2026-01', drift: 0.022, confidence: 94 },
      { date: '2026-02', drift: 0.035, confidence: 92 },
      { date: '2026-03', drift: 0.048, confidence: 90 },
    ];

    const feedbackStats = {
      totalPredictions: 1240,
      overrides: companies.filter(c => c.overrides).length,
      accuracy: 96.6,
      topDriftSector: 'Energy'
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-2">Model Accuracy</p>
            <h3 className="text-2xl font-bold text-emerald-400">{feedbackStats.accuracy}%</h3>
            <p className="text-[10px] text-zinc-600 mt-1">Vs. Ground Truth (Manual Audits)</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-2">Analyst Overrides</p>
            <h3 className="text-2xl font-bold text-amber-400">{feedbackStats.overrides}</h3>
            <p className="text-[10px] text-zinc-600 mt-1">{((feedbackStats.overrides / feedbackStats.totalPredictions) * 100).toFixed(1)}% of total predictions</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-2">Concept Drift</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-rose-400">0.048</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold uppercase">Warning</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Threshold: 0.050</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-2">Top Drift Sector</p>
            <h3 className="text-2xl font-bold text-zinc-100">{feedbackStats.topDriftSector}</h3>
            <p className="text-[10px] text-zinc-600 mt-1">Input distribution shift detected</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100 italic font-serif">Model Drift Detection</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">PSI (Population Stability Index)</p>
              </div>
              <Activity className="text-rose-500" size={20} />
            </div>
            <div className="h-[250px]">
              <LazyChart height="100%">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={driftData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                      itemStyle={{ color: '#f43f5e' }}
                    />
                    <Line type="monotone" dataKey="drift" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4, fill: '#f43f5e' }} />
                  </LineChart>
                </ResponsiveContainer>
              </LazyChart>
            </div>
            <div className="mt-4 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-rose-400 mb-1">
                <AlertTriangle size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">Drift Alert</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Input data style for <b>Energy</b> sector has shifted significantly in the last 30 days. 
                Model confidence in this sector has dropped from 96% to 88%. Retraining recommended.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100 italic font-serif">Analyst Feedback Loop</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Recent Overrides & Corrections</p>
              </div>
              <RefreshCw className="text-amber-500" size={20} />
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {companies.filter(c => c.overrides).sort((a, b) => new Date(b.overrides!.timestamp!).getTime() - new Date(a.overrides!.timestamp!).getTime()).map(company => (
                <div key={company.id} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-200">{company.name}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">{company.overrides?.timestamp?.split('T')[0]}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-center p-1 bg-zinc-900 rounded">
                      <p className="text-[8px] text-zinc-500 uppercase">E-Score</p>
                      <p className="text-xs font-bold text-emerald-400">{company.overrides?.e_score}</p>
                    </div>
                    <div className="text-center p-1 bg-zinc-900 rounded">
                      <p className="text-[8px] text-zinc-500 uppercase">S-Score</p>
                      <p className="text-xs font-bold text-blue-400">{company.overrides?.s_score}</p>
                    </div>
                    <div className="text-center p-1 bg-zinc-900 rounded">
                      <p className="text-[8px] text-zinc-500 uppercase">G-Score</p>
                      <p className="text-xs font-bold text-purple-400">{company.overrides?.g_score}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">"{company.overrides?.reason}"</p>
                  <div className="mt-2 flex items-center gap-2">
                    <UserCircle size={12} className="text-zinc-600" />
                    <span className="text-[9px] text-zinc-600 font-bold uppercase">{company.overrides?.analyst_email}</span>
                  </div>
                </div>
              ))}
              {companies.filter(c => c.overrides).length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                  <Database size={32} className="mb-2 opacity-20" />
                  <p className="text-sm italic">No analyst overrides recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const portfolioChartData = useMemo(() => {
    return companies.map(c => ({
      name: c.name,
      score: scenario === 'stressed' 
        ? (c.stressed_score ?? (c.total_score ? c.total_score * 0.85 : 0)) 
        : (c.total_score ?? 0)
    }));
  }, [companies, scenario]);

const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <TrendingUp className="text-emerald-500" size={20} />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Scenario Analysis</h3>
            <p className="text-[10px] text-zinc-500">Toggle between baseline and stressed ESG outcomes</p>
          </div>
        </div>
        <div className="flex bg-zinc-800 p-1 rounded-lg">
          <button 
            onClick={() => setScenario('baseline')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${scenario === 'baseline' ? 'bg-emerald-500 text-zinc-950 shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Baseline
          </button>
          <button 
            onClick={() => setScenario('stressed')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${scenario === 'stressed' ? 'bg-rose-500 text-zinc-950 shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Stressed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard 
          label="Total Exposure" 
          value="$4.2B" 
          trend="up" 
          trendValue="+12%" 
          presentationMode={presentationMode} 
        />
        <StatCard 
          label="Risk-Adj. Exposure" 
          value={scenario === 'stressed' ? "$4.9B" : "$4.6B"} 
          trend="up" 
          trendValue={scenario === 'stressed' ? "+22%" : "+15%"} 
          presentationMode={presentationMode} 
        />
        <StatCard 
          label="Avg ESG-Adj. PD" 
          value={scenario === 'stressed' ? "3.42%" : "2.84%"} 
          trend={scenario === 'stressed' ? "up" : "down"} 
          trendValue={scenario === 'stressed' ? "+0.58%" : "-0.12%"} 
          presentationMode={presentationMode} 
        />
        <StatCard 
          label="Portfolio Confidence" 
          value={scenario === 'stressed' ? `${(avgConfidence * 0.88).toFixed(0)}%` : `${avgConfidence.toFixed(0)}%`} 
          trend={scenario === 'stressed' ? "down" : "up"} 
          trendValue={scenario === 'stressed' ? "-12%" : "+5%"} 
          presentationMode={presentationMode} 
        />
        <StatCard 
          label="High Risk Entities" 
          value={scenario === 'stressed' ? "28" : "12"} 
          trend={scenario === 'stressed' ? "up" : "down"} 
          trendValue={scenario === 'stressed' ? "+16" : "-3"} 
          presentationMode={presentationMode} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl transition-all duration-500 ${presentationMode ? 'p-10 shadow-2xl' : 'p-6'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`font-semibold text-zinc-100 italic font-serif ${presentationMode ? 'text-2xl' : 'text-lg'}`}>Portfolio ESG Performance</h3>
            <select className="bg-zinc-800 border-none text-xs text-zinc-300 rounded px-2 py-1 outline-none">
              <option>Last 12 Months</option>
              <option>Last 3 Years</option>
            </select>
          </div>
          <div className={`${presentationMode ? 'h-[450px]' : 'h-[300px]'} transition-all duration-500`}>
            <LazyChart height="100%">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke={scenario === 'stressed' ? '#f43f5e' : '#10b981'} 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: scenario === 'stressed' ? '#f43f5e' : '#10b981', strokeWidth: 2, stroke: '#18181b' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-in-out"
                    animationBegin={0}
                  />
                </LineChart>
              </ResponsiveContainer>
            </LazyChart>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-zinc-100 italic font-serif">Predictive Intelligence</h3>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <BrainCircuit className="text-emerald-500" size={16} />
            </div>
          </div>
          <div className="space-y-4">
            {alerts.filter(a => a.is_predictive).slice(0, 3).map(alert => (
              <div key={alert.id} className="group relative flex gap-3 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50 hover:border-emerald-500/30 transition-all">
                <div className={`mt-1 ${
                  alert.severity === 'critical' ? 'text-rose-500' : 
                  alert.severity === 'warning' ? 'text-yellow-500' : 
                  'text-blue-500'
                }`}>
                  <Activity size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-zinc-200">{alert.company_name}</p>
                    <span className="text-[8px] px-1 rounded bg-emerald-500/10 text-emerald-500 font-black uppercase">Forecast</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-zinc-600 font-bold uppercase">{alert.category}</span>
                    <div className="h-0.5 w-0.5 rounded-full bg-zinc-700" />
                    <span className="text-[9px] text-zinc-600 font-mono">Q3 2026</span>
                  </div>
                </div>
              </div>
            ))}
            {alerts.filter(a => a.is_predictive).length === 0 && (
              <p className="text-zinc-500 text-center py-10 text-sm italic">Scanning for predictive signals...</p>
            )}
            <button 
              onClick={() => { setActiveTab('alerts'); setAlertFilter('predictive'); }}
              className="w-full py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-emerald-400 transition-colors border-t border-zinc-800 mt-2"
            >
              View All Intelligence
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 italic font-serif">Borrower ESG Registry</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Advanced Multi-Filter Stacking</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Sparkles className={`absolute left-3 top-1/2 -translate-y-1/2 ${isNLProcessing ? 'text-emerald-500 animate-pulse' : 'text-zinc-500'}`} size={16} />
                <input 
                  type="text" 
                  placeholder="Ask AI: 'show low governance firms in APAC'..." 
                  value={nlQuery}
                  onChange={(e) => setNlQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNLSearch(nlQuery)}
                  className="bg-zinc-950 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none w-80 transition-all placeholder:text-zinc-600"
                />
                {isNLProcessing && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-emerald-500" size={14} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-zinc-800/50 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <Filter size={14} className="text-zinc-500" />
              <select 
                value={registryFilters.sector}
                onChange={(e) => setRegistryFilters(prev => ({ ...prev, sector: e.target.value }))}
                className="bg-transparent border-none text-xs text-zinc-300 outline-none cursor-pointer"
              >
                <option value="All">All Sectors</option>
                {Array.from(new Set(companies.map(c => c.sector))).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <Globe size={14} className="text-zinc-500" />
              <select 
                value={registryFilters.region}
                onChange={(e) => setRegistryFilters(prev => ({ ...prev, region: e.target.value }))}
                className="bg-transparent border-none text-xs text-zinc-300 outline-none cursor-pointer"
              >
                <option value="All">All Regions</option>
                {Array.from(new Set(companies.map(c => c.region))).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Score Range</span>
              <div className="flex items-center gap-2">
                <input 
                  type="range" min="0" max="100" 
                  value={registryFilters.scoreRange[0]}
                  onChange={(e) => setRegistryFilters(prev => ({ ...prev, scoreRange: [parseInt(e.target.value), prev.scoreRange[1]] }))}
                  className="w-20 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] font-mono text-zinc-400">{registryFilters.scoreRange[0]}-{registryFilters.scoreRange[1]}</span>
                <input 
                  type="range" min="0" max="100" 
                  value={registryFilters.scoreRange[1]}
                  onChange={(e) => setRegistryFilters(prev => ({ ...prev, scoreRange: [prev.scoreRange[0], parseInt(e.target.value)] }))}
                  className="w-20 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <button 
              onClick={() => setRegistryFilters({ 
                sector: 'All', 
                region: 'All', 
                scoreRange: [0, 100], 
                eRange: [0, 100], 
                sRange: [0, 100], 
                gRange: [0, 100], 
                search: '' 
              })}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest ml-auto"
            >
              Reset Filters
            </button>
            
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-widest ${showAdvancedFilters ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
            >
              <Settings size={12} />
              Advanced
            </button>
          </div>

          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-zinc-800/50 mb-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Environmental Range</span>
                      <span className="text-[10px] font-mono text-zinc-500">{registryFilters.eRange[0]}-{registryFilters.eRange[1]}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" min="0" max="100" 
                        value={registryFilters.eRange[0]}
                        onChange={(e) => setRegistryFilters(prev => ({ ...prev, eRange: [parseInt(e.target.value), prev.eRange[1]] }))}
                        className="flex-1 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <input 
                        type="range" min="0" max="100" 
                        value={registryFilters.eRange[1]}
                        onChange={(e) => setRegistryFilters(prev => ({ ...prev, eRange: [prev.eRange[0], parseInt(e.target.value)] }))}
                        className="flex-1 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Social Range</span>
                      <span className="text-[10px] font-mono text-zinc-500">{registryFilters.sRange[0]}-{registryFilters.sRange[1]}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" min="0" max="100" 
                        value={registryFilters.sRange[0]}
                        onChange={(e) => setRegistryFilters(prev => ({ ...prev, sRange: [parseInt(e.target.value), prev.sRange[1]] }))}
                        className="flex-1 accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <input 
                        type="range" min="0" max="100" 
                        value={registryFilters.sRange[1]}
                        onChange={(e) => setRegistryFilters(prev => ({ ...prev, sRange: [prev.sRange[0], parseInt(e.target.value)] }))}
                        className="flex-1 accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Governance Range</span>
                      <span className="text-[10px] font-mono text-zinc-500">{registryFilters.gRange[0]}-{registryFilters.gRange[1]}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" min="0" max="100" 
                        value={registryFilters.gRange[0]}
                        onChange={(e) => setRegistryFilters(prev => ({ ...prev, gRange: [parseInt(e.target.value), prev.gRange[1]] }))}
                        className="flex-1 accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <input 
                        type="range" min="0" max="100" 
                        value={registryFilters.gRange[1]}
                        onChange={(e) => setRegistryFilters(prev => ({ ...prev, gRange: [prev.gRange[0], parseInt(e.target.value)] }))}
                        className="flex-1 accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Saved Views</span>
            {savedViews.map(view => (
              <button
                key={view.id}
                onClick={() => setRegistryFilters(view.filters)}
                className="px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700 text-[10px] font-bold text-zinc-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
              >
                {view.name}
              </button>
            ))}
            <button 
              onClick={() => {
                const name = prompt('Enter a name for this view:');
                if (name) {
                  setSavedViews(prev => [...prev, { id: Date.now().toString(), name, filters: { ...registryFilters } }]);
                }
              }}
              className="p-1 text-zinc-600 hover:text-zinc-400"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold flex border-b border-zinc-800">
              <div className="px-6 py-4 w-[250px] cursor-pointer hover:text-zinc-300 transition-colors flex items-center" onClick={() => handleSort('name')}>
                Company <SortIcon columnKey="name" currentSort={sortConfig} />
              </div>
              <div className="px-6 py-4 w-[100px] cursor-pointer hover:text-zinc-300 transition-colors flex items-center" onClick={() => handleSort('ticker')}>
                Ticker <SortIcon columnKey="ticker" currentSort={sortConfig} />
              </div>
              <div className="px-6 py-4 w-[150px] cursor-pointer hover:text-zinc-300 transition-colors flex items-center" onClick={() => handleSort('sector')}>
                Sector <SortIcon columnKey="sector" currentSort={sortConfig} />
              </div>
              <div className="px-6 py-4 w-[120px] cursor-pointer hover:text-zinc-300 transition-colors flex items-center" onClick={() => handleSort('region')}>
                Region <SortIcon columnKey="region" currentSort={sortConfig} />
              </div>
              <div className="px-6 py-4 w-[120px]">E-Score</div>
              <div className="px-6 py-4 w-[120px]">S-Score</div>
              <div className="px-6 py-4 w-[120px]">G-Score</div>
              <div className="px-6 py-4 w-[120px] cursor-pointer hover:text-zinc-300 transition-colors flex items-center" onClick={() => handleSort('esg_adjusted_pd')}>
                PD (Adj.) <SortIcon columnKey="esg_adjusted_pd" currentSort={sortConfig} />
              </div>
              <div className="px-6 py-4 w-[120px] cursor-pointer hover:text-zinc-300 transition-colors flex items-center" onClick={() => handleSort(scenario === 'baseline' ? 'total_score' : 'stressed_score')}>
                {scenario === 'baseline' ? 'Overall' : 'Stressed'} <SortIcon columnKey={scenario === 'baseline' ? 'total_score' : 'stressed_score'} currentSort={sortConfig} />
              </div>
              <div className="px-6 py-4 w-[100px] cursor-pointer hover:text-zinc-300 transition-colors flex items-center" onClick={() => handleSort('confidence_score')}>
                Conf. <SortIcon columnKey="confidence_score" currentSort={sortConfig} />
              </div>
              <div className="px-6 py-4 flex-1"></div>
            </div>

            <div className="bg-zinc-900">
              {sortedCompanies.length > 0 ? (
                <List
                  rowCount={sortedCompanies.length}
                  rowHeight={72}
                  style={{ height: 600 }}
                  className="custom-scrollbar"
                  rowProps={{}}
                  rowComponent={({ index, style }) => {
                    const company = sortedCompanies[index];
                    const displayScore = scenario === 'baseline' ? company.total_score : company.stressed_score;
                    return (
                      <div 
                        style={style}
                        className="flex items-center hover:bg-zinc-800/40 transition-all cursor-pointer group border-l-2 border-transparent hover:border-emerald-500/50 border-b border-zinc-800/50"
                        onClick={async () => { 
                          try {
                            const res = await fetch(`/api/companies/${company.id}`);
                            const fullCompany = await res.json();
                            setSelectedCompany(fullCompany); 
                          } catch (e) {
                            setSelectedCompany(company); 
                          }
                          setActiveTab('company-detail');
                          setCompanyNews(null);
                        }}
                      >
                        <div className="px-6 py-4 w-[250px]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-all duration-300">
                              {company.name.charAt(0)}
                            </div>
                            <p className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">{company.name}</p>
                          </div>
                        </div>
                        <div className="px-6 py-4 w-[100px] text-xs font-mono text-zinc-500">{company.ticker}</div>
                        <div className="px-6 py-4 w-[150px] text-xs text-zinc-400 truncate">{company.sector}</div>
                        <div className="px-6 py-4 w-[120px] text-xs text-zinc-400">{company.region}</div>
                        <div className="px-6 py-4 w-[120px]"><ScoreProgressBar score={company.e_score} colorClass="bg-emerald-500" /></div>
                        <div className="px-6 py-4 w-[120px]"><ScoreProgressBar score={company.s_score} colorClass="bg-blue-500" /></div>
                        <div className="px-6 py-4 w-[120px]"><ScoreProgressBar score={company.g_score} colorClass="bg-purple-500" /></div>
                        <div className="px-6 py-4 w-[120px]">
                          {company.esg_adjusted_pd ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-200">{company.esg_adjusted_pd.toFixed(2)}%</span>
                              <span className={`text-[10px] ${company.esg_adjusted_pd > company.base_pd ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {company.esg_adjusted_pd > company.base_pd ? '+' : ''}{(company.esg_adjusted_pd - company.base_pd).toFixed(2)}% vs base
                              </span>
                            </div>
                          ) : <span className="text-xs text-zinc-500">N/A</span>}
                        </div>
                        <div className="px-6 py-4 w-[120px]">
                          {displayScore !== null && displayScore !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${scenario === 'baseline' ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                  style={{ width: `${displayScore}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${scenario === 'baseline' ? 'text-zinc-200' : 'text-rose-400'}`}>{displayScore.toFixed(0)}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-zinc-500 italic">N/A</span>
                          )}
                        </div>
                        <div className="px-6 py-4 w-[100px]">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${company.confidence_score > 0.8 ? 'bg-emerald-500' : company.confidence_score > 0.5 ? 'bg-yellow-500' : 'bg-rose-500'}`} />
                            <span className="text-[10px] font-bold text-zinc-400">{(company.confidence_score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="px-6 py-4 flex-1 text-right">
                          <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors inline-block" />
                        </div>
                      </div>
                    );
                  }}
                />
              ) : (
                <div className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Search size={32} className="text-zinc-800" />
                    <p className="text-zinc-500 text-sm italic">No companies match your current filter stack.</p>
                    <button 
                      onClick={() => setRegistryFilters({ 
                        sector: 'All', 
                        region: 'All', 
                        scoreRange: [0, 100], 
                        eRange: [0, 100], 
                        sRange: [0, 100], 
                        gRange: [0, 100], 
                        search: '' 
                      })}
                      className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="text-emerald-500" size={20} />
                <h3 className="text-lg font-bold text-zinc-100">Active Ingestion Jobs</h3>
              </div>
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded uppercase">
                Queue: {pipelineJobs.filter(j => j.status === 'Pending' || j.status === 'Processing').length} Active
              </span>
            </div>
            
            <div className="space-y-4">
              {pipelineJobs.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm italic">
                  No ingestion jobs in history.
                </div>
              ) : (
                pipelineJobs.map(job => (
                  <div key={job.id} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${
                          job.type === 'API' ? 'bg-blue-500/10 text-blue-500' : 
                          job.type === 'News' ? 'bg-emerald-500/10 text-emerald-500' : 
                          'bg-purple-500/10 text-purple-500'
                        }`}>
                          {job.type === 'API' ? <Database size={14} /> : job.type === 'News' ? <Newspaper size={14} /> : <FileText size={14} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-200">{job.source}</p>
                          <p className="text-[10px] text-zinc-500 font-mono uppercase">{job.type} Ingestion</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          job.status === 'Processing' ? 'bg-blue-500/10 text-blue-500 animate-pulse' :
                          job.status === 'Failed' ? 'bg-rose-500/10 text-rose-500' :
                          'bg-zinc-800 text-zinc-500'
                        }`}>
                          {job.status}
                        </span>
                        <p className="text-[8px] text-zinc-600 mt-1 font-mono">{new Date(job.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {job.status === 'Processing' && (
                      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
                        <motion.div 
                          className="h-full bg-blue-500"
                          initial={{ width: "0%" }}
                          animate={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                    
                    {job.result && (
                      <p className="text-[10px] text-zinc-500 italic mt-2 border-t border-zinc-800/50 pt-2">
                        {job.result}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
              <RefreshCw size={16} className="text-emerald-500" />
              Trigger Ingestion
            </h3>
            
            {!permissions.canIngest ? (
              <div className="py-12 flex flex-col items-center justify-center text-center bg-zinc-950/30 border border-dashed border-zinc-800 rounded-lg">
                <Lock className="text-zinc-700 mb-3" size={24} />
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Ingestion Restricted</p>
                <p className="text-[8px] text-zinc-600 mt-1 max-w-[120px]">Requires Analyst or Admin role.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg space-y-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase">API Sources</p>
                  {apiSources.map(source => (
                    <button 
                      key={source.id}
                      onClick={() => handleTriggerIngest('API', source.name)}
                      className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Database size={14} className="text-blue-500" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-zinc-200">{source.name}</p>
                          <p className="text-[8px] text-zinc-600 font-mono truncate max-w-[120px]">{source.endpoint}</p>
                        </div>
                      </div>
                      <Plus size={14} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg space-y-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase">Unstructured Data</p>
                  <button 
                    onClick={() => handleTriggerIngest('News', 'Global News Scraper')}
                    className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Newspaper size={14} className="text-emerald-500" />
                      <p className="text-xs font-bold text-zinc-200">News Scraping Pipeline</p>
                    </div>
                    <Plus size={14} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                  </button>
                  <button 
                    onClick={() => handleTriggerIngest('PDF', 'Annual Report Parser')}
                    className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={14} className="text-purple-500" />
                      <p className="text-xs font-bold text-zinc-200">PDF Parsing Automation</p>
                    </div>
                    <Plus size={14} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
            <h4 className="text-xs font-bold text-emerald-500 uppercase mb-3">Pipeline Health</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Worker Status</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  OPERATIONAL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Avg. Processing Time</span>
                <span className="text-[10px] font-mono text-zinc-300">5.2s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Success Rate</span>
                <span className="text-[10px] font-mono text-zinc-300">99.4%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompanyDetail = () => {
    if (!selectedCompany) return null;
    const radarData = [
      { subject: 'Environmental', A: selectedCompany.e_score || 0, fullMark: 100 },
      { subject: 'Social', A: selectedCompany.s_score || 0, fullMark: 100 },
      { subject: 'Governance', A: selectedCompany.g_score || 0, fullMark: 100 },
    ];

    const formatScore = (s: number | null) => s !== null ? s.toFixed(1) : 'N/A';

    return (
      <div className="space-y-6">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-2 mb-4"
        >
          ← Back to Dashboard
        </button>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-2xl">
                  {selectedCompany.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-zinc-100">{selectedCompany.name}</h2>
                  <div className="flex gap-4 mt-1">
                    <span className="text-zinc-500 text-sm flex items-center gap-1"><Globe size={14} /> {selectedCompany.region}</span>
                    <span className="text-zinc-500 text-sm flex items-center gap-1"><Building2 size={14} /> {selectedCompany.sector}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Overall Rating</p>
                <div className="text-4xl font-black text-emerald-500">{formatScore(selectedCompany.total_score)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-zinc-500 text-[10px] uppercase font-bold">Environmental</p>
                  <span className="text-[10px] text-zinc-500 font-mono">w: {(selectedCompany.weights?.e || 0.33).toFixed(2)}</span>
                </div>
                <div className="text-2xl font-bold text-zinc-100">{formatScore(selectedCompany.e_score)}</div>
                <div className="mt-2 h-1 w-full bg-zinc-700 rounded-full overflow-hidden">
                  {selectedCompany.e_score !== null && <div className="h-full bg-emerald-500" style={{ width: `${selectedCompany.e_score}%` }} />}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-zinc-500 text-[10px] uppercase font-bold">Social</p>
                  <span className="text-[10px] text-zinc-500 font-mono">w: {(selectedCompany.weights?.s || 0.33).toFixed(2)}</span>
                </div>
                <div className="text-2xl font-bold text-zinc-100">{formatScore(selectedCompany.s_score)}</div>
                <div className="mt-2 h-1 w-full bg-zinc-700 rounded-full overflow-hidden">
                  {selectedCompany.s_score !== null && <div className="h-full bg-blue-500" style={{ width: `${selectedCompany.s_score}%` }} />}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-zinc-500 text-[10px] uppercase font-bold">Governance</p>
                  <span className="text-[10px] text-zinc-500 font-mono">w: {(selectedCompany.weights?.g || 0.33).toFixed(2)}</span>
                </div>
                <div className="text-2xl font-bold text-zinc-100">{formatScore(selectedCompany.g_score)}</div>
                <div className="mt-2 h-1 w-full bg-zinc-700 rounded-full overflow-hidden">
                  {selectedCompany.g_score !== null && <div className="h-full bg-purple-500" style={{ width: `${selectedCompany.g_score}%` }} />}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 mb-8">
              <div className="flex-1">
                <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Data Confidence Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${selectedCompany.confidence_score > 0.8 ? 'bg-emerald-500' : 'bg-yellow-500'}`} 
                      style={{ width: `${selectedCompany.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-zinc-200">{(selectedCompany.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 max-w-[200px]">
                Based on disclosure completeness, third-party audits, and incident verification.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldAlert size={14} className="text-rose-500" />
                  Risk & Pricing Impact
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">ESG-Adjusted PD</p>
                      <p className="text-2xl font-bold text-zinc-100">{selectedCompany.esg_adjusted_pd?.toFixed(2)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Base PD</p>
                      <p className="text-sm font-medium text-zinc-400">{selectedCompany.base_pd?.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-800" />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Loan Spread (Adj.)</p>
                      <p className="text-xl font-bold text-emerald-400">{selectedCompany.loan_spread_bps} bps</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Base Spread</p>
                      <p className="text-sm font-medium text-zinc-400">{selectedCompany.base_spread_bps} bps</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`px-2 py-1 rounded text-[10px] font-bold ${selectedCompany.total_score && selectedCompany.total_score > 60 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {selectedCompany.total_score && selectedCompany.total_score > 60 ? 'ESG DISCOUNT APPLIED' : 'ESG PENALTY APPLIED'}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      Adj: {selectedCompany.loan_spread_bps - selectedCompany.base_spread_bps > 0 ? '+' : ''}{selectedCompany.loan_spread_bps - selectedCompany.base_spread_bps} bps
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-yellow-500" />
                  Covenant Risk Flags
                </h4>
                <div className="space-y-2">
                  {selectedCompany.e_score && selectedCompany.e_score < 40 && (
                    <div className="flex items-center justify-between p-2 rounded bg-rose-500/5 border border-rose-500/20">
                      <span className="text-[11px] text-rose-400 font-medium">Emissions Breach Risk</span>
                      <span className="text-[10px] bg-rose-500 text-zinc-950 px-1.5 py-0.5 rounded font-bold">HIGH</span>
                    </div>
                  )}
                  {selectedCompany.g_score && selectedCompany.g_score < 50 && (
                    <div className="flex items-center justify-between p-2 rounded bg-yellow-500/5 border border-yellow-500/20">
                      <span className="text-[11px] text-yellow-400 font-medium">Governance Covenant Risk</span>
                      <span className="text-[10px] bg-yellow-500 text-zinc-950 px-1.5 py-0.5 rounded font-bold">MED</span>
                    </div>
                  )}
                  {(!selectedCompany.e_score || selectedCompany.e_score >= 40) && (!selectedCompany.g_score || selectedCompany.g_score >= 50) && (
                    <div className="flex items-center justify-center h-20 text-zinc-600 text-xs italic">
                      No active covenant risk flags detected.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">AI Analysis Summary</h4>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setOverrideForm({
                        e: selectedCompany.e_score || 50,
                        s: selectedCompany.s_score || 50,
                        g: selectedCompany.g_score || 50,
                        reason: ''
                      });
                      setIsOverriding(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-amber-500 rounded-lg transition-all border border-amber-500/20"
                  >
                    <RefreshCw size={14} />
                    Analyst Override
                  </button>
                  <button 
                    onClick={() => handleFetchNews(selectedCompany.name)}
                    disabled={isFetchingNews}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-bold text-emerald-500 rounded-lg transition-all border border-emerald-500/20"
                  >
                    {isFetchingNews ? <Loader2 size={14} className="animate-spin" /> : <Newspaper size={14} />}
                    {isFetchingNews ? 'Fetching News...' : 'Fetch ESG News'}
                  </button>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {selectedCompany.total_score !== null ? (
                  <>
                    {selectedCompany.name} shows strong performance in governance metrics with transparent reporting structures. 
                    Environmental risks are moderate due to sector-specific carbon intensity, but mitigation strategies are in place. 
                    Social scores reflect industry-leading labor practices and community engagement initiatives.
                  </>
                ) : (
                  <>ESG analysis for {selectedCompany.name} is currently pending. Please upload relevant disclosures or news reports to trigger the AI scoring engine.</>
                )}
              </p>
            </div>

            {/* Pricing Sensitivity Simulator */}
            <div className="mt-8 pt-8 border-t border-zinc-800">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="text-emerald-500" size={18} />
                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Pricing Sensitivity Simulator</h4>
              </div>
              
              <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span className="text-emerald-500">Environmental</span>
                      <span className="text-zinc-400">{simulatedScores.e.toFixed(0)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={simulatedScores.e} 
                      onChange={(e) => setSimulatedScores(prev => ({ ...prev, e: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span className="text-blue-500">Social</span>
                      <span className="text-zinc-400">{simulatedScores.s.toFixed(0)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={simulatedScores.s} 
                      onChange={(e) => setSimulatedScores(prev => ({ ...prev, s: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span className="text-purple-500">Governance</span>
                      <span className="text-zinc-400">{simulatedScores.g.toFixed(0)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={simulatedScores.g} 
                      onChange={(e) => setSimulatedScores(prev => ({ ...prev, g: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Simulated ESG-Linked Spread</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-400">{simulatedSpread} bps</span>
                      <span className="text-xs text-zinc-500">({simulatedTotalScore.toFixed(1)} Overall)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Pricing Delta</p>
                      <p className={`text-sm font-bold ${simulatedSpread < selectedCompany.base_spread_bps ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {simulatedSpread - selectedCompany.base_spread_bps > 0 ? '+' : ''}{simulatedSpread - selectedCompany.base_spread_bps} bps vs Base
                      </p>
                    </div>
                    <button 
                      onClick={handleTriggerStressSim}
                      disabled={isStressSimulating}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase text-zinc-400 hover:text-emerald-400 transition-all group"
                    >
                      {isStressSimulating ? (
                        <Loader2 size={14} className="animate-spin text-emerald-500" />
                      ) : (
                        <Zap size={14} className="group-hover:text-emerald-500" />
                      )}
                      Stress Test Portfolio
                    </button>
                  </div>
                </div>

                {showStressResults && simulatedPortfolioImpact && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} />
                        Portfolio Stress Impact: {stressScenarios.find(s => s.id === stressScenario)?.name || 'Carbon Tax Surge'}
                      </h5>
                      <button onClick={() => setShowStressResults(false)} className="text-zinc-500 hover:text-zinc-300">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                        <p className="text-[8px] text-zinc-500 uppercase font-bold mb-1">Projected Loss</p>
                        <p className="text-sm font-black text-rose-500">${Math.abs(simulatedPortfolioImpact.loss * 1000)}M</p>
                      </div>
                      <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                        <p className="text-[8px] text-zinc-500 uppercase font-bold mb-1">Exposure (VaR)</p>
                        <p className="text-sm font-black text-zinc-100">${simulatedPortfolioImpact.newVaR.toFixed(1)}B</p>
                      </div>
                      <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                        <p className="text-[8px] text-zinc-500 uppercase font-bold mb-1">Risk Increase</p>
                        <p className="text-sm font-black text-yellow-500">+{simulatedPortfolioImpact.riskIncrease}%</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <p className="text-[10px] text-zinc-500 italic">
                  * This simulation uses the {selectedCompany.sector} sector weighting model: 
                  E({(selectedCompany.weights?.e || 0) * 100}%), 
                  S({(selectedCompany.weights?.s || 0) * 100}%), 
                  G({(selectedCompany.weights?.g || 0) * 100}%).
                </p>
              </div>
            </div>

            {/* News Section */}
            {isOverriding && (
              <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      <RefreshCw className="text-amber-500" size={20} />
                      Analyst Score Override
                    </h3>
                    <button onClick={() => setIsOverriding(false)} className="text-zinc-500 hover:text-zinc-300">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-emerald-500 uppercase">E-Score</label>
                        <input 
                          type="number" min="0" max="100"
                          value={overrideForm.e}
                          onChange={(e) => setOverrideForm(prev => ({ ...prev, e: parseInt(e.target.value) }))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-blue-500 uppercase">S-Score</label>
                        <input 
                          type="number" min="0" max="100"
                          value={overrideForm.s}
                          onChange={(e) => setOverrideForm(prev => ({ ...prev, s: parseInt(e.target.value) }))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-purple-500 uppercase">G-Score</label>
                        <input 
                          type="number" min="0" max="100"
                          value={overrideForm.g}
                          onChange={(e) => setOverrideForm(prev => ({ ...prev, g: parseInt(e.target.value) }))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Reason for Override</label>
                      <textarea 
                        value={overrideForm.reason}
                        onChange={(e) => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Explain why the AI-generated score is being adjusted..."
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setIsOverriding(false)}
                        className="flex-1 py-2 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-lg font-bold text-sm transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleOverride}
                        disabled={!overrideForm.reason}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 rounded-lg font-bold text-sm transition-all"
                      >
                        Confirm Override
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* News Section */}
            {(companyNews || isFetchingNews) && (
              <div className="mt-8 pt-8 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="text-emerald-500" size={18} />
                  <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Recent ESG News & Intelligence</h4>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
                  {isFetchingNews ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="animate-spin text-emerald-500" size={32} />
                      <p className="text-zinc-500 text-sm animate-pulse">Scanning global news sources for ESG signals...</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {newsSummary && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="text-emerald-500" size={16} />
                            <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">AI Risk & Opportunity Summary</h5>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed markdown-body">
                            <Markdown>{newsSummary}</Markdown>
                          </div>
                        </div>
                      )}
                      
                      <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed markdown-body">
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                          <Newspaper size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Raw Intelligence Feed</span>
                        </div>
                        <Markdown>{companyNews}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Methodology & Audit Trail */}
            <div className="mt-8 pt-8 border-t border-zinc-800">
              <div className="flex items-center gap-2 mb-6">
                <Fingerprint className="text-emerald-500" size={18} />
                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Methodology & Audit Trail</h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-6">
                    <h5 className="text-[10px] font-bold text-zinc-500 uppercase mb-4 flex items-center gap-2">
                      <FileText size={12} className="text-emerald-500" />
                      Scoring Methodology & Reasoning
                    </h5>
                    <div className="space-y-4">
                      <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800">
                        <p className="text-xs text-zinc-400 leading-relaxed italic">
                          "{selectedCompany.reasoning || 'No automated reasoning available for this snapshot.'}"
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-zinc-900/30 rounded border border-zinc-800/50">
                          <p className="text-[8px] text-zinc-500 uppercase font-bold">E-Weight</p>
                          <p className="text-xs font-mono text-emerald-500">{(selectedCompany.weights?.e || 0) * 100}%</p>
                        </div>
                        <div className="text-center p-2 bg-zinc-900/30 rounded border border-zinc-800/50">
                          <p className="text-[8px] text-zinc-500 uppercase font-bold">S-Weight</p>
                          <p className="text-xs font-mono text-blue-500">{(selectedCompany.weights?.s || 0) * 100}%</p>
                        </div>
                        <div className="text-center p-2 bg-zinc-900/30 rounded border border-zinc-800/50">
                          <p className="text-[8px] text-zinc-500 uppercase font-bold">G-Weight</p>
                          <p className="text-xs font-mono text-purple-500">{(selectedCompany.weights?.g || 0) * 100}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-6">
                    <h5 className="text-[10px] font-bold text-zinc-500 uppercase mb-4 flex items-center gap-2">
                      <History size={12} className="text-emerald-500" />
                      Historical ESG Snapshots
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-zinc-500 border-b border-zinc-800">
                            <th className="text-left pb-2">Date</th>
                            <th className="text-center pb-2">E</th>
                            <th className="text-center pb-2">S</th>
                            <th className="text-center pb-2">G</th>
                            <th className="text-right pb-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {selectedCompany.snapshots?.map((s, idx) => (
                            <tr key={idx} className="text-zinc-400 hover:text-zinc-200 transition-colors">
                              <td className="py-2">{new Date(s.timestamp).toLocaleDateString()}</td>
                              <td className="text-center py-2">{s.e_score.toFixed(0)}</td>
                              <td className="text-center py-2">{s.s_score.toFixed(0)}</td>
                              <td className="text-center py-2">{s.g_score.toFixed(0)}</td>
                              <td className="text-right py-2 font-bold text-emerald-500">{s.total_score.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-6">
                  <h5 className="text-[10px] font-bold text-zinc-500 uppercase mb-4 flex items-center gap-2">
                    <Fingerprint size={12} className="text-emerald-500" />
                    System Audit Log
                  </h5>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedCompany.audit_logs?.map((log, idx) => (
                      <div key={idx} className="relative pl-4 border-l border-zinc-800 py-1">
                        <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-zinc-700 border border-zinc-950" />
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-bold text-zinc-300">{log.action}</p>
                          <span className="text-[8px] text-zinc-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mb-1">{log.details}</p>
                        <p className="text-[9px] text-emerald-500/70 font-mono">User: {log.user_email}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6">ESG Profile</h3>
              <div className="h-64">
                <LazyChart height="100%">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#3f3f46" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
                      <Radar
                        name={selectedCompany.name}
                        dataKey="A"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </LazyChart>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">Risk Flags</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-400/5 p-2 rounded border border-rose-400/10">
                  <ShieldAlert size={14} />
                  <span>Supply chain carbon audit pending</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/5 p-2 rounded border border-yellow-400/10">
                  <ShieldAlert size={14} />
                  <span>Board diversity below target (20%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
              <h3 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
                <UserCircle className="text-emerald-500" size={20} />
                User Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Full Name</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={user?.name}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Email Address</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={user?.email}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Organization Role</label>
                  <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-xs font-bold inline-block">
                    {user?.role}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
              <h3 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
                <Bell className="text-emerald-500" size={20} />
                Notification Preferences
              </h3>
              <div className="space-y-4">
                {[
                  { id: 'critical', label: 'Critical ESG Alerts', desc: 'Immediate notification for severe risk signals.' },
                  { id: 'daily', label: 'Daily Portfolio Summary', desc: 'Consolidated report of all portfolio movements.' },
                  { id: 'pipeline', label: 'Pipeline Completion', desc: 'Alert when AI ingestion jobs are finished.' }
                ].map(pref => (
                  <div key={pref.id} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{pref.label}</h4>
                      <p className="text-[10px] text-zinc-500">{pref.desc}</p>
                    </div>
                    <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-zinc-950 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                Security & Access
              </h3>
              <div className="space-y-4">
                <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-all">
                  Change Password
                </button>
                <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-all">
                  Enable 2FA
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Database size={16} className="text-emerald-500" />
                Data Management
              </h3>
              <div className="space-y-4 text-[10px] text-zinc-500 leading-relaxed">
                <p>Last Data Sync: <span className="text-zinc-300 font-mono">{new Date().toLocaleDateString()}</span></p>
                <p>Storage Used: <span className="text-zinc-300 font-mono">1.2 GB / 10 GB</span></p>
                <button className="w-full mt-2 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold rounded-lg transition-all">
                  Clear Local Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="text-emerald-500 animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-200 flex font-sans selection:bg-emerald-500/30 ${presentationMode ? 'presentation-mode' : ''}`}>
      {/* Sidebar */}
      {!presentationMode && (
        <aside className="w-64 border-r border-zinc-800 flex flex-col p-6 fixed h-full bg-zinc-950 z-20">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-zinc-950" size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-zinc-100">FESGA</h1>
          </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Overview" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={Activity} 
            label="Model Health" 
            active={activeTab === 'monitoring'} 
            onClick={() => setActiveTab('monitoring')} 
          />
          <SidebarItem 
            icon={Building2} 
            label="Borrowers" 
            active={activeTab === 'companies'} 
            onClick={() => setActiveTab('companies')} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Documents" 
            active={activeTab === 'documents'} 
            onClick={() => setActiveTab('documents')} 
          />
          <SidebarItem 
            icon={PieChart} 
            label="Portfolio" 
            active={activeTab === 'portfolio'} 
            onClick={() => setActiveTab('portfolio')} 
          />
          <SidebarItem 
            icon={AlertTriangle} 
            label="Alerts" 
            active={activeTab === 'alerts'} 
            onClick={() => setActiveTab('alerts')} 
          />
          {user?.role === 'Admin' && (
            <SidebarItem 
              icon={Cpu} 
              label="Pipeline" 
              active={activeTab === 'pipeline'} 
              onClick={() => setActiveTab('pipeline')} 
            />
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-800">
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')} 
          />
          <div className="mt-6">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <UserCircle size={20} />
              </div>
              <div className="overflow-hidden text-left flex-1">
                <p className="text-xs font-bold text-zinc-200 truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-tighter">
                  {user?.role}
                </p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2 text-zinc-500 hover:text-rose-400 transition-colors text-sm"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    )}

      {/* Main Content */}
      <main className={`flex-1 ${presentationMode ? 'ml-0 max-w-6xl mx-auto' : 'ml-64'} p-8 transition-all duration-500`} id="main-content">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className={`font-bold text-zinc-100 capitalize ${presentationMode ? 'text-4xl mb-2' : 'text-2xl'}`}>{activeTab.replace('-', ' ')}</h2>
            <p className="text-zinc-500 text-sm mt-1">Institutional ESG Risk Intelligence & Credit Pricing.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Export & Presentation Controls */}
            <div className="flex items-center gap-2 mr-4 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <button 
                onClick={handleExportPDF}
                disabled={isExporting}
                title="Export PDF Report"
                className="p-2 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 transition-colors"
              >
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
              </button>
              <button 
                onClick={handleExportExcel}
                title="Export Excel Data"
                className="p-2 text-zinc-400 hover:text-blue-400 transition-colors"
              >
                <FileSpreadsheet size={18} />
              </button>
              <div className="w-px h-4 bg-zinc-800 mx-1" />
              <button 
                onClick={() => setPresentationMode(!presentationMode)}
                title="Toggle Presentation Mode"
                className={`p-2 transition-all ${presentationMode ? 'text-emerald-400 scale-110' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Presentation size={18} />
              </button>
            </div>

            <button className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
              <Search size={20} />
            </button>
            {permissions.canAnalyzeDocs && (
              <button 
                onClick={handleNewAnalysis}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2 rounded-lg font-bold text-sm transition-all"
              >
                <Plus size={18} />
                New Analysis
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'monitoring' && renderModelMonitoring()}
                {activeTab === 'company-detail' && renderCompanyDetail()}
                {activeTab === 'companies' && renderDashboard()}
                {activeTab === 'pipeline' && permissions.canViewPipeline && renderPipeline()}
                {activeTab === 'settings' && renderSettings()}
                {activeTab === 'documents' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {!permissions.canAnalyzeDocs ? (
                      <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-zinc-950 flex items-center justify-center mb-6">
                          <Lock className="text-zinc-700" size={32} />
                        </div>
                        <h4 className="text-zinc-300 font-bold mb-2">Document Analysis Restricted</h4>
                        <p className="text-zinc-500 text-xs max-w-sm">
                          Your role ({user?.role}) is restricted from processing new documents. Auditor and Risk Manager roles have read-only access to existing reports.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-zinc-100 mb-4 italic font-serif flex items-center gap-2">
                        <Sparkles className="text-emerald-500" size={20} />
                        AI Document Analyzer
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Select Borrower</label>
                          <select 
                            value={targetCompanyId}
                            onChange={(e) => setTargetCompanyId(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">Choose a company...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Document Content</label>
                          <textarea 
                            value={docContent}
                            onChange={(e) => setDocContent(e.target.value)}
                            className="w-full h-64 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Paste disclosure text, news article, or regulatory filing here..."
                          />
                        </div>
                        <button 
                          onClick={handleProcessDocument}
                          disabled={isProcessing || !docContent || !targetCompanyId}
                          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="animate-spin" size={18} />
                              Analyzing with Gemini...
                            </>
                          ) : (
                            <>
                              <Sparkles size={18} />
                              Process with Gemini AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-zinc-100 mb-4 italic font-serif">Analysis Result</h3>
                      {analysisResult ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">E-Score</p>
                              <p className="text-xl font-bold text-emerald-500">{analysisResult.e_score}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">S-Score</p>
                              <p className="text-xl font-bold text-blue-500">{analysisResult.s_score}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">G-Score</p>
                              <p className="text-xl font-bold text-purple-500">{analysisResult.g_score}</p>
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="text-emerald-500" size={16} />
                              <h4 className="text-xs font-bold text-zinc-200 uppercase">AI Summary</h4>
                            </div>
                            <p className="text-sm text-zinc-400 leading-relaxed italic">
                              "{analysisResult.summary}"
                            </p>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                            <span className="text-xs text-zinc-500">AI Confidence Level</span>
                            <span className="text-xs font-bold text-emerald-500">{(analysisResult.confidence * 100).toFixed(0)}%</span>
                          </div>

                          <button 
                            onClick={handleApplyScores}
                            disabled={isApplyingScores}
                            className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                          >
                            {isApplyingScores ? (
                              <>
                                <Loader2 className="animate-spin" size={14} />
                                Applying...
                              </>
                            ) : (
                              'Apply Scores to Borrower Profile'
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20">
                          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                            <FileText className="text-zinc-600" size={24} />
                          </div>
                          <p className="text-zinc-500 text-sm max-w-[200px]">
                            Analysis results will appear here after processing the document.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            {activeTab === 'portfolio' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                              <Zap className="text-yellow-500" size={20} />
                              <h3 className="text-lg font-bold text-zinc-100">ESG Stress Testing Module</h3>
                            </div>
                            <div className="flex gap-2">
                              {stressScenarios.map(s => (
                                <button
                                  key={s.id}
                                  disabled={!permissions.canStressTest}
                                  onClick={() => setStressScenario(s.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${stressScenario === s.id ? 'bg-zinc-100 text-zinc-950 shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                >
                                  {s.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {!permissions.canStressTest ? (
                            <div className="h-80 flex flex-col items-center justify-center text-center p-12 bg-zinc-950/30 border border-dashed border-zinc-800 rounded-xl">
                              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                                <Lock className="text-zinc-700" size={32} />
                              </div>
                              <h4 className="text-zinc-300 font-bold mb-2">Access Restricted</h4>
                              <p className="text-zinc-500 text-xs max-w-sm">
                                Your current role ({user?.role}) does not have permission to perform portfolio stress testing. Please contact an administrator.
                              </p>
                            </div>
                          ) : !stressScenario ? (
                            <div className="h-80 flex flex-col items-center justify-center text-center p-12 bg-zinc-950/30 border border-dashed border-zinc-800 rounded-xl">
                              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                                <Zap className="text-zinc-700" size={32} />
                              </div>
                              <h4 className="text-zinc-300 font-bold mb-2">Select a Stress Scenario</h4>
                              <p className="text-zinc-500 text-xs max-w-sm">
                                Simulate how extreme ESG events would impact your portfolio's risk-weighted assets and credit spreads.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Projected Loss (VaR)</p>
                                  <p className="text-2xl font-black text-rose-500">${Math.abs(simulatedPortfolioImpact?.loss || 0) * 1000}M</p>
                                  <p className="text-[10px] text-zinc-600 mt-1">95% Confidence Interval</p>
                                </div>
                                <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Risk-Adj. Exposure</p>
                                  <p className="text-2xl font-black text-zinc-100">${simulatedPortfolioImpact?.newVaR.toFixed(1)}B</p>
                                  <p className="text-[10px] text-zinc-600 mt-1">Base: $4.2B</p>
                                </div>
                                <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Capital Buffer Hit</p>
                                  <p className="text-2xl font-black text-yellow-500">+{simulatedPortfolioImpact?.riskIncrease}%</p>
                                  <p className="text-[10px] text-zinc-600 mt-1">Regulatory Capital Impact</p>
                                </div>
                              </div>

                              <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Portfolio Exposure Shift (VaR)</h4>
                                  <div className="flex items-center gap-4 text-[10px] font-bold">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Baseline</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Stressed</div>
                                  </div>
                                </div>
                                <div className="h-64">
                                  <LazyChart height="100%">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={[
                                        { name: 'Energy', base: 400, stressed: 580 },
                                        { name: 'Tech', base: 300, stressed: 340 },
                                        { name: 'Finance', base: 200, stressed: 280 },
                                        { name: 'Transport', base: 278, stressed: 410 },
                                        { name: 'Retail', base: 180, stressed: 220 },
                                      ]}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                                        <YAxis stroke="#71717a" fontSize={10} />
                                        <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                                        <Bar dataKey="base" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="stressed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </LazyChart>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6">Sector Exposure</h3>
                          <div className="h-64">
                            <LazyChart height="100%">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                  { name: 'Energy', value: 400 },
                                  { name: 'Tech', value: 300 },
                                  { name: 'Finance', value: 200 },
                                  { name: 'Transport', value: 278 },
                                ]}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                  <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                                  <YAxis stroke="#71717a" fontSize={10} />
                                  <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </LazyChart>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <BarChart3 size={16} className="text-emerald-500" />
                            Scenario Intelligence
                          </h3>
                          <div className="space-y-4">
                            {stressScenarios.map(s => (
                              <div 
                                key={s.id} 
                                onClick={() => setStressScenario(s.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${stressScenario === s.id ? 'bg-zinc-100 border-zinc-100' : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'}`}
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <s.icon size={18} className={stressScenario === s.id ? 'text-zinc-950' : s.color} />
                                  <h4 className={`text-xs font-bold ${stressScenario === s.id ? 'text-zinc-950' : 'text-zinc-200'}`}>{s.name}</h4>
                                </div>
                                <p className={`text-[10px] leading-relaxed ${stressScenario === s.id ? 'text-zinc-700' : 'text-zinc-500'}`}>
                                  {s.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6">Regional Risk Distribution</h3>
                          <div className="h-64">
                            <LazyChart height="100%">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                  { subject: 'Europe', A: 120, fullMark: 150 },
                                  { subject: 'N. America', A: 98, fullMark: 150 },
                                  { subject: 'Asia', A: 86, fullMark: 150 },
                                  { subject: 'S. America', A: 99, fullMark: 150 },
                                  { subject: 'Africa', A: 85, fullMark: 150 },
                                ]}>
                                  <PolarGrid stroke="#3f3f46" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
                                  <Radar name="Risk" dataKey="A" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.4} />
                                </RadarChart>
                              </ResponsiveContainer>
                            </LazyChart>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Benchmarking Engine */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <BarChart3 className="text-emerald-500" size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-zinc-100 italic font-serif">ESG Benchmarking Engine</h3>
                            <p className="text-xs text-zinc-500">Peer comparison, regional rankings, and historical performance trends.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex bg-zinc-800 p-1 rounded-lg">
                            <button 
                              onClick={() => setBenchmarkMode('Sector')}
                              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${benchmarkMode === 'Sector' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                            >
                              Sector
                            </button>
                            <button 
                              onClick={() => setBenchmarkMode('Region')}
                              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${benchmarkMode === 'Region' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                            >
                              Region
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-3 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`bg-zinc-950/50 border p-6 rounded-2xl flex flex-col items-center transition-all ${benchmarkMode === 'Sector' ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-zinc-800'}`}>
                              <PercentileGauge value={78} label="Sector Percentile" />
                              <p className="text-[10px] text-zinc-500 text-center mt-4 leading-relaxed">
                                Portfolio is outperforming <span className="text-emerald-400 font-bold">78%</span> of peers in the <span className="text-zinc-300">Energy</span> sector.
                              </p>
                            </div>
                            <div className={`bg-zinc-950/50 border p-6 rounded-2xl flex flex-col items-center transition-all ${benchmarkMode === 'Region' ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-zinc-800'}`}>
                              <PercentileGauge value={62} label="Regional Percentile" />
                              <p className="text-[10px] text-zinc-500 text-center mt-4 leading-relaxed">
                                Portfolio is outperforming <span className="text-emerald-400 font-bold">62%</span> of peers in <span className="text-zinc-300">Europe</span>.
                              </p>
                            </div>
                            <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center">
                              <PercentileGauge value={89} label="Governance Rank" />
                              <p className="text-[10px] text-zinc-500 text-center mt-4 leading-relaxed">
                                Top <span className="text-emerald-400 font-bold">11%</span> globally for governance transparency and board structure.
                              </p>
                            </div>
                          </div>

                          <div className="bg-zinc-950/30 border border-zinc-800 rounded-xl p-6">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Historical Trend Comparison (Portfolio vs {benchmarkMode} Benchmark)</h4>
                            <div className="h-64">
                              <LazyChart height="100%">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={[
                                    { month: 'Jan', portfolio: 58, benchmark: 52 },
                                    { month: 'Feb', portfolio: 61, benchmark: 53 },
                                    { month: 'Mar', portfolio: 60, benchmark: 53 },
                                    { month: 'Apr', portfolio: 65, benchmark: 54 },
                                    { month: 'May', portfolio: 69, benchmark: 55 },
                                    { month: 'Jun', portfolio: 72, benchmark: 56 },
                                  ]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="month" stroke="#71717a" fontSize={10} />
                                    <YAxis stroke="#71717a" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                                    <Line type="monotone" dataKey="portfolio" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                                    <Line type="monotone" dataKey="benchmark" stroke="#71717a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </LazyChart>
                            </div>
                            <div className="flex justify-center gap-6 mt-4">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                                <div className="w-3 h-0.5 bg-emerald-500" /> Portfolio ESG
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                                <div className="w-3 h-0.5 bg-zinc-500 border-dashed" /> {benchmarkMode} Avg.
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">
                              {benchmarkMode} Leaders ({benchmarkMode === 'Sector' ? 'Energy' : 'Europe'})
                            </h4>
                            <div className="space-y-4">
                              {companies
                                .filter(c => benchmarkMode === 'Sector' ? c.sector === 'Energy' : c.region === 'Europe')
                                .sort((a,b) => (b.total_score || 0) - (a.total_score || 0))
                                .slice(0, 3)
                                .map((leader, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-zinc-600">#{i+1}</span>
                                    <span className="text-xs font-bold text-zinc-200">{leader.name}</span>
                                  </div>
                                  <span className="text-xs font-black text-emerald-500">{leader.total_score?.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                            <button 
                              onClick={() => setShowLeaderboard(true)}
                              className="w-full mt-6 py-2 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase rounded-lg transition-all"
                            >
                              View Full Leaderboard
                            </button>
                          </div>

                          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">{benchmarkMode} Benchmarks</h4>
                            <div className="space-y-3">
                              {benchmarks.filter(b => b.category_type === benchmarkMode).map((bench, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase">{bench.category_name}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-zinc-600" style={{ width: `${bench.avg_total}%` }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-400">{bench.avg_total.toFixed(1)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-6">
                            <h4 className="text-[10px] font-bold text-emerald-500 uppercase mb-4">Benchmarking Insight</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                              "Your portfolio's <span className="text-emerald-400 font-bold">Governance</span> score is significantly higher than the sector average, reducing overall credit risk by an estimated <span className="text-zinc-200 font-bold">12 bps</span> compared to peers."
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'alerts' && (
                  <div className="space-y-6">
                    {/* Alert Intelligence Controls */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <BrainCircuit className="text-emerald-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100 italic font-serif">Alert Intelligence</h3>
                          <p className="text-[10px] text-zinc-500">AI-clustered signals and predictive risk forecasting</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-zinc-800 p-1 rounded-lg">
                          {(['all', 'predictive', 'reactive'] as const).map(type => (
                            <button 
                              key={type}
                              onClick={() => setAlertFilter(type)}
                              className={`px-3 py-1 text-[10px] font-bold rounded transition-all capitalize ${alertFilter === type ? 'bg-zinc-700 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        
                        <div className="h-6 w-px bg-zinc-800 mx-1" />
                        
                        <div className="flex items-center gap-2">
                          <Filter size={14} className="text-zinc-500" />
                          <select 
                            value={alertCategoryFilter}
                            onChange={(e) => setAlertCategoryFilter(e.target.value)}
                            className="bg-zinc-800 border-none text-[10px] font-bold text-zinc-300 rounded px-2 py-1 outline-none cursor-pointer hover:bg-zinc-700 transition-colors"
                          >
                            <option>All</option>
                            <option>Environmental</option>
                            <option>Social</option>
                            <option>Governance</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Alert Clusters */}
                    <div className="space-y-4">
                      {clusteredAlerts.length === 0 ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 rounded-full bg-zinc-950 flex items-center justify-center mb-4">
                            <CheckCircle2 className="text-zinc-700" size={24} />
                          </div>
                          <p className="text-zinc-500 text-sm">No active alerts matching your filters.</p>
                        </div>
                      ) : (
                        clusteredAlerts.map(cluster => (
                          <motion.div 
                            layout
                            key={cluster.id} 
                            className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${
                              cluster.maxSeverity === 'critical' ? 'border-rose-500/30' : 
                              cluster.maxSeverity === 'warning' ? 'border-yellow-500/30' : 
                              'border-zinc-800'
                            }`}
                          >
                            <div className="p-5 flex items-start gap-4">
                              <div className={`p-3 rounded-xl ${
                                cluster.maxSeverity === 'critical' ? 'bg-rose-500/10 text-rose-500' : 
                                cluster.maxSeverity === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 
                                'bg-blue-500/10 text-blue-500'
                              }`}>
                                {cluster.maxSeverity === 'critical' ? <ShieldAlert size={24} /> : 
                                 cluster.maxSeverity === 'warning' ? <AlertTriangle size={24} /> : 
                                 <Activity size={24} />}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-zinc-100">{cluster.company}</h4>
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                      {cluster.category}
                                    </span>
                                    {cluster.isPredictive && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                        <BrainCircuit size={10} />
                                        Predictive
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {cluster.alerts.length} signal{cluster.alerts.length > 1 ? 's' : ''} clustered
                                  </span>
                                </div>
                                
                                <div className="space-y-3 mt-4">
                                  {cluster.alerts.map((alert, idx) => (
                                    <div key={alert.id} className={`pl-4 border-l-2 ${idx === 0 ? 'border-emerald-500/50' : 'border-zinc-800'}`}>
                                      <p className="text-sm text-zinc-300 leading-relaxed">{alert.message}</p>
                                      <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">
                                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <div className="h-1 w-1 rounded-full bg-zinc-700" />
                                        <span className={`text-[9px] font-bold uppercase ${
                                          alert.severity === 'critical' ? 'text-rose-400' : 
                                          alert.severity === 'warning' ? 'text-yellow-400' : 
                                          'text-blue-400'
                                        }`}>
                                          {alert.severity}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-800/50">
                                  <button 
                                    disabled={isInvestigating === cluster.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setIsInvestigating(cluster.id);
                                      try {
                                        const res = await fetch(`/api/companies/${cluster.companyId}`);
                                        if (res.ok) {
                                          const fullCompany = await res.json();
                                          setSelectedCompany(fullCompany);
                                          setActiveTab('company-detail');
                                          setCompanyNews(null);
                                        }
                                      } catch (error) {
                                        console.error("Failed to investigate cluster", error);
                                      } finally {
                                        setIsInvestigating(null);
                                      }
                                    }}
                                    className="px-4 py-1.5 bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase rounded-lg hover:bg-emerald-400 transition-all flex items-center gap-2 disabled:opacity-50"
                                  >
                                    {isInvestigating === cluster.id ? <Loader2 size={12} className="animate-spin" /> : null}
                                    Investigate Cluster
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setAlerts(prev => prev.filter(a => !cluster.alerts.some(ca => ca.id === a.id)));
                                    }}
                                    className="px-4 py-1.5 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase rounded-lg hover:bg-zinc-800 transition-all"
                                  >
                                    Dismiss All
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaderboard(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-emerald-500" size={20} />
                  <h2 className="text-lg font-bold text-zinc-100 italic font-serif">Sector Leaderboard: Energy</h2>
                </div>
                <button onClick={() => setShowLeaderboard(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500">
                  <X size={20} />
                </button>
              </div>
              <div className="p-0 max-h-[70vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-950 z-10">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Rank</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Company</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">E Score</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">S Score</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">G Score</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {companies
                      .filter(c => c.sector === 'Energy')
                      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
                      .map((company, i) => (
                        <tr key={company.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-6 py-4">
                            <span className={`text-xs font-black ${i < 3 ? 'text-emerald-500' : 'text-zinc-600'}`}>
                              #{i + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                                {company.name}
                              </span>
                              <span className="text-[10px] text-zinc-500">{company.region}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-zinc-400">{company.e_score?.toFixed(1)}</td>
                          <td className="px-6 py-4 text-xs font-mono text-zinc-400">{company.s_score?.toFixed(1)}</td>
                          <td className="px-6 py-4 text-xs font-mono text-zinc-400">{company.g_score?.toFixed(1)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                              {company.total_score?.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-center">
                <p className="text-[10px] text-zinc-500 italic">
                  Ranking based on the latest verified ESG disclosures and real-time risk signals.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
