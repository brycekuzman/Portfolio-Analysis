
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Stack,
  InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import HistoryIcon from '@mui/icons-material/History';
import { tickerApi, type PortfolioHolding } from '../services/api';
import type { Portfolio } from '../App';
import ETradeModal from './ETradeModal';
import PortfolioManagementModal from './PortfolioManagementModal';

interface Holding {
  ticker: string;
  amount: number;
  name?: string;
  assetClass?: string;
  isValid?: boolean;
  isValidating?: boolean;
}

interface PortfolioInputProps {
  portfolios: Portfolio[];
  activePortfolio: Portfolio;
  activePortfolioId: string;
  isAggregateMode: boolean;
  onPortfolioSwitch: (id: string) => void;
  onPortfolioUpdate: (updates: Partial<Portfolio>) => void;
  onUpdateAllPortfolios: (portfolios: Portfolio[]) => void;
  onAnalyze: (holdings: PortfolioHolding, advisoryFee: number, overrides: {[key: string]: string}, accountType: string, annualCashFlow: number, taxRate: number) => void;
  onAggregateAnalyze: (taxRate: number) => void;
  taxRate: number;
  onTaxRateChange: (rate: number) => void;
  loading?: boolean;
}

const ASSET_CLASSES = ['US Equities', 'International Equities', 'Core Fixed Income', 'Alternatives'];
const AGGREGATE_PORTFOLIO_ID = 'aggregate';

export default function PortfolioInput({ 
  portfolios,
  activePortfolio,
  activePortfolioId,
  isAggregateMode,
  onPortfolioSwitch,
  onPortfolioUpdate,
  onUpdateAllPortfolios,
  onAnalyze,
  onAggregateAnalyze,
  taxRate,
  onTaxRateChange,
  loading 
}: PortfolioInputProps) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tempTicker, setTempTicker] = useState('');
  const [tempAmount, setTempAmount] = useState('1000');
  const [advisoryFee, setAdvisoryFee] = useState<number>(1);
  const [assetClassOverrides, setAssetClassOverrides] = useState<{[key: string]: string}>({});
  const [showETradeModal, setShowETradeModal] = useState(false);
  const [showPortfolioManagementModal, setShowPortfolioManagementModal] = useState(false);
  const [isLoadingFromPortfolio, setIsLoadingFromPortfolio] = useState(false);

  // Load portfolio data when active portfolio changes
  useEffect(() => {
    setIsLoadingFromPortfolio(true);
    
    if (isAggregateMode) {
      // Combine holdings from all portfolios
      const combinedHoldings: { [ticker: string]: { amount: number; name?: string; assetClass?: string; isValid?: boolean; portfolioNames: string[] } } = {};
      
      portfolios.forEach(p => {
        Object.entries(p.holdings).forEach(([ticker, amount]) => {
          if (combinedHoldings[ticker]) {
            combinedHoldings[ticker].amount += amount;
            combinedHoldings[ticker].portfolioNames.push(p.name);
          } else {
            combinedHoldings[ticker] = {
              amount,
              name: p.tickerInfo?.[ticker]?.name,
              assetClass: p.tickerInfo?.[ticker]?.assetClass,
              isValid: p.tickerInfo?.[ticker]?.isValid ?? true,
              portfolioNames: [p.name]
            };
          }
        });
      });

      const holdingsArray = Object.entries(combinedHoldings).map(([ticker, data]) => ({
        ticker,
        amount: data.amount,
        name: data.name,
        assetClass: data.assetClass,
        isValid: data.isValid,
      }));
      
      setHoldings(holdingsArray);
      
      // Calculate weighted average fee across all portfolios
      const totalValue = portfolios.reduce((sum, p) => sum + Object.values(p.holdings).reduce((s, v) => s + v, 0), 0);
      const weightedFee = totalValue > 0 
        ? portfolios.reduce((sum, p) => {
            const pValue = Object.values(p.holdings).reduce((s, v) => s + v, 0);
            return sum + (p.advisoryFee * pValue);
          }, 0) / totalValue
        : 0.01;
      setAdvisoryFee(weightedFee * 100);
      
      // Combine asset class overrides
      const combinedOverrides: {[key: string]: string} = {};
      portfolios.forEach(p => {
        Object.entries(p.assetClassOverrides || {}).forEach(([ticker, assetClass]) => {
          combinedOverrides[ticker] = assetClass;
        });
      });
      setAssetClassOverrides(combinedOverrides);
    } else if (activePortfolio) {
      const holdingsArray = Object.entries(activePortfolio.holdings).map(([ticker, amount]) => ({
        ticker,
        amount,
        name: activePortfolio.tickerInfo?.[ticker]?.name,
        assetClass: activePortfolio.tickerInfo?.[ticker]?.assetClass,
        isValid: activePortfolio.tickerInfo?.[ticker]?.isValid,
      }));
      
      setHoldings(holdingsArray);
      setAdvisoryFee(activePortfolio.advisoryFee * 100);
      setAssetClassOverrides(activePortfolio.assetClassOverrides || {});
      setTempTicker('');
      setTempAmount('1000');
    }
    
    // Reset loading flag after state updates
    setTimeout(() => setIsLoadingFromPortfolio(false), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortfolioId, isAggregateMode]);

  // Auto-save portfolio when holdings change (skip in aggregate mode and during loading)
  useEffect(() => {
    if (isAggregateMode || isLoadingFromPortfolio) return;
    
    const portfolioHoldings: PortfolioHolding = {};
    const tickerInfo: { [ticker: string]: { name?: string; assetClass?: string; isValid?: boolean } } = {};
    
    holdings.forEach(h => {
      if (h.ticker && h.amount > 0) {
        portfolioHoldings[h.ticker] = h.amount;
        tickerInfo[h.ticker] = {
          name: h.name,
          assetClass: h.assetClass,
          isValid: h.isValid,
        };
      }
    });

    onPortfolioUpdate({
      holdings: portfolioHoldings,
      advisoryFee: advisoryFee / 100,
      assetClassOverrides,
      tickerInfo,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, advisoryFee, assetClassOverrides, isAggregateMode, isLoadingFromPortfolio]);

  const validateTicker = async (ticker: string) => {
    if (!ticker.trim()) return;

    setTempTicker(ticker.toUpperCase());
    
    try {
      const result = await tickerApi.validate(ticker.toUpperCase());
      if (result.valid && tempAmount) {
        const amount = parseFloat(tempAmount);
        if (amount > 0) {
          const newHolding: Holding = {
            ticker: result.ticker,
            amount,
            name: result.name,
            assetClass: result.asset_class,
            isValid: true,
            isValidating: false
          };
          setHoldings(prev => [...prev, newHolding]);
          setTempTicker('');
          setTempAmount('1000');
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handleAddHolding = async () => {
    if (tempTicker && tempAmount) {
      await validateTicker(tempTicker);
    }
  };

  const handleAmountChange = (index: number, amount: number) => {
    setHoldings(prev => {
      const newHoldings = [...prev];
      newHoldings[index] = { ...newHoldings[index], amount };
      return newHoldings;
    });
  };

  const handleAssetClassChange = (ticker: string, assetClass: string) => {
    setAssetClassOverrides(prev => ({
      ...prev,
      [ticker]: assetClass
    }));
  };

  const removeHolding = (index: number) => {
    setHoldings(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    const validHoldings = holdings.filter(h => h.isValid && h.amount > 0);
    if (validHoldings.length === 0) return;

    if (isAggregateMode) {
      onAggregateAnalyze(taxRate / 100);
    } else {
      const portfolioHoldings: PortfolioHolding = {};
      validHoldings.forEach(h => {
        portfolioHoldings[h.ticker] = h.amount;
      });

      onAnalyze(
        portfolioHoldings, 
        advisoryFee / 100, 
        assetClassOverrides,
        activePortfolio.type,
        activePortfolio.annualCashFlow || 0,
        taxRate / 100
      );
    }
  };

  const totalValue = holdings.reduce((sum, h) => sum + (h.amount || 0), 0);
  const validHoldings = holdings.filter(h => h.isValid && h.amount > 0);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <HistoryIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1 }}>
            Portfolio Analyzer
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 500 }}>
            Wealth Management
          </Typography>
        </Box>
      </Box>

      {/* Portfolio Selector & Actions */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ flex: 1 }}>
          <Select
            value={activePortfolioId}
            onChange={(e) => onPortfolioSwitch(e.target.value)}
            sx={{
              borderRadius: 1.5,
              bgcolor: isAggregateMode ? '#e3f2fd' : '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isAggregateMode ? '#1976d2' : '#e5e7eb'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isAggregateMode ? '#1565c0' : '#d1d5db'
              }
            }}
          >
            {portfolios.length > 1 && (
              <MenuItem 
                value={AGGREGATE_PORTFOLIO_ID}
                sx={{ 
                  fontWeight: 600,
                  color: 'primary.main',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  mb: 0.5
                }}
              >
                Aggregate Portfolio
              </MenuItem>
            )}
            {portfolios.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          size="small"
          onClick={() => setShowPortfolioManagementModal(true)}
          sx={{
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: '#e5e7eb',
            borderRadius: 1,
            p: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            '&:hover': { 
              bgcolor: '#f9fafb',
              borderColor: '#d1d5db'
            }
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => setShowETradeModal(true)}
          sx={{
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: '#e5e7eb',
            borderRadius: 1,
            p: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            '&:hover': { 
              bgcolor: '#f9fafb',
              borderColor: '#d1d5db'
            }
          }}
          title="Import from E*TRADE"
        >
          <FileDownloadIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Add Holdings Section - Hidden in Aggregate Mode */}
      {!isAggregateMode && (
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>
            Add Holdings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              placeholder="TICKER"
              size="small"
              value={tempTicker}
              onChange={(e) => setTempTicker(e.target.value.toUpperCase())}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAddHolding();
              }}
              sx={{ 
                flex: 1,
                borderRadius: 1.5,
                bgcolor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e5e7eb'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2'
                }
              }}
            />
            <TextField
              size="small"
              type="number"
              value={tempAmount}
              onChange={(e) => setTempAmount(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAddHolding();
              }}
              sx={{ 
                flex: 1,
                borderRadius: 1.5,
                bgcolor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e5e7eb'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2'
                }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
            <IconButton
              onClick={handleAddHolding}
              sx={{
                bgcolor: '#fff',
                color: '#1976d2',
                border: '1px solid',
                borderColor: '#e5e7eb',
                borderRadius: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                '&:hover': { 
                  bgcolor: '#f0f4ff',
                  borderColor: '#1976d2',
                  color: '#1565c0'
                }
              }}
              size="small"
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Aggregate Mode Info Banner */}
      {isAggregateMode && (
        <Box sx={{ 
          p: 1.5, 
          bgcolor: '#e3f2fd', 
          borderRadius: 1.5, 
          border: '1px solid',
          borderColor: '#90caf9'
        }}>
          <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 600 }}>
            Combined view of {portfolios.length} portfolios (read-only)
          </Typography>
        </Box>
      )}

      {/* Holdings List */}
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <Stack spacing={1.5}>
          {holdings.map((holding, index) => (
            <Paper 
              key={index} 
              elevation={0}
              sx={{ 
                p: 2,
                border: '1px solid',
                borderColor: isAggregateMode ? '#90caf9' : 'divider',
                bgcolor: isAggregateMode ? '#f5f9ff' : 'background.paper'
              }}
            >
              {/* Ticker and Name */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="body1" fontWeight={600} sx={{ lineHeight: 1 }}>
                    {holding.ticker}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                    {holding.name}
                  </Typography>
                </Box>
                {!isAggregateMode && (
                  <IconButton
                    onClick={() => removeHolding(index)}
                    size="small"
                    sx={{ color: 'grey.400', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              {/* Asset Class and Amount */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                {isAggregateMode ? (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      flex: 1, 
                      py: 1, 
                      px: 1.5, 
                      bgcolor: '#e3f2fd', 
                      borderRadius: 1,
                      color: 'text.secondary'
                    }}
                  >
                    {assetClassOverrides[holding.ticker] || holding.assetClass || 'Unknown'}
                  </Typography>
                ) : (
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <Select
                      value={assetClassOverrides[holding.ticker] || holding.assetClass || ''}
                      onChange={(e) => handleAssetClassChange(holding.ticker, e.target.value)}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      {ASSET_CLASSES.map(ac => (
                        <MenuItem key={ac} value={ac}>{ac}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {isAggregateMode ? (
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    sx={{ 
                      flex: 1, 
                      py: 1, 
                      px: 1.5, 
                      bgcolor: '#e3f2fd', 
                      borderRadius: 1,
                      textAlign: 'right'
                    }}
                  >
                    ${holding.amount?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 0}
                  </Typography>
                ) : (
                  <TextField
                    type="number"
                    value={holding.amount || ''}
                    onChange={(e) => handleAmountChange(index, parseFloat(e.target.value) || 0)}
                    size="small"
                    sx={{ flex: 1 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                )}
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>

      {/* Footer - Total Assets, Fee & Tax Rate */}
      <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        {/* Total Assets */}
        <Box sx={{ flex: 1.2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
            Total Assets
          </Typography>
          <Typography variant="h5" fontWeight={600} sx={{ color: 'primary.main' }}>
            ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </Typography>
        </Box>

        {/* Fee */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
            Fee
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <TextField
              type="number"
              value={advisoryFee}
              onChange={(e) => setAdvisoryFee(parseFloat(e.target.value) || 0)}
              size="small"
              sx={{ 
                width: '55px',
                borderRadius: 1.5,
                bgcolor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e5e7eb'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2'
                },
                '& input[type=number]': {
                  MozAppearance: 'textfield'
                },
                '& input[type=number]::-webkit-outer-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0
                },
                '& input[type=number]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0
                }
              }}
              inputProps={{ step: 0.1, min: 0, max: 10 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: '16px' }}>
              %
            </Typography>
          </Box>
        </Box>

        {/* Tax Rate */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
            Tax Rate
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <TextField
              type="number"
              value={taxRate ?? 0}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
              size="small"
              sx={{ 
                width: '55px',
                borderRadius: 1.5,
                bgcolor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e5e7eb'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2'
                },
                '& input[type=number]': {
                  MozAppearance: 'textfield'
                },
                '& input[type=number]::-webkit-outer-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0
                },
                '& input[type=number]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0
                }
              }}
              inputProps={{ step: 1, min: 0, max: 50 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: '16px' }}>
              %
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Analyze Button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleAnalyze}
        disabled={loading || validHoldings.length === 0}
        sx={{ 
          py: 1.5, 
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
      >
        {loading ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
            Analyzing...
          </>
        ) : (
          'Analyze Portfolio'
        )}
      </Button>

      {/* E*TRADE Import Modal */}
      <ETradeModal open={showETradeModal} onClose={() => setShowETradeModal(false)} />

      {/* Portfolio Management Modal */}
      <PortfolioManagementModal
        open={showPortfolioManagementModal}
        onClose={() => setShowPortfolioManagementModal(false)}
        portfolios={portfolios}
        onUpdatePortfolios={onUpdateAllPortfolios}
      />
    </Box>
  );
}
