
# Portfolio Analysis Web Application

A modern, interactive financial portfolio analysis tool built with React and FastAPI that helps investors compare their current portfolios against optimized model portfolios.

## Overview

This application provides comprehensive portfolio analysis including:

- **10-Year Forward Projections**: Monte Carlo simulations showing potential growth trajectories
- **Fee Impact Analysis**: Detailed breakdown of advisory fees and expense ratios on long-term returns
- **Historical Performance**: Compare actual portfolio performance using market data from 2015-2025
- **Asset Allocation Analysis**: Visual comparison of current vs recommended portfolio allocations
- **Model Portfolio Matching**: Automatic recommendation based on your current asset allocation

## Architecture

This is a full-stack application with three main components:

1. **Frontend (React + TypeScript)** - Modern web interface running on port 5000
2. **Backend API (FastAPI)** - REST API running on port 8000
3. **Analytics Engine (Python)** - Shared calculation modules

## Features

### Interactive Portfolio Input
- Add investments by ticker symbol with real-time validation
- Automatic investment name lookup and classification
- Manual asset class override capability
- Dynamic portfolio value calculations
- Adjustable advisory fee settings
- E*TRADE brokerage integration for importing holdings

### Comprehensive Analysis Tools

**Forward Projections**
- 10-year growth scenarios using Monte Carlo simulations
- Asset class-specific growth rates and volatility assumptions
- Compare current portfolio vs optimized model portfolios

**Fee Comparison**
- Annual fee breakdown (advisory fees + expense ratios)
- 10-year cumulative fee impact
- Potential savings calculations
- Side-by-side fee structure comparisons

**Historical Performance**
- Actual performance metrics from 2015-2025
- Total return, annualized return, and volatility
- Maximum drawdown analysis
- Sharpe ratio calculations
- Performance with and without advisory fees

**Asset Allocation**
- Interactive pie charts with consistent color coding
- Side-by-side current vs model portfolio comparison
- Detailed holdings breakdown with yields and expense ratios

### Model Portfolios

Five pre-configured risk-based portfolios using low-cost ETFs:

- **Conservative**: 20% US Equities, 10% International, 60% Bonds, 10% Alternatives
- **Moderately Conservative**: 30% US Equities, 20% International, 40% Bonds, 10% Alternatives
- **Moderate**: 40% US Equities, 25% International, 25% Bonds, 10% Alternatives
- **Moderately Aggressive**: 50% US Equities, 30% International, 10% Bonds, 10% Alternatives
- **Aggressive**: 60% US Equities, 35% International, 0% Bonds, 5% Alternatives

All model portfolios use standard low-cost ETFs:
- VOO (S&P 500)
- VXUS (International Equities)
- BND (Core Bonds)
- VNQ (Real Estate)

## Technology Stack

### Frontend
- **React** with **TypeScript**: Modern UI framework
- **Material-UI (MUI)**: Professional component library
- **Plotly.js**: Interactive charts and visualizations
- **Vite**: Fast build tool and dev server

### Backend
- **FastAPI**: Modern Python web framework
- **Uvicorn**: ASGI server
- **CORS middleware**: Enabled for frontend communication

### Analytics Engine
- **yfinance**: Yahoo Finance API for market data
- **pandas**: Time-series data manipulation
- **numpy**: Numerical computations and statistics

### Data Sources
- Yahoo Finance for historical prices and investment information
- No authentication required for public market data
- Real-time ticker validation and data retrieval

## Running the Application

The application uses two workflows that run in parallel:

1. **Backend API**: `uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`
2. **Frontend**: `cd frontend && npm run dev`

Simply click the **Run** button in Replit to start both services.

The frontend will be available on port 5000 (the user-facing port).

## Application Structure

```
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── PortfolioInput.tsx
│   │   │   ├── AnalysisResults.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── services/
│   │   │   └── api.ts         # API client
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   └── vite.config.ts
├── backend/                    # FastAPI REST API
│   ├── api/
│   │   └── routers/
│   │       ├── ticker.py      # Ticker validation endpoints
│   │       ├── portfolio.py   # Portfolio analysis endpoints
│   │       ├── models.py      # Model portfolio endpoints
│   │       └── etrade.py      # E*TRADE integration
│   └── main.py                # FastAPI app entry point
├── analytics/                  # Core analytics engine (shared)
│   ├── portfolio.py           # Core Portfolio class
│   ├── performance.py         # Returns and statistics
│   ├── data.py               # Data retrieval and validation
│   ├── models.py             # Model portfolio definitions
│   ├── user_input.py         # Portfolio matching algorithms
│   ├── reporting.py          # Visualization utilities
│   ├── cache.py              # Caching layer
│   └── etrade_client.py      # E*TRADE API integration
├── app.py                     # Legacy Streamlit app (deprecated)
└── README.md                  # This file
```

## API Endpoints

### Ticker Validation
- `GET /api/ticker/validate/{ticker}` - Validate a ticker symbol
- `GET /api/ticker/info/{ticker}` - Get detailed ticker information

### Portfolio Analysis
- `POST /api/portfolio/analyze` - Analyze portfolio and get recommendations
- `POST /api/portfolio/project` - Generate 10-year projections

### Model Portfolios
- `GET /api/models` - Get all model portfolio definitions

### E*TRADE Integration (Optional)
- `GET /api/etrade/auth-url` - Get OAuth authorization URL
- `POST /api/etrade/token` - Exchange verification code for access token
- `GET /api/etrade/accounts` - List E*TRADE accounts
- `GET /api/etrade/holdings` - Get holdings from selected accounts

## How to Use

### 1. Enter Your Portfolio
- Add ticker symbols for your investments (e.g., VOO, BND, AAPL)
- Enter the dollar value for each holding
- The app will automatically fetch current prices and classify investments

### 2. Set Your Advisory Fee
- Enter your current annual advisory fee percentage
- This will be used to calculate fee impact on returns

### 3. Review Asset Classification
- The app automatically classifies investments into asset classes
- You can manually override classifications if needed

### 4. Run Analysis
- Click "Analyze Portfolio" to generate comprehensive analysis
- View side-by-side comparisons with recommended model portfolio
- Explore historical performance, projections, and fee impacts

### 5. Interpret Results
- **Recommended Model**: Based on your current asset allocation
- **Fee Savings**: Potential annual and 10-year savings
- **Performance**: Historical returns and forward projections
- **Holdings Details**: Yields, expense ratios, and categorization

## Key Metrics Explained

**Total Return**: Overall percentage gain/loss over the period  
**Annualized Return**: Average annual return (CAGR)  
**Volatility**: Standard deviation of returns (risk measure)  
**Sharpe Ratio**: Risk-adjusted return metric (higher is better)  
**Max Drawdown**: Largest peak-to-trough decline

## Investment Classifications

- **US Equities**: Domestic stocks and stock funds
- **International Equities**: Non-US stocks and international funds
- **Core Fixed Income**: Bonds and bond funds
- **Alternatives**: Real estate, commodities, and alternative investments

## Optional Features

### E*TRADE Integration
The application includes optional E*TRADE API integration for importing portfolio data directly from your brokerage account. See `ETRADE_SETUP.md` for configuration instructions.

## Disclaimers

This tool is for educational and informational purposes only. It is not investment advice. Past performance does not guarantee future results. Consult with a qualified financial advisor before making investment decisions.

## Privacy & Data

- No data is stored permanently
- All portfolio information is session-based
- Historical data fetched on-demand from public APIs
- No personal information is collected or transmitted

## Support

For issues or questions, refer to the Replit workspace or check the console logs for error messages.
