import { Box, Typography, CircularProgress } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface EmptyStateProps {
  loading?: boolean;
}

export default function EmptyState({ loading }: EmptyStateProps) {
  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '400px',
      }}>
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 3 }}>
          Analyzing your portfolio...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This may take a few moments
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '400px',
      textAlign: 'center',
      px: 4,
    }}>
      <Box sx={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        bgcolor: 'primary.50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 3,
      }}>
        <TrendingUpIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.7 }} />
      </Box>
      
      <Typography variant="h5" gutterBottom fontWeight={500}>
        Ready to analyze your portfolio
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mt: 1 }}>
        Enter your holdings on the left and click "Analyze Portfolio" to see projections, 
        fee comparisons, and performance insights.
      </Typography>
    </Box>
  );
}
