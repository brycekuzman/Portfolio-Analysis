import { useState } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, Alert, IconButton, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PortfolioInput from './components/PortfolioInput';
import AnalysisResults from './components/AnalysisResults';
import EmptyState from './components/EmptyState';
import { portfolioApi, type PortfolioHolding, type AnalysisResponse } from './services/api';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#4caf50',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.05)',
    '0 2px 8px rgba(0,0,0,0.08)',
    '0 4px 12px rgba(0,0,0,0.1)',
    '0 6px 16px rgba(0,0,0,0.12)',
    '0 8px 20px rgba(0,0,0,0.14)',
    '0 10px 24px rgba(0,0,0,0.16)',
    '0 12px 28px rgba(0,0,0,0.18)',
    '0 14px 32px rgba(0,0,0,0.20)',
    '0 16px 36px rgba(0,0,0,0.22)',
    '0 18px 40px rgba(0,0,0,0.24)',
    '0 20px 44px rgba(0,0,0,0.26)',
    '0 22px 48px rgba(0,0,0,0.28)',
    '0 24px 52px rgba(0,0,0,0.30)',
    '0 26px 56px rgba(0,0,0,0.32)',
    '0 28px 60px rgba(0,0,0,0.34)',
    '0 30px 64px rgba(0,0,0,0.36)',
    '0 32px 68px rgba(0,0,0,0.38)',
    '0 34px 72px rgba(0,0,0,0.40)',
    '0 36px 76px rgba(0,0,0,0.42)',
    '0 38px 80px rgba(0,0,0,0.44)',
    '0 40px 84px rgba(0,0,0,0.46)',
    '0 42px 88px rgba(0,0,0,0.48)',
    '0 44px 92px rgba(0,0,0,0.50)',
    '0 46px 96px rgba(0,0,0,0.52)',
  ],
});

export interface Portfolio {
  id: string;
  name: string;
  type: 'Brokerage' | 'Roth IRA' | 'Traditional IRA';
  holdings: PortfolioHolding;
  advisoryFee: number;
  assetClassOverrides: { [key: string]: string };
  tickerInfo?: { [ticker: string]: { name?: string; assetClass?: string; isValid?: boolean } };
  annualCashFlow: number;
}

const AGGREGATE_PORTFOLIO_ID = 'aggregate';

function App() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([
    {
      id: crypto.randomUUID(),
      name: 'Portfolio 1',
      type: 'Brokerage',
      holdings: {},
      advisoryFee: 0.01,
      assetClassOverrides: {},
      tickerInfo: {},
      annualCashFlow: 0
    }
  ]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>(portfolios[0].id);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  const isAggregateMode = activePortfolioId === AGGREGATE_PORTFOLIO_ID;
  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

  const handlePortfolioUpdate = (updates: Partial<Portfolio>) => {
    setPortfolios(prev => prev.map(p => 
      p.id === activePortfolioId ? { ...p, ...updates } : p
    ));
  };

  const handlePortfolioSwitch = (portfolioId: string) => {
    // Portfolio will be auto-saved by the PortfolioInput component when switching
    setActivePortfolioId(portfolioId);
  };

  const handleUpdateAllPortfolios = (updatedPortfolios: Portfolio[]) => {
    setPortfolios(updatedPortfolios);
  };


  const handleAnalyze = async (
    holdings: PortfolioHolding,
    advisoryFee: number,
    assetClassOverrides: { [key: string]: string },
    accountType: string,
    annualCashFlow: number,
    taxRateValue: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await portfolioApi.analyze({
        holdings,
        advisory_fee: advisoryFee,
        asset_class_overrides: assetClassOverrides,
        account_type: accountType as 'Brokerage' | 'Roth IRA' | 'Traditional IRA',
        annual_cash_flow: annualCashFlow,
        tax_rate: taxRateValue,
      });
      setAnalysis(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze portfolio. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAggregateAnalyze = async (taxRateValue: number) => {
    setLoading(true);
    setError(null);

    try {
      const portfolioData = portfolios.map(p => ({
        holdings: p.holdings,
        advisory_fee: p.advisoryFee,
        asset_class_overrides: p.assetClassOverrides,
        account_type: p.type,
        annual_cash_flow: p.annualCashFlow || 0,
      }));

      const result = await portfolioApi.analyzeAggregate({
        portfolios: portfolioData,
        tax_rate: taxRateValue,
      });
      setAnalysis(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze aggregate portfolio. Please try again.');
      console.error('Aggregate analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewPortfolio = (name: string, type: 'Brokerage' | 'Roth IRA' | 'Traditional IRA'): Portfolio => ({
    id: `portfolio-${Date.now()}`,
    name,
    type,
    holdings: {},
    advisoryFee: 0.01,
    assetClassOverrides: {},
    tickerInfo: {},
    annualCashFlow: 0,
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'background.default',
        overflow: 'hidden'
      }}>
        {/* Error Alert */}
        {error && (
          <Box sx={{ px: 4, pt: 2 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Split Screen Content */}
        <Box sx={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}>
          {/* Left Panel - Portfolio Input */}
          {!leftPanelCollapsed && (
            <Box sx={{
              width: '20%',
              minWidth: '250px',
              overflow: 'auto',
              p: 2,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              position: 'relative'
            }}>
              <PortfolioInput 
                portfolios={portfolios}
                activePortfolio={activePortfolio}
                activePortfolioId={activePortfolioId}
                isAggregateMode={isAggregateMode}
                onPortfolioSwitch={handlePortfolioSwitch}
                onPortfolioUpdate={handlePortfolioUpdate}
                onUpdateAllPortfolios={handleUpdateAllPortfolios}
                onAnalyze={handleAnalyze}
                onAggregateAnalyze={handleAggregateAnalyze}
                taxRate={taxRate}
                onTaxRateChange={setTaxRate}
                loading={loading} 
              />
              <Tooltip title="Collapse panel" placement="right">
                <IconButton
                  onClick={() => setLeftPanelCollapsed(true)}
                  sx={{
                    position: 'absolute',
                    right: -20,
                    top: 20,
                    bgcolor: 'white',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'grey.100' },
                    zIndex: 10
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Right Panel - Analysis Results */}
          <Box sx={{
            width: leftPanelCollapsed ? '100%' : '80%',
            overflow: 'auto',
            p: 4,
            bgcolor: 'background.default',
            position: 'relative'
          }}>
            {leftPanelCollapsed && (
              <Tooltip title="Expand portfolio panel" placement="right">
                <IconButton
                  onClick={() => setLeftPanelCollapsed(false)}
                  sx={{
                    position: 'absolute',
                    left: -20,
                    top: 20,
                    bgcolor: 'white',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'grey.100' },
                    zIndex: 10
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Tooltip>
            )}
            {analysis ? (
              <Box sx={{
                animation: 'fadeIn 0.5s ease-in',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}>
                <AnalysisResults analysis={analysis} />
              </Box>
            ) : (
              <EmptyState loading={loading} />
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;