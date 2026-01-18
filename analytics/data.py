import yfinance as yf
import pandas as pd
from datetime import datetime
from .cache import cache_with_ttl, get_ticker_info_batch


def get_available_date_range(tickers, start, end):
    """Find the common date range where all tickers have data."""
    latest_start = start

    for ticker in tickers:
        # Get a small sample to find actual start date
        sample = yf.download(ticker, start=start, end=end, auto_adjust=True, prepost=True, threads=True)
        if not sample.empty:
            actual_start = sample.index[0].strftime('%Y-%m-%d')
            if actual_start > latest_start:
                latest_start = actual_start

    return latest_start, end


@cache_with_ttl(ttl_seconds=3600)  # Cache for 1 hour
def get_price_data(tickers, start, end):
    """Download adjusted close prices for tickers."""
    # Find common date range
    actual_start, actual_end = get_available_date_range(tickers, start, end)

    if actual_start != start:
        print(f"Note: Adjusted start date from {start} to {actual_start} due to limited data availability")

    data = yf.download(tickers, start=actual_start, end=actual_end, auto_adjust=True, prepost=True, threads=True)

    # Handle single vs multiple tickers
    if len(tickers) == 1:
        # For single ticker, data structure is different
        if 'Close' in data.columns:
            prices = data['Close']
        else:
            prices = data
    else:
        # For multiple tickers, extract Close prices
        if 'Close' in data.columns.get_level_values(0):
            prices = data['Close']
        else:
            # Fallback to Adj Close if available
            prices = data['Adj Close']

    return prices


@cache_with_ttl(ttl_seconds=3600)  # Cache for 1 hour
def validate_ticker(ticker):
    """Validate if a ticker exists and return its info."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        # Check if we got valid data
        if not info or 'symbol' not in info:
            return False, None

        return True, info
    except Exception as e:
        return False, None


@cache_with_ttl(ttl_seconds=3600)  # Cache for 1 hour
def get_investment_name(ticker):
    """Get the full name of an investment."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        # Try different possible keys for the name
        if 'longName' in info:
            return info['longName']
        elif 'shortName' in info:
            return info['shortName']
        elif 'name' in info:
            return info['name']
        else:
            return ticker
    except Exception as e:
        return ticker


@cache_with_ttl(ttl_seconds=300)  # Cache for 5 minutes (prices change frequently)
def get_current_prices(tickers):
    """Get current prices for tickers to calculate portfolio weights."""
    data = yf.download(tickers, period="1d", interval="1d", auto_adjust=True, prepost=True, threads=True)

    if len(tickers) == 1:
        # For single ticker
        current_price = data['Close'].iloc[-1]
        return {tickers[0]: current_price}
    else:
        # For multiple tickers
        current_prices = {}
        for ticker in tickers:
            current_prices[ticker] = data['Close'][ticker].iloc[-1]
        return current_prices


@cache_with_ttl(ttl_seconds=86400)  # Cache for 24 hours (expense ratios rarely change)
def get_expense_ratios(tickers):
    """Get expense ratios for ETFs, Mutual Funds, and SMAs from yfinance."""
    expense_ratios = {}

    # Batch fetch all ticker info at once
    info_dict = get_ticker_info_batch(list(tickers))

    for ticker in tickers:
        try:
            info = info_dict.get(ticker, {})
            if not info:
                raise Exception("No info available")

            # Try different possible keys for expense ratio
            expense_ratio = None
            if 'expenseRatio' in info:
                expense_ratio = info['expenseRatio']
            elif 'annualReportExpenseRatio' in info:
                expense_ratio = info['annualReportExpenseRatio']
            elif 'netExpenseRatio' in info:
                expense_ratio = info['netExpenseRatio']

            # If found, store it; otherwise default to 0
            # Convert from percentage (e.g., 0.07) to decimal (e.g., 0.0007)
            if expense_ratio is not None:
                expense_ratios[ticker] = expense_ratio / 100.0
            else:
                expense_ratios[ticker] = 0.0

        except Exception as e:
            print(f"Could not fetch expense ratio for {ticker}: {e}")
            expense_ratios[ticker] = 0.0

    return expense_ratios


@cache_with_ttl(ttl_seconds=3600)  # Cache for 1 hour
def classify_investment(ticker, info=None):
    """Classify investment into US Equities, International Equities, Core Fixed Income, or Alternatives."""

    # Common patterns for automatic classification
    us_equity_patterns = ['SPY', 'QQQ', 'VTI', 'VOO', 'IWM', 'DIA']
    intl_equity_patterns = ['VXUS', 'VEA', 'VWO', 'IEFA', 'IEMG', 'EFA', 'EEM', 'IEUR']
    fixed_income_patterns = ['AGG', 'BND', 'VGIT', 'VGLT', 'TLT', 'SHY', 'IEF', 'PULS', 'BNDX', 'IAGG', 'BWX']
    alternatives_patterns = ['VNQ', 'VNQI', 'REM', 'DBC', 'DBA', 'GLD', 'SLV', 'USO', 'AMLP', 'QAI', 'PUTW', 'TAIL']

    # Check for common patterns first
    if ticker in us_equity_patterns:
        return "US Equities"
    elif ticker in intl_equity_patterns:
        return "International Equities"
    elif ticker in fixed_income_patterns:
        return "Core Fixed Income"
    elif ticker in alternatives_patterns:
        return "Alternatives"

    # Try to get info from yfinance
    try:
        if info is None:
            stock = yf.Ticker(ticker)
            info = stock.info

        # Check category based on yfinance data
        category = info.get('category', '').lower()
        fund_family = info.get('fundFamily', '').lower()
        asset_class = info.get('assetClass', '').lower()

        # Alternatives indicators (real estate, commodities, MLPs, hedged strategies)
        if any(keyword in category for keyword in ['reit', 'real estate', 'commodity', 'commodities', 'mlp', 'master limited partnership', 'hedge', 'managed futures', 'long-short', 'market neutral']):
            return "Alternatives"
        elif 'real estate' in fund_family or 'reit' in fund_family:
            return "Alternatives"

        # US Equity indicators
        elif any(keyword in category for keyword in ['large blend', 'large growth', 'large value', 'mid blend', 'mid growth', 'mid value', 'small blend', 'small growth', 'small value']):
            return "US Equities"
        elif 'equity' in category and ('us' in category or 'domestic' in category):
            return "US Equities"
        elif ticker.endswith('.TO') or ticker.endswith('.L') or ticker.endswith('.F'):
            return "International Equities"

        # International Equity indicators
        elif any(keyword in category for keyword in ['foreign', 'international', 'emerging', 'developed', 'europe', 'asia', 'pacific']):
            return "International Equities"
        elif 'equity' in category and any(keyword in category for keyword in ['intl', 'global', 'world']):
            return "International Equities"

        # Bond/Fixed Income indicators
        elif any(keyword in category for keyword in ['bond', 'fixed', 'treasury', 'corporate bond', 'government']):
            return "Core Fixed Income"
        elif 'bond' in asset_class or 'fixed' in asset_class:
            return "Core Fixed Income"

        # If it's a stock (not fund), classify based on exchange/country
        elif info.get('quoteType') == 'EQUITY':
            country = info.get('country', '').lower()
            if country in ['united states', 'usa', 'us']:
                return "US Equities"
            elif country and country not in ['united states', 'usa', 'us']:
                return "International Equities"

    except Exception as e:
        print(f"Could not fetch classification info for {ticker}: {e}")

    # If we can't determine automatically, return None to prompt user
    return None


def get_investment_classifications(tickers, overrides=None):
    """Get classifications for all investments, using overrides if provided."""
    classifications = {}
    overrides = overrides or {}

    # Batch fetch info for tickers that need classification
    tickers_to_fetch = [t for t in tickers if t not in overrides]
    info_dict = get_ticker_info_batch(tickers_to_fetch) if tickers_to_fetch else {}

    for ticker in tickers:
        # Check if user has overridden the classification
        if ticker in overrides:
            classifications[ticker] = overrides[ticker]
        else:
            info = info_dict.get(ticker)
            auto_classification = classify_investment(ticker, info)

            if auto_classification:
                classifications[ticker] = auto_classification
            else:
                # Default to US Equities if cannot classify
                classifications[ticker] = "US Equities"

    return classifications


@cache_with_ttl(ttl_seconds=3600)  # Cache for 1 hour
def get_investment_details(tickers):
    """Get detailed information about investments including yield, fees, and other metrics."""
    details = {}

    # Batch fetch all ticker info at once
    info_dict = get_ticker_info_batch(list(tickers))

    for ticker in tickers:
        try:
            info = info_dict.get(ticker, {})
            if not info:
                raise Exception("No info available")

            # Determine if it's a stock or fund
            quote_type = info.get('quoteType', '')

            # For stocks, use sector/industry format; for funds, use category
            if quote_type == 'EQUITY':
                sector = info.get('sector', '')
                industry = info.get('industry', '')

                if sector and industry:
                    category = f"{sector}/{industry}"
                elif sector:
                    category = sector
                elif industry:
                    category = industry
                else:
                    category = 'N/A'
            else:
                category = info.get('category', 'N/A')

            # Extract relevant information - values are in decimal form (e.g., 0.02 = 2%)
            expense_ratio = info.get('expenseRatio', info.get('annualReportExpenseRatio', 0)) or 0

            # Get yield - use dividendYield for all investments (stocks and ETFs)
            # dividendYield comes in percentage form (e.g., 1.75 = 1.75%), so convert to decimal
            dividend_yield = info.get('dividendYield', 0) or 0
            yield_value = dividend_yield / 100.0 if dividend_yield else 0

            details[ticker] = {
                'yield': yield_value,
                'expense_ratio': expense_ratio,  # In decimal form (e.g., 0.02 = 2%)
                'category': category,
                'name': info.get('longName', info.get('shortName', ticker))
            }

        except Exception as e:
            print(f"Could not fetch details for {ticker}: {e}")
            details[ticker] = {
                'yield': 0,
                'expense_ratio': 0,
                'category': 'N/A',
                'name': ticker
            }

    return details