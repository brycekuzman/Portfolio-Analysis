
# Portfolio Analysis Web Application

## Overview

This is a modern, professional full-stack financial portfolio analysis application. It compares user portfolios against optimized model portfolios, analyzing historical performance, projecting future returns, and providing detailed fee breakdowns to help users make informed investment decisions.

**Architecture**: React + TypeScript frontend communicating with a FastAPI backend, both leveraging a shared Python analytics engine.

## Recent Changes (December 2025)

**Aggregate Portfolio View**
- Added "Aggregate Portfolio" option in portfolio dropdown when 2+ portfolios exist
- Shows combined holdings across all portfolios in read-only mode
- Backend `/analyze-aggregate` endpoint combines per-portfolio projections
- Respects each portfolio's account type for proper tax treatment before aggregating
- Displays combined yearly projections, fees, taxes, and cash flows
- Info banner shows number of combined portfolios

**Tax-Aware Multi-Portfolio Analysis**
- Added Tax Rate input field (global) in the left panel footer
- Added Annual Cash Flow input field (per portfolio) in Portfolio Management Modal
- Implemented account type tax treatment:
  - Brokerage: Taxes applied on gains each year
  - Roth IRA: Tax exempt (no taxes during accumulation or withdrawal)
  - Traditional IRA: Tax deferred with liability tracking (full balance taxable on withdrawal)
- New projection calculation order: Starting Value → Cash Flow → Growth → Taxes → Fees → Ending Value
- Projection tables now show conditional rows: Cash Flow, Taxes, Fees, Deferred Tax Liability
- Projections now display actual dollar amounts instead of normalized values

**Previous: Rebuilt Left Panel with Professional UI Design (November 2025)**
- Redesigned portfolio input panel with icon header and branding
- Implemented portfolio selector with add/import action buttons
- Created streamlined ticker + value input form (horizontal layout)
- Built holdings display as editable cards with asset class dropdowns
- Added bottom footer section with total assets and fee management
- Matched design specifications: minimalist aesthetic with blue accents
- Optimized responsive scrolling for holdings list

**Previous: Refactored from Streamlit to Modern Full-Stack Architecture (October 2025)**
- Migrated from monolithic Streamlit app to separate frontend and backend
- Built FastAPI REST API exposing analytics functionality
- Created React + TypeScript frontend with Material-UI
- Preserved all existing analytics modules without modification
- Maintained feature parity with original Streamlit version

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

**Modern Full-Stack Design**
The application uses a three-tier architecture:

1. **Frontend (React + TypeScript)** - `frontend/`
   - Vite build tool for fast development
   - Material-UI component library for professional design
   - Plotly.js for interactive data visualizations
   - Real-time ticker validation via API calls
   - Runs on port 5000 (user-facing)

2. **Backend API (FastAPI)** - `backend/`
   - RESTful API with three main routers:
     - `/api/ticker`: Ticker validation and information
     - `/api/portfolio`: Portfolio analysis and projections
     - `/api/models`: Model portfolio data
   - CORS enabled for frontend communication
   - Runs on port 8000

3. **Analytics Engine (Python)** - `analytics/`
   - Shared by both legacy and new architecture
   - Pure calculation and data retrieval modules
   - No changes from original implementation

**Modular Analytics Engine**
The application follows a separation of concerns pattern with specialized modules:
- `portfolio.py`: Core Portfolio class encapsulating portfolio state and analysis methods
- `performance.py`: Pure calculation functions for returns, statistics, and projections
- `data.py`: Data retrieval layer with ticker validation and yfinance API interactions
- `models.py`: Configuration layer defining model portfolios, growth rates, and fees
- `user_input.py`: Portfolio matching algorithms using cosine similarity
- `reporting.py`: Visualization generation utilities

### Key Features

**Interactive Portfolio Input**
- Dynamic ticker entry with real-time validation
- Automatic investment name lookup
- Asset class classification with manual override capability
- Add/remove holdings with live portfolio value updates
- Adjustable advisory fee settings

**Comprehensive Analysis**
1. **10-Year Forward Projections**: Monte Carlo simulations showing portfolio growth trajectories
2. **Fee Comparison**: Annual and cumulative fee analysis with potential savings calculations
3. **Historical Performance**: Actual performance comparison using market data (2015-2025)
4. **Asset Allocation**: Interactive pie charts comparing current vs recommended portfolios
5. **Model Portfolio Matching**: Automatic recommendation based on asset allocation similarity

**Professional Visualizations**
- Plotly interactive charts with hover details
- Side-by-side portfolio comparisons
- Growth trajectory projections
- Fee impact visualizations
- Asset allocation breakdowns

### Data Processing Architecture

**Portfolio Analysis Workflow**
1. User provides portfolio holdings as dollar amounts per ticker
2. System validates tickers and fetches current prices from Yahoo Finance
3. Portfolio weights calculated automatically
4. Historical price data retrieved for performance analysis
5. Returns calculated with fee adjustments (advisory fees + expense ratios)
6. Performance statistics computed (returns, volatility, Sharpe ratio, drawdowns)
7. Portfolio matched against five pre-defined model portfolios using cosine similarity
8. Comparative analysis generated between current and recommended portfolios

**Ticker Validation & Classification**
- Real-time ticker validation using yfinance API
- Automatic investment name lookup and display
- Intelligent asset class classification (US Equities, International Equities, Core Fixed Income, Alternatives)
- User override capability for asset class assignments
- Persistent classification preferences during session

**Fee Calculation Strategy**
- Advisory fees applied as daily compounding deductions: `(1 - annual_fee)^(1/252)`
- Expense ratios handled per-ticker and weighted by portfolio allocation
- Separate tracking of returns with and without fees for transparency
- Annual and 10-year cumulative fee comparisons

**Asset Classification System**
The application maps individual tickers to broader asset classes to:
- Enable portfolio-level allocation analysis
- Support model portfolio matching based on asset class similarity
- Calculate asset class-specific projections using configured growth rates
- Allow manual classification overrides when automatic detection is incorrect

### Data Handling Patterns

**Date Range Normalization**
The system handles data availability mismatches by finding the common date range where all tickers have historical data. This prevents analysis failures when different assets have different data availability windows.

**Single vs Multi-Ticker Handling**
The yfinance API returns different data structures for single tickers vs multiple tickers. The data layer normalizes these differences to provide consistent downstream interfaces.

**Price Data Standardization**
Uses adjusted close prices with auto-adjustment enabled to account for splits and dividends. Falls back to 'Close' when adjusted data unavailable.

### Projection and Modeling

**Future Return Projections**
- Uses configurable growth rates per asset class (defined in `models.py`)
- Applies Monte Carlo simulation with asset class-specific volatility
- Projects 10-year scenarios to compare current vs model portfolios
- Accounts for ongoing fee impacts on long-term returns

**Model Portfolio Strategy**
The application defines five risk-based model portfolios (Conservative to Aggressive) using standard ETFs:
- VOO: US Equities (S&P 500)
- VXUS: International Equities
- BND: Core Fixed Income (Bonds)
- VNQ: Alternatives (Real Estate)

Model portfolios use a standardized low advisory fee (0.25%) to demonstrate fee savings potential.

### React Frontend Features

**Modern Material Design**
The React frontend provides a clean, professional dashboard:
- Material-UI components for consistent styling
- Responsive layout that works on all screen sizes
- Light theme with professional color palette
- Type-safe TypeScript throughout

**Interactive Components**
1. **PortfolioInput**: Dynamic ticker table with:
   - Real-time validation calling backend API
   - Add/remove holdings
   - Advisory fee adjustment
   - Asset class override dropdowns
   - Total portfolio value display

2. **AnalysisResults**: Tabbed dashboard showing:
   - 10-year projections chart
   - Fee comparison visualizations
   - Historical performance graphs
   - Asset allocation pie charts

**API Integration**
- Axios-based service layer (`services/api.ts`)
- Type-safe request/response models
- Error handling with user-friendly messages
- Environment-based API URL configuration

**Key Visualizations**
All visualizations use Plotly.js for interactivity:
1. **Projections Tab**: Line chart comparing 10-year growth trajectories
2. **Fees Tab**: Bar chart showing annual and cumulative fee differences
3. **Historical Performance Tab**: Time-series chart with actual market data
4. **Asset Allocation Tab**: Side-by-side pie charts comparing portfolios

## External Dependencies

### Financial Data APIs

**Yahoo Finance (yfinance)**
- Primary data source for historical and current price data
- Ticker validation and investment name lookup
- Provides adjusted close prices accounting for splits and dividends
- No authentication required (public data)
- Rate limiting may apply for high-frequency requests

### Python Libraries

**Data Processing**
- `pandas`: DataFrame operations for time-series financial data
- `numpy`: Numerical computations for returns, statistics, and projections

**Visualization**
- `plotly`: Interactive charts for web interface
- `matplotlib`: Utility support for data visualization

**Backend Framework**
- `fastapi`: Modern async web framework for the REST API
- `uvicorn`: ASGI server for running FastAPI
- `pydantic`: Data validation and serialization

**Frontend Framework**
- `react`: UI library for building interactive interfaces  
- `vite`: Fast build tool and development server
- `typescript`: Type-safe JavaScript
- `@mui/material`: Material-UI component library
- `react-plotly.js`: Plotly wrapper for React
- `axios`: HTTP client for API calls

### Configuration Data

**Model Portfolios**
Hard-coded model portfolio allocations and parameters in `models.py`:
- Five risk-based portfolio templates (Conservative to Aggressive)
- Asset class growth rate assumptions
- Asset class volatility parameters for Monte Carlo simulations
- Model advisory fee configuration (0.25% standard)

**No Database (Current)**
The application currently operates in-memory with no persistent storage. Portfolio data is session-based, and historical data is fetched on-demand from Yahoo Finance. Future enhancements may add PostgreSQL for saving portfolios and analysis history.

## Running the Application

The application runs two separate services:

**Backend API** (Port 8000):
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend** (Port 5000):
```bash
cd frontend && npm run dev
```

Both services are configured as Replit workflows and start automatically. Access the web interface at port 5000 (webview enabled).
