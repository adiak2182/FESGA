export interface Company {
  id: number;
  name: string;
  sector: string;
  region: string;
  ticker: string;
  e_score: number | null;
  s_score: number | null;
  g_score: number | null;
  total_score: number | null;
  stressed_score?: number | null;
  confidence_score: number;
  base_pd: number;
  esg_adjusted_pd: number;
  base_spread_bps: number;
  loan_spread_bps: number;
  reasoning?: string;
  snapshots?: {
    id: number;
    e_score: number;
    s_score: number;
    g_score: number;
    total_score: number;
    timestamp: string;
  }[];
  audit_logs?: {
    id: number;
    user_email: string;
    action: string;
    details: string;
    timestamp: string;
  }[];
  weights?: {
    e: number;
    s: number;
    g: number;
  };
  overrides?: {
    e_score?: number;
    s_score?: number;
    g_score?: number;
    reason?: string;
    analyst_email?: string;
    timestamp?: string;
  };
}

export interface Alert {
  id: number;
  company_id: number;
  company_name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  is_predictive: boolean;
  category: string;
}

export interface ESGDataPoint {
  name: string;
  value: number;
}
