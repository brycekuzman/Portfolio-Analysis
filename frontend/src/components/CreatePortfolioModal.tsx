import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';

interface CreatePortfolioModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, type: 'Brokerage' | 'Roth IRA' | 'Traditional IRA') => void;
  initialName?: string;
  initialType?: 'Brokerage' | 'Roth IRA' | 'Traditional IRA';
}

export default function CreatePortfolioModal({
  open,
  onClose,
  onSave,
  initialName = '',
  initialType = 'Brokerage',
}: CreatePortfolioModalProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<'Brokerage' | 'Roth IRA' | 'Traditional IRA'>(initialType);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setType(initialType);
    }
  }, [open, initialName, initialType]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), type);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialName ? 'Edit Portfolio' : 'Create New Portfolio'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Portfolio Name"
            placeholder="e.g., My Retirement Portfolio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
            sx={{
              borderRadius: 1.5,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fff',
              },
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Portfolio Type</InputLabel>
            <Select
              value={type}
              label="Portfolio Type"
              onChange={(e) => setType(e.target.value as any)}
              sx={{
                borderRadius: 1.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#fff',
                },
              }}
            >
              <MenuItem value="Brokerage">Brokerage</MenuItem>
              <MenuItem value="Roth IRA">Roth IRA</MenuItem>
              <MenuItem value="Traditional IRA">Traditional IRA</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim()}
        >
          {initialName ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
