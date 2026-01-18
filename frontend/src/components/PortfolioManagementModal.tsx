import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Portfolio } from '../App';

interface PortfolioManagementModalProps {
  open: boolean;
  onClose: () => void;
  portfolios: Portfolio[];
  onUpdatePortfolios: (portfolios: Portfolio[]) => void;
}

export default function PortfolioManagementModal({
  open,
  onClose,
  portfolios,
  onUpdatePortfolios,
}: PortfolioManagementModalProps) {
  const [editedPortfolios, setEditedPortfolios] = useState<Portfolio[]>(portfolios);

  useEffect(() => {
    if (open) {
      setEditedPortfolios(portfolios);
    }
  }, [open, portfolios]);

  const handleNameChange = (id: string, newName: string) => {
    setEditedPortfolios(prev =>
      prev.map(p => p.id === id ? { ...p, name: newName } : p)
    );
  };

  const handleTypeChange = (id: string, newType: 'Brokerage' | 'Roth IRA' | 'Traditional IRA') => {
    setEditedPortfolios(prev =>
      prev.map(p => p.id === id ? { ...p, type: newType } : p)
    );
  };

  const handleCashFlowChange = (id: string, newCashFlow: number) => {
    setEditedPortfolios(prev =>
      prev.map(p => p.id === id ? { ...p, annualCashFlow: newCashFlow } : p)
    );
  };

  const handleAddPortfolio = () => {
    const newPortfolio: Portfolio = {
      id: crypto.randomUUID(),
      name: `Portfolio ${editedPortfolios.length + 1}`,
      type: 'Brokerage',
      holdings: {},
      advisoryFee: 0,
      assetClassOverrides: {},
      tickerInfo: {},
      annualCashFlow: 0,
    };
    setEditedPortfolios(prev => [...prev, newPortfolio]);
  };

  const handleDeletePortfolio = (id: string) => {
    setEditedPortfolios(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = () => {
    onUpdatePortfolios(editedPortfolios);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Portfolios</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {editedPortfolios.map((portfolio) => (
            <Paper
              key={portfolio.id}
              sx={{
                p: 2,
                bgcolor: '#fff',
                border: '1px solid',
                borderColor: '#e5e7eb',
                borderRadius: 1.5,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                      Portfolio Name
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={portfolio.name}
                      onChange={(e) => handleNameChange(portfolio.id, e.target.value)}
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: '#fff',
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
                  </Box>
                  {editedPortfolios.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePortfolio(portfolio.id)}
                      sx={{
                        mt: 3,
                        color: '#ef4444',
                        '&:hover': { bgcolor: '#fee2e2' }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                      Portfolio Type
                    </Typography>
                    <Select
                      fullWidth
                      size="small"
                      value={portfolio.type}
                      onChange={(e) => handleTypeChange(portfolio.id, e.target.value as any)}
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: '#fff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#e5e7eb'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db'
                        }
                      }}
                    >
                      <MenuItem value="Brokerage">Brokerage (Taxable)</MenuItem>
                      <MenuItem value="Roth IRA">Roth IRA (Tax Exempt)</MenuItem>
                      <MenuItem value="Traditional IRA">Traditional IRA (Tax Deferred)</MenuItem>
                    </Select>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                      Annual Cash Flow
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={portfolio.annualCashFlow || 0}
                      onChange={(e) => handleCashFlowChange(portfolio.id, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        endAdornment: <InputAdornment position="end">/yr</InputAdornment>
                      }}
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: '#fff',
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
                  </Box>
                </Box>
              </Stack>
            </Paper>
          ))}
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddPortfolio}
            sx={{
              borderColor: '#e5e7eb',
              color: '#1976d2',
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#1976d2',
                bgcolor: '#f0f4ff'
              }
            }}
          >
            Add Portfolio
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
