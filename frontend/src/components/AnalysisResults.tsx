import { Box, Typography, Paper, Grid, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useState } from 'react';
import Plot from 'react-plotly.js';
import { type AnalysisResponse } from '../services/api';

interface AnalysisResultsProps {
  analysis: AnalysisResponse;
}

export default function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const [tabValue, setTabValue] = useState(0);

  const renderProjectionsChart = () => {
    const currentProjection = analysis.projections.current;
    const modelProjection = analysis.projections.model;

    if (!currentProjection || !modelProjection) return null;

    // Create years array from 0 to 10
    const years = Array.from({ length: 11 }, (_, i) => i);

    // Build values arrays starting with current total value
    const currentValues = [analysis.current_portfolio.total_value];
    const modelValues = [analysis.model_portfolio.total_value];

    // Add all 10 years of projections (values are already in dollars from new API)
    if (currentProjection.yearly_projections) {
      currentProjection.yearly_projections.forEach((proj: any) => {
        currentValues.push(proj.ending_value);
      });
    }

    if (modelProjection.yearly_projections) {
      modelProjection.yearly_projections.forEach((proj: any) => {
        modelValues.push(proj.ending_value);
      });
    }

    // Build chart title based on account type
    const accountType = currentProjection.account_type || 'Brokerage';
    const titleSuffix = accountType === 'Roth IRA' ? '(Tax-Free, After Fees)' : 
                        accountType === 'Traditional IRA' ? '(Tax-Deferred, After Fees)' : 
                        '(After Taxes & Fees)';

    return (
      <Plot
        data={[
          {
            x: years,
            y: currentValues,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Current Portfolio',
            line: { color: '#1976d2', width: 3 },
            marker: { size: 8 },
          },
          {
            x: years,
            y: modelValues,
            type: 'scatter',
            mode: 'lines+markers',
            name: `${analysis.model_name} Portfolio`,
            line: { color: '#4caf50', width: 3 },
            marker: { size: 8 },
          },
        ]}
        layout={{
          title: `Projected Portfolio Growth Over 10 Years ${titleSuffix}`,
          xaxis: { title: 'Years', dtick: 1 },
          yaxis: { title: 'Portfolio Value ($)', tickformat: '$,.0f' },
          hovermode: 'x unified',
          showlegend: true,
          legend: { x: 0.5, y: -0.15, xanchor: 'center', orientation: 'h' },
          height: 500,
          margin: { b: 80 },
        }}
        style={{ width: '100%', height: '500px' }}
        config={{ responsive: true }}
      />
    );
  };

  const renderProjectionTable = (projections: any, _portfolioValue: number, title: string) => {
    if (!projections || !projections.yearly_projections) return null;

    const years = projections.yearly_projections.map((proj: any) => proj.year);
    const hasCashFlow = projections.yearly_projections.some((p: any) => p.cash_flow !== undefined && p.cash_flow !== 0);
    const hasTaxes = projections.yearly_projections.some((p: any) => p.taxes !== undefined && p.taxes !== 0);
    const hasDeferredTax = projections.yearly_projections.some((p: any) => p.deferred_tax_liability !== undefined && p.deferred_tax_liability > 0);
    const accountType = projections.account_type || 'Brokerage';

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {title}
          {accountType !== 'Brokerage' && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({accountType})
            </Typography>
          )}
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Metric</strong></TableCell>
                {years.map((year: number) => (
                  <TableCell key={year} align="right"><strong>Year {year}</strong></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell><strong>Starting Value</strong></TableCell>
                {projections.yearly_projections.map((proj: any, idx: number) => (
                  <TableCell key={idx} align="right">
                    ${proj.starting_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                ))}
              </TableRow>
              {hasCashFlow && (
                <TableRow sx={{ bgcolor: '#f0f7ff' }}>
                  <TableCell><strong>+ Cash Flow</strong></TableCell>
                  {projections.yearly_projections.map((proj: any, idx: number) => (
                    <TableCell key={idx} align="right" sx={{ color: proj.cash_flow >= 0 ? '#2e7d32' : '#d32f2f' }}>
                      {proj.cash_flow >= 0 ? '+' : ''}${proj.cash_flow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                  ))}
                </TableRow>
              )}
              <TableRow>
                <TableCell><strong>Growth</strong></TableCell>
                {projections.yearly_projections.map((proj: any, idx: number) => (
                  <TableCell key={idx} align="right" sx={{ color: '#2e7d32' }}>
                    +${proj.growth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                ))}
              </TableRow>
              {hasTaxes && (
                <TableRow sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell><strong>- Taxes</strong></TableCell>
                  {projections.yearly_projections.map((proj: any, idx: number) => (
                    <TableCell key={idx} align="right" sx={{ color: '#d32f2f' }}>
                      -${proj.taxes.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                  ))}
                </TableRow>
              )}
              <TableRow>
                <TableCell><strong>- Fees</strong></TableCell>
                {projections.yearly_projections.map((proj: any, idx: number) => (
                  <TableCell key={idx} align="right" sx={{ color: '#d32f2f' }}>
                    -${proj.fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Ending Value</strong></TableCell>
                {projections.yearly_projections.map((proj: any, idx: number) => (
                  <TableCell key={idx} align="right">
                    <strong>${proj.ending_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                  </TableCell>
                ))}
              </TableRow>
              {hasDeferredTax && (
                <TableRow sx={{ bgcolor: '#fce4ec' }}>
                  <TableCell>
                    <Tooltip title="Estimated taxes owed when withdrawing from Traditional IRA">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <strong>Deferred Tax Liability</strong>
                        <InfoIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  {projections.yearly_projections.map((proj: any, idx: number) => (
                    <TableCell key={idx} align="right" sx={{ color: '#c62828' }}>
                      ${proj.deferred_tax_liability.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderFeeComparisonChart = () => {
    const fees = analysis.fee_analysis;

    return (
      <Plot
        data={[
          {
            x: ['1-Year Fees', '10-Year Cumulative Fees'],
            y: [fees.current_annual_fee, fees.current_total_fees],
            type: 'bar',
            name: 'Your Portfolio',
            marker: { color: '#1976d2' },
            text: [
              `$${fees.current_annual_fee.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              `$${fees.current_total_fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            ],
            textposition: 'outside',
          },
          {
            x: ['1-Year Fees', '10-Year Cumulative Fees'],
            y: [fees.model_annual_fee, fees.model_total_fees],
            type: 'bar',
            name: `${analysis.model_name} Portfolio`,
            marker: { color: '#4caf50' },
            text: [
              `$${fees.model_annual_fee.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              `$${fees.model_total_fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            ],
            textposition: 'outside',
          },
        ]}
        layout={{
          title: 'Fee Comparison',
          yaxis: { title: 'Fees ($)', tickformat: '$,.0f' },
          barmode: 'group',
          showlegend: true,
          height: 500,
        }}
        style={{ width: '100%', height: '500px' }}
        config={{ responsive: true }}
      />
    );
  };

  const renderHistoricalPerformanceChart = () => {
    const currentHist = analysis.historical_performance.current;
    const modelHist = analysis.historical_performance.model;

    if (!currentHist || !modelHist) return null;

    // Check if we have the cumulative returns data
    const currentCumulative = currentHist.cumulative_with_fees;
    const modelCumulative = modelHist.cumulative_with_fees;
    const dates = currentHist.dates;

    if (!currentCumulative || !modelCumulative || !dates) {
      return <Typography>Historical performance data not available</Typography>;
    }

    // Convert cumulative returns to portfolio values
    const currentValues = currentCumulative.map((ret: number) => ret * analysis.current_portfolio.total_value);
    const modelValues = modelCumulative.map((ret: number) => ret * analysis.model_portfolio.total_value);

    return (
      <Plot
        data={[
          {
            x: dates,
            y: currentValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Current Portfolio',
            line: { color: '#1976d2', width: 2 },
          },
          {
            x: dates,
            y: modelValues,
            type: 'scatter',
            mode: 'lines',
            name: `${analysis.model_name} Portfolio`,
            line: { color: '#4caf50', width: 2 },
          },
        ]}
        layout={{
          title: 'Historical Performance (10 Years)',
          xaxis: { title: 'Date' },
          yaxis: { title: 'Portfolio Value ($)', tickformat: '$,.0f' },
          hovermode: 'x unified',
          showlegend: true,
          height: 500,
        }}
        style={{ width: '100%', height: '500px' }}
        config={{ responsive: true }}
      />
    );
  };

  const renderAssetAllocationChart = (portfolio: any, title: string) => {
    const allocation = portfolio.asset_class_allocation;

    return (
      <Plot
        data={[
          {
            labels: Object.keys(allocation),
            values: Object.values(allocation),
            type: 'pie',
            hole: 0.4,
            marker: {
              colors: ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0'],
            },
            textinfo: 'label+percent',
            textposition: 'outside',
            insidetextorientation: 'radial'
          },
        ]}
        layout={{
          showlegend: true,
          height: 400,
          margin: { l: 40, r: 40, t: 40, b: 40 },
        }}
        style={{ width: '100%' }}
        config={{ responsive: true }}
      />
    );
  };

  return (
    <Box sx={{ mt: 4 }}>
      {/* Summary Dashboard Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Recommended Model Card */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', bgcolor: 'primary.50', border: '2px solid', borderColor: 'primary.main' }}>
            <Typography variant="caption" color="primary.main" gutterBottom sx={{ display: 'block', fontWeight: 600 }}>
              Recommended Model
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: 'primary.dark' }}>
              {analysis.model_name}
            </Typography>
            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, bgcolor: 'primary.main', borderRadius: 1, mb: 1 }}>
              <Typography variant="caption" fontWeight={600} sx={{ color: 'white' }}>
                {analysis.model_name.split(' ')[0]}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Based on your asset mix
            </Typography>
          </Paper>
        </Grid>

        {/* Projected Value Card */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block' }}>
              Projected Value (10Y)
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
              ${(analysis.projections.model.final_portfolio_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
            <Typography variant="body2" color="success.main" fontWeight={500}>
              Expected Return: {(analysis.projections.model.weighted_annual_return * 100).toFixed(1)}%
            </Typography>
          </Paper>
        </Grid>

        {/* Annual Fees Card */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block' }}>
              Annual Fees
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
              ${analysis.fee_analysis.model_annual_fee.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Expense Ratio: {((analysis.model_portfolio.weighted_avg_er + analysis.model_portfolio.advisory_fee) * 100).toFixed(2)}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)} sx={{ mb: 2 }}>
        <Tab label="Projections" />
        <Tab label="Fees" />
        <Tab label="Historical Performance" />
        <Tab label="Asset Allocation" />
      </Tabs>

      {tabValue === 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            {renderProjectionsChart()}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1">Current Portfolio (10 years)</Typography>
                <Typography variant="h6">
                  ${(analysis.projections.current.final_portfolio_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1">{analysis.model_name} Portfolio (10 years)</Typography>
                <Typography variant="h6">
                  ${(analysis.projections.model.final_portfolio_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1">Potential Difference</Typography>
                <Typography variant="h6" color="primary">
                  ${((analysis.projections.model.final_portfolio_value - analysis.projections.current.final_portfolio_value)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Year-by-Year Projection Details
            </Typography>
            {renderProjectionTable(analysis.projections.current, analysis.current_portfolio.total_value, 'Current Portfolio')}
            {renderProjectionTable(analysis.projections.model, analysis.model_portfolio.total_value, `${analysis.model_name} Portfolio`)}
          </Box>
        </Paper>
      )}

      {tabValue === 1 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            {renderFeeComparisonChart()}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle1">Current Annual Fee</Typography>
                <Typography variant="h6" color="error">
                  ${analysis.fee_analysis.current_annual_fee.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle1">Model Annual Fee</Typography>
                <Typography variant="h6" color="success.main">
                  ${analysis.fee_analysis.model_annual_fee.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle1">Annual Savings</Typography>
                <Typography variant="h6" color="primary">
                  ${analysis.fee_analysis.annual_savings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle1">10-Year Cumulative Savings</Typography>
                <Typography variant="h6" color="primary">
                  ${(analysis.fee_analysis.current_total_fees - analysis.fee_analysis.model_total_fees).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Fee Breakdown
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>Current Portfolio</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Weighted Average Manager Fee</strong></TableCell>
                        <TableCell align="right">
                          {(analysis.current_portfolio.weighted_avg_er * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell align="right">
                          ${(analysis.current_portfolio.weighted_avg_er * analysis.current_portfolio.total_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Advisory Fee</strong></TableCell>
                        <TableCell align="right">
                          {(analysis.current_portfolio.advisory_fee * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell align="right">
                          ${(analysis.current_portfolio.advisory_fee * analysis.current_portfolio.total_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Total Annual Fee</strong></TableCell>
                        <TableCell align="right">
                          {((analysis.current_portfolio.weighted_avg_er + analysis.current_portfolio.advisory_fee) * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell align="right">
                          <strong>${((analysis.current_portfolio.weighted_avg_er + analysis.current_portfolio.advisory_fee) * analysis.current_portfolio.total_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={2}><strong>10-Year Cumulative Fees</strong></TableCell>
                        <TableCell align="right">
                          <strong>${analysis.fee_analysis.current_total_fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>{analysis.model_name} Portfolio</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Weighted Average Manager Fee</strong></TableCell>
                        <TableCell align="right">
                          {(analysis.model_portfolio.weighted_avg_er * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell align="right">
                          ${(analysis.model_portfolio.weighted_avg_er * analysis.model_portfolio.total_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Advisory Fee</strong></TableCell>
                        <TableCell align="right">
                          {(analysis.model_portfolio.advisory_fee * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell align="right">
                          ${(analysis.model_portfolio.advisory_fee * analysis.model_portfolio.total_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Total Annual Fee</strong></TableCell>
                        <TableCell align="right">
                          {((analysis.model_portfolio.weighted_avg_er + analysis.model_portfolio.advisory_fee) * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell align="right">
                          <strong>${((analysis.model_portfolio.weighted_avg_er + analysis.model_portfolio.advisory_fee) * analysis.model_portfolio.total_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={2}><strong>10-Year Cumulative Fees</strong></TableCell>
                        <TableCell align="right">
                          <strong>${analysis.fee_analysis.model_total_fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            {renderHistoricalPerformanceChart()}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Historical Performance Metrics
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Metric</strong></TableCell>
                    <TableCell align="right"><strong>Your Portfolio</strong></TableCell>
                    <TableCell align="right"><strong>{analysis.model_name} Portfolio</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><strong>Total Return</strong></TableCell>
                    <TableCell align="right">
                      {(analysis.historical_performance.current.stats_with_fees['Total Return'] * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell align="right">
                      {(analysis.historical_performance.model.stats_with_fees['Total Return'] * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Annualized Return</strong></TableCell>
                    <TableCell align="right">
                      {(analysis.historical_performance.current.stats_with_fees['Annualized Return'] * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell align="right">
                      {(analysis.historical_performance.model.stats_with_fees['Annualized Return'] * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Volatility</strong></TableCell>
                    <TableCell align="right">
                      {(analysis.historical_performance.current.stats_with_fees['Volatility'] * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell align="right">
                      {(analysis.historical_performance.model.stats_with_fees['Volatility'] * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <strong>Sharpe Ratio</strong>
                        <Tooltip title="Risk-adjusted return metric. Higher is better. Above 1.0 is good, above 2.0 is excellent.">
                          <IconButton size="small">
                            <InfoIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {analysis.historical_performance.current.stats_with_fees['Sharpe Ratio'].toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      {analysis.historical_performance.model.stats_with_fees['Sharpe Ratio'].toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Max Drawdown</strong></TableCell>
                    <TableCell align="right">
                      {(analysis.historical_performance.current.stats_with_fees['Max Drawdown'] * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell align="right">
                      {(analysis.historical_performance.model.stats_with_fees['Max Drawdown'] * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {tabValue === 3 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
            <Paper elevation={3} sx={{ p: 3, flex: 1 }}>
              <Typography variant="h6" gutterBottom>Current Portfolio</Typography>
              {renderAssetAllocationChart(analysis.current_portfolio, '')}
            </Paper>
            <Paper elevation={3} sx={{ p: 3, flex: 1 }}>
              <Typography variant="h6" gutterBottom>{analysis.model_name} Portfolio</Typography>
              {renderAssetAllocationChart(analysis.model_portfolio, '')}
            </Paper>
          </Box>

          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Investment Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>Your Portfolio Holdings</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Ticker</strong></TableCell>
                        <TableCell align="right"><strong>Dollar Value</strong></TableCell>
                        <TableCell align="right"><strong>Yield</strong></TableCell>
                        <TableCell align="right"><strong>Expense Ratio</strong></TableCell>
                        <TableCell><strong>Category/Industry</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysis.current_holdings?.map((holding: any) => (
                        <TableRow key={holding.ticker}>
                          <TableCell>{holding.ticker}</TableCell>
                          <TableCell align="right">
                            ${holding.dollar_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell align="right">
                            {(holding.yield * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell align="right">
                            {(holding.expense_ratio * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell>{holding.category}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>{analysis.model_name} Portfolio Holdings</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Ticker</strong></TableCell>
                        <TableCell align="right"><strong>Dollar Value</strong></TableCell>
                        <TableCell align="right"><strong>Yield</strong></TableCell>
                        <TableCell align="right"><strong>Expense Ratio</strong></TableCell>
                        <TableCell><strong>Category/Industry</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysis.model_holdings?.map((holding: any) => (
                        <TableRow key={holding.ticker}>
                          <TableCell>{holding.ticker}</TableCell>
                          <TableCell align="right">
                            ${holding.dollar_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell align="right">
                            {(holding.yield * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell align="right">
                            {(holding.expense_ratio * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell>{holding.category}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}
    </Box>
  );
}