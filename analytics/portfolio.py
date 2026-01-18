
import numpy as np
from .data import get_current_prices, get_expense_ratios, get_investment_classifications, get_price_data, get_investment_details
from .performance import calculate_portfolio_returns, performance_stats, calculate_individual_returns, project_portfolio_returns, project_portfolio_with_fees
from .models import growth_rates, asset_volatility


class Portfolio:
    # Class-level cache for portfolio data
    _portfolio_cache = {}
    
    def __init__(self, portfolio_dollars, name, advisory_fee=0.0, asset_class_overrides=None):
        self.portfolio_dollars = portfolio_dollars
        self.name = name
        self.advisory_fee = advisory_fee
        self.total_value = sum(portfolio_dollars.values())
        
        # Calculate weights and get data - fetch in parallel
        tickers = list(portfolio_dollars.keys())
        
        # Create cache key based on tickers and overrides
        cache_key = f"{sorted(tickers)}_{asset_class_overrides}"
        
        # Check if we have cached data for this exact set of tickers
        if cache_key in Portfolio._portfolio_cache:
            cached_data = Portfolio._portfolio_cache[cache_key]
            self.current_prices = cached_data['prices']
            self.expense_ratios = cached_data['expense_ratios']
            self.classifications = cached_data['classifications']
        else:
            # Parallel data fetching
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=3) as executor:
                price_future = executor.submit(get_current_prices, tickers)
                expense_future = executor.submit(get_expense_ratios, tickers)
                classification_future = executor.submit(get_investment_classifications, tickers, asset_class_overrides)
                
                self.current_prices = price_future.result()
                self.expense_ratios = expense_future.result()
                self.classifications = classification_future.result()
            
            # Cache the results
            Portfolio._portfolio_cache[cache_key] = {
                'prices': self.current_prices,
                'expense_ratios': self.expense_ratios,
                'classifications': self.classifications
            }
        
        self.portfolio_weights = self._calculate_weights()
        self.weighted_avg_er = self._calculate_weighted_avg_er()
        self.asset_class_allocation = self._calculate_asset_class_allocation()
    
    def _calculate_weights(self):
        """Calculate portfolio weights based on dollar amounts."""
        weights = {}
        for ticker, dollar_amount in self.portfolio_dollars.items():
            weights[ticker] = dollar_amount / self.total_value
        return weights
    
    def _calculate_weighted_avg_er(self):
        """Calculate weighted average expense ratio."""
        return sum(self.portfolio_weights[ticker] * self.expense_ratios[ticker] 
                  for ticker in self.portfolio_weights.keys())
    
    def _calculate_asset_class_allocation(self):
        """Calculate allocation by asset class."""
        allocation = {}
        for ticker, weight in self.portfolio_weights.items():
            asset_class = self.classifications[ticker]
            allocation[asset_class] = allocation.get(asset_class, 0) + weight
        return allocation
    
    def analyze_historical_performance(self, start_date, end_date):
        """Analyze historical portfolio performance."""
        # Cache key based on portfolio composition and date range
        cache_key = f"{self.name}_{start_date}_{end_date}_{hash(frozenset(self.portfolio_weights.items()))}"
        
        # Check if we have cached results
        if hasattr(self, '_performance_cache') and cache_key in self._performance_cache:
            return self._performance_cache[cache_key]
        
        # Load historical data
        prices = get_price_data(list(self.portfolio_dollars.keys()), start_date, end_date)
        
        # Calculate returns with and without advisory fees
        returns_with_fees = calculate_portfolio_returns(
            prices, self.portfolio_weights, self.advisory_fee, self.expense_ratios
        )
        returns_no_advisory = calculate_portfolio_returns(
            prices, self.portfolio_weights, 0.0, self.expense_ratios
        )
        
        # Get performance statistics
        stats_with_fees, cumulative_with_fees = performance_stats(returns_with_fees)
        stats_no_advisory, cumulative_no_advisory = performance_stats(returns_no_advisory)
        
        # Individual asset returns
        individual_returns = calculate_individual_returns(prices)
        
        result = {
            'stats_with_fees': stats_with_fees,
            'stats_no_advisory': stats_no_advisory,
            'cumulative_with_fees': cumulative_with_fees,
            'cumulative_no_advisory': cumulative_no_advisory,
            'individual_returns': individual_returns,
            'actual_start_date': prices.index[0].strftime('%Y-%m-%d'),
            'actual_end_date': prices.index[-1].strftime('%Y-%m-%d')
        }
        
        # Cache the result
        if not hasattr(self, '_performance_cache'):
            self._performance_cache = {}
        self._performance_cache[cache_key] = result
        
        return result
    
    def project_future_returns(self, years=10):
        """Project future portfolio returns."""
        return project_portfolio_returns(self.asset_class_allocation, growth_rates, years)
    
    def project_future_with_fees(self, years=10):
        """Project future portfolio returns with detailed fee calculations."""
        total_fee_rate = self.weighted_avg_er + self.advisory_fee
        return project_portfolio_with_fees(self.asset_class_allocation, growth_rates, total_fee_rate, years)
    
    def calculate_forward_metrics(self, risk_free_rate=0.02):
        """Calculate estimated forward volatility and Sharpe ratio."""
        # Calculate weighted expected return
        expected_return = sum(
            self.asset_class_allocation.get(asset_class, 0) * growth_rate
            for asset_class, growth_rate in growth_rates.items()
        )
        
        # Calculate portfolio volatility using asset class volatilities
        portfolio_variance = 0
        for asset_class, weight in self.asset_class_allocation.items():
            volatility = asset_volatility.get(asset_class, 0)
            portfolio_variance += (weight ** 2) * (volatility ** 2)
        
        # For simplicity, we're not considering correlations between asset classes
        # In practice, you'd want to include a correlation matrix
        portfolio_volatility = portfolio_variance ** 0.5
        
        # Calculate Sharpe ratio
        excess_return = expected_return - risk_free_rate
        sharpe_ratio = excess_return / portfolio_volatility if portfolio_volatility > 0 else 0
        
        return {
            'expected_return': expected_return,
            'portfolio_volatility': portfolio_volatility,
            'sharpe_ratio': sharpe_ratio
        }
    
    def get_portfolio_summary(self):
        """Get a summary of portfolio composition."""
        summary = {
            'name': self.name,
            'total_value': self.total_value,
            'portfolio_weights': self.portfolio_weights,
            'asset_class_allocation': self.asset_class_allocation,
            'weighted_avg_er': self.weighted_avg_er,
            'advisory_fee': self.advisory_fee,
            'total_fees': self.weighted_avg_er + self.advisory_fee,
            'holdings': []
        }
        
        for ticker, weight in self.portfolio_weights.items():
            dollar_amount = self.portfolio_dollars[ticker]
            shares = dollar_amount / self.current_prices[ticker]
            summary['holdings'].append({
                'ticker': ticker,
                'dollar_amount': dollar_amount,
                'weight': weight,
                'shares': shares,
                'price': self.current_prices[ticker],
                'expense_ratio': self.expense_ratios[ticker],
                'classification': self.classifications[ticker]
            })
        
        return summary
    
    def get_detailed_holdings(self):
        """Get detailed information about portfolio holdings."""
        details = get_investment_details(list(self.portfolio_dollars.keys()))
        
        holdings_info = []
        for ticker in self.portfolio_weights.keys():
            holdings_info.append({
                'ticker': ticker,
                'name': details[ticker]['name'],
                'dollar_value': self.portfolio_dollars[ticker],
                'weight': self.portfolio_weights[ticker],
                'yield': details[ticker]['yield'],
                'expense_ratio': self.expense_ratios[ticker],  # Use pre-fetched expense ratios
                'category': details[ticker]['category']
            })
        
        return holdings_info
