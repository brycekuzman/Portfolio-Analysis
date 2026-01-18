
import yfinance as yf
from datetime import datetime, timedelta
from functools import wraps
import time

# Simple in-memory cache with TTL
_cache = {}
_cache_timestamps = {}

def cache_with_ttl(ttl_seconds=3600):
    """Decorator to cache function results with time-to-live."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            # Check if cached and not expired
            if cache_key in _cache:
                cached_time = _cache_timestamps.get(cache_key, 0)
                if time.time() - cached_time < ttl_seconds:
                    return _cache[cache_key]
            
            # Call function and cache result
            result = func(*args, **kwargs)
            _cache[cache_key] = result
            _cache_timestamps[cache_key] = time.time()
            
            return result
        return wrapper
    return decorator

def clear_cache():
    """Clear all cached data."""
    _cache.clear()
    _cache_timestamps.clear()

def get_ticker_info_batch(tickers):
    """Fetch ticker info for multiple tickers with parallel processing."""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    info_dict = {}
    
    def fetch_ticker_info(ticker):
        try:
            stock = yf.Ticker(ticker)
            return ticker, stock.info
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            return ticker, None
    
    # Use ThreadPoolExecutor for parallel API calls
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_ticker_info, ticker): ticker for ticker in tickers}
        
        for future in as_completed(futures):
            ticker, info = future.result()
            info_dict[ticker] = info
    
    return info_dict
