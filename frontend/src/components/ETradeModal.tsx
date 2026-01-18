import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Step,
  Stepper,
  StepLabel,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface ETradeModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = ['Login to E*TRADE', 'Verify Authorization', 'Get Tokens'];

export default function ETradeModal({ open, onClose }: ETradeModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [tokens, setTokens] = useState<{ token: string; secret: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartLogin = () => {
    setLoading(true);
    setError(null);
    // In production, this would initiate OAuth flow with E*TRADE
    // For now, simulate the flow
    setTimeout(() => {
      setLoading(false);
      setActiveStep(1);
    }, 1500);
  };

  const handleVerify = () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }
    setLoading(true);
    setError(null);
    // In production, this would exchange code for tokens
    setTimeout(() => {
      setLoading(false);
      setTokens({
        token: 'oauth_token_' + Math.random().toString(36).slice(2),
        secret: 'oauth_token_secret_' + Math.random().toString(36).slice(2),
      });
      setActiveStep(2);
    }, 1500);
  };

  const handleClose = () => {
    setActiveStep(0);
    setVerificationCode('');
    setTokens(null);
    setError(null);
    onClose();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import from E*TRADE</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Step 1: Login */}
        {activeStep === 0 && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click the button below to authorize Portfolio Analyzer to access your E*TRADE account.
            </Typography>
            <Button
              variant="contained"
              endIcon={<OpenInNewIcon />}
              onClick={handleStartLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Connecting...
                </>
              ) : (
                'Login to E*TRADE'
              )}
            </Button>
          </Box>
        )}

        {/* Step 2: Verification Code */}
        {activeStep === 1 && (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You should see a verification code in your E*TRADE account. Enter it below:
            </Typography>
            <TextField
              fullWidth
              placeholder="Enter verification code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
              disabled={loading}
            />
            <Alert severity="info">
              If you don't see a code, check your E*TRADE developer app for the authorization PIN.
            </Alert>
          </Box>
        )}

        {/* Step 3: Success - Show Tokens */}
        {activeStep === 2 && tokens && (
          <Box sx={{ py: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Successfully authenticated with E*TRADE!
            </Alert>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              OAuth Token
            </Typography>
            <Box
              sx={{
                p: 1,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
                wordBreak: 'break-all',
              }}
            >
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {tokens.token}
              </Typography>
              <Button
                size="small"
                onClick={() => handleCopy(tokens.token)}
                sx={{ ml: 1, flexShrink: 0 }}
              >
                Copy
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Token Secret
            </Typography>
            <Box
              sx={{
                p: 1,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
                wordBreak: 'break-all',
              }}
            >
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {tokens.secret}
              </Typography>
              <Button
                size="small"
                onClick={() => handleCopy(tokens.secret)}
                sx={{ ml: 1, flexShrink: 0 }}
              >
                Copy
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {activeStep === 2 ? 'Done' : 'Cancel'}
        </Button>
        {activeStep === 0 && (
          <Button
            onClick={handleStartLogin}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Next'}
          </Button>
        )}
        {activeStep === 1 && (
          <Button
            onClick={handleVerify}
            variant="contained"
            disabled={loading || !verificationCode.trim()}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
