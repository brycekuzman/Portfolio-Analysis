import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface TickerValidation {
  valid: boolean;
  ticker: string;
  name?: string;
  asset_class?: string;
  error?: string;
}

export interface PortfolioHolding {
  [ticker: string]: number;
}

export interface AnalysisRequest {
  holdings: PortfolioHolding;
  advisory_fee: number;
  asset_class_overrides?: { [ticker: string]: string };
  account_type?: 'Brokerage' | 'Roth IRA' | 'Traditional IRA';
  annual_cash_flow?: number;
  tax_rate?: number;
}

export interface AggregatePortfolioData {
  holdings: PortfolioHolding;
  advisory_fee: number;
  asset_class_overrides?: { [ticker: string]: string };
  account_type: 'Brokerage' | 'Roth IRA' | 'Traditional IRA';
  annual_cash_flow: number;
}

export interface AggregateAnalysisRequest {
  portfolios: AggregatePortfolioData[];
  tax_rate: number;
}

export interface AnalysisResponse {
  current_portfolio: {
    total_value: number;
    weights: { [key: string]: number };
    weighted_avg_er: number;
    asset_class_allocation: { [key: string]: number };
    advisory_fee: number;
  };
  model_portfolio: {
    total_value: number;
    weights: { [key: string]: number };
    weighted_avg_er: number;
    asset_class_allocation: { [key: string]: number };
    advisory_fee: number;
  };
  model_name: string;
  similarity: number;
  projections: any;
  historical_performance: any;
  fee_analysis: {
    current_annual_fee: number;
    model_annual_fee: number;
    annual_savings: number;
    current_total_fees: number;
    model_total_fees: number;
  };
  current_holdings?: Array<{
    ticker: string;
    name: string;
    dollar_value: number;
    weight: number;
    yield: number;
    expense_ratio: number;
    category: string;
  }>;
  model_holdings?: Array<{
    ticker: string;
    name: string;
    dollar_value: number;
    weight: number;
    yield: number;
    expense_ratio: number;
    category: string;
  }>;
}

export const tickerApi = {
  validate: async (ticker: string): Promise<TickerValidation> => {
    const response = await api.get(`/ticker/validate/${ticker}`);
    return response.data;
  },

  getInfo: async (ticker: string) => {
    const response = await api.get(`/ticker/info/${ticker}`);
    return response.data;
  },
};

export const portfolioApi = {
  analyze: async (request: AnalysisRequest): Promise<AnalysisResponse> => {
    const response = await api.post('/portfolio/analyze', request);
    return response.data;
  },

  analyzeAggregate: async (request: AggregateAnalysisRequest): Promise<AnalysisResponse> => {
    const response = await api.post('/portfolio/analyze-aggregate', request);
    return response.data;
  },

  validateHoldings: async (holdings: PortfolioHolding) => {
    const response = await api.post('/portfolio/validate-holdings', holdings);
    return response.data;
  },
};

export const modelsApi = {
  getAll: async () => {
    const response = await api.get('/models/all');
    return response.data;
  },

  getModel: async (modelName: string) => {
    const response = await api.get(`/models/${modelName}`);
    return response.data;
  },
};

export default api;