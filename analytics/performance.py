import numpy as np
import pandas as pd

def calculate_portfolio_returns(prices, weights, advisory_fee=0.0, expense_ratios=None):
    returns = prices.pct_change().dropna()
    # Ensure weights match the order of columns in returns DataFrame
    weights_array = np.array([weights[col] for col in returns.columns])
    port_returns = returns.dot(weights_array)

    # Deduct advisory fee daily
    daily_advisory = (1 - advisory_fee) ** (1/252)
    port_returns = (1 + port_returns) * daily_advisory - 1

    # Deduct expense ratios daily
    if expense_ratios:
        for ticker, weight in weights.items():
            er = expense_ratios.get(ticker, 0.0)
            if er > 0:
                daily_er = (1 - er) ** (1/252)
                port_returns = (1 + port_returns) * (daily_er ** weight) - 1

    return port_returns

def calculate_individual_returns(prices):
    """Calculate total return for each individual asset."""
    individual_returns = {}
    
    for ticker in prices.columns:
        start_price = prices[ticker].iloc[0]
        end_price = prices[ticker].iloc[-1]
        total_return = (end_price - start_price) / start_price
        individual_returns[ticker] = total_return
    
    return individual_returns


def performance_stats(port_returns, risk_free=0.02):
    cumulative = (1 + port_returns).cumprod()
    total_return = cumulative.iloc[-1] - 1
    annualized_return = (1 + total_return) ** (252/len(port_returns)) - 1
    volatility = port_returns.std() * np.sqrt(252)
    sharpe = (annualized_return - risk_free) / volatility
    max_dd = ((cumulative / cumulative.cummax()) - 1).min()

    return {
        "Total Return": total_return,
        "Annualized Return": annualized_return,
        "Volatility": volatility,
        "Sharpe Ratio": sharpe,
        "Max Drawdown": max_dd
    }, cumulative



def project_portfolio_returns(asset_class_allocation, growth_rates, years=10):
    """
    Project portfolio returns based on asset class allocations and growth rates.
    
    Args:
        asset_class_allocation: Dict of asset class -> weight
        growth_rates: Dict of asset class -> annual growth rate
        years: Number of years to project
    
    Returns:
        Dict with projection results
    """
    # Calculate weighted average annual return
    weighted_annual_return = sum(
        asset_class_allocation.get(asset_class, 0) * growth_rate
        for asset_class, growth_rate in growth_rates.items()
    )
    
    # Calculate total return over the projection period
    total_projected_return = (1 + weighted_annual_return) ** years - 1
    
    # Calculate year-by-year projections
    yearly_projections = []
    portfolio_value = 1.0  # Start with $1
    
    for year in range(1, years + 1):
        portfolio_value *= (1 + weighted_annual_return)
        yearly_projections.append({
            'year': year,
            'portfolio_value': portfolio_value,
            'annual_return': weighted_annual_return,
            'cumulative_return': portfolio_value - 1
        })
    
    return {
        'weighted_annual_return': weighted_annual_return,
        'total_projected_return': total_projected_return,
        'final_portfolio_value': portfolio_value,
        'yearly_projections': yearly_projections
    }


def project_portfolio_with_fees(asset_class_allocation, growth_rates, total_fee_rate, years=10):
    """
    Project portfolio returns with year-by-year fee calculations.
    
    Args:
        asset_class_allocation: Dict of asset class -> weight
        growth_rates: Dict of asset class -> annual growth rate
        total_fee_rate: Combined expense ratio + advisory fee (as decimal, e.g., 0.01 for 1%)
        years: Number of years to project
    
    Returns:
        Dict with detailed year-by-year projections including fees
    """
    # Calculate weighted average annual return (before fees)
    weighted_annual_return = sum(
        asset_class_allocation.get(asset_class, 0) * growth_rate
        for asset_class, growth_rate in growth_rates.items()
    )
    
    # Calculate year-by-year projections with fees
    yearly_projections = []
    portfolio_value = 1.0  # Start with $1
    total_fees = 0.0
    
    for year in range(1, years + 1):
        starting_value = portfolio_value
        growth = starting_value * weighted_annual_return
        # Fee is calculated on the ending value (after growth)
        fees = (starting_value + growth) * total_fee_rate
        ending_value = starting_value + growth - fees
        
        portfolio_value = ending_value
        total_fees += fees
        
        yearly_projections.append({
            'year': year,
            'starting_value': starting_value,
            'growth': growth,
            'fees': fees,
            'ending_value': ending_value,
            'annual_return': weighted_annual_return
        })
    
    return {
        'weighted_annual_return': weighted_annual_return,
        'final_portfolio_value': portfolio_value,
        'total_fees': total_fees,
        'yearly_projections': yearly_projections
    }


def project_portfolio_with_taxes(
    asset_class_allocation, 
    growth_rates, 
    total_fee_rate, 
    initial_value=1.0,
    annual_cash_flow=0.0,
    tax_rate=0.0,
    account_type='Brokerage',
    years=10
):
    """
    Project portfolio returns with taxes, cash flows, and fees.
    
    Order of operations per year:
    1. Starting Value
    2. + Cash Flow (added at beginning of year)
    3. Growth (on adjusted balance)
    4. - Taxes (on growth, if applicable based on account type)
    5. - Fees
    6. = Ending Value
    
    Tax treatment by account type:
    - Brokerage: Taxable - applies tax rate to gains each year
    - Roth IRA: Tax Exempt - no taxes ever
    - Traditional IRA: Tax Deferred - no taxes during accumulation, tracks deferred liability
    
    Args:
        asset_class_allocation: Dict of asset class -> weight
        growth_rates: Dict of asset class -> annual growth rate
        total_fee_rate: Combined expense ratio + advisory fee (as decimal)
        initial_value: Starting portfolio value (default 1.0 for normalized)
        annual_cash_flow: Annual contribution (+) or withdrawal (-) amount
        tax_rate: Tax rate as decimal (e.g., 0.25 for 25%)
        account_type: 'Brokerage', 'Roth IRA', or 'Traditional IRA'
        years: Number of years to project
    
    Returns:
        Dict with detailed year-by-year projections including taxes and cash flows
    """
    # Calculate weighted average annual return (before fees and taxes)
    weighted_annual_return = sum(
        asset_class_allocation.get(asset_class, 0) * growth_rate
        for asset_class, growth_rate in growth_rates.items()
    )
    
    # Determine tax behavior based on account type
    is_taxable = account_type == 'Brokerage'
    is_tax_deferred = account_type == 'Traditional IRA'
    
    # Calculate year-by-year projections
    yearly_projections = []
    portfolio_value = initial_value
    total_fees = 0.0
    total_taxes = 0.0
    total_cash_flows = 0.0
    total_contributions = initial_value  # Track basis for Traditional IRA
    deferred_tax_liability = 0.0  # Initialize for all account types
    
    for year in range(1, years + 1):
        starting_value = portfolio_value
        
        # Step 1: Add cash flow at beginning of year
        after_cash_flow = starting_value + annual_cash_flow
        total_cash_flows += annual_cash_flow
        
        # Track contributions for Traditional IRA basis (cash flows are pre-tax contributions)
        if is_tax_deferred and annual_cash_flow > 0:
            total_contributions += annual_cash_flow
        
        # Step 2: Calculate growth on adjusted balance
        growth = after_cash_flow * weighted_annual_return
        after_growth = after_cash_flow + growth
        
        # Step 3: Calculate and apply taxes (based on account type)
        if is_taxable and tax_rate > 0:
            # Brokerage: Tax on gains each year
            taxes = growth * tax_rate
        else:
            # Roth IRA or Traditional IRA: No taxes during accumulation
            taxes = 0.0
        
        after_taxes = after_growth - taxes
        total_taxes += taxes
        
        # Step 4: Calculate and apply fees
        fees = after_taxes * total_fee_rate
        ending_value = after_taxes - fees
        total_fees += fees
        
        portfolio_value = ending_value
        
        # Calculate deferred tax liability for Traditional IRA
        # For Traditional IRA, the entire balance is taxable on withdrawal
        deferred_tax_liability = ending_value * tax_rate if is_tax_deferred else 0.0
        
        yearly_projections.append({
            'year': year,
            'starting_value': starting_value,
            'cash_flow': annual_cash_flow,
            'after_cash_flow': after_cash_flow,
            'growth': growth,
            'taxes': taxes,
            'fees': fees,
            'ending_value': ending_value,
            'annual_return': weighted_annual_return,
            'deferred_tax_liability': deferred_tax_liability
        })
    
    return {
        'weighted_annual_return': weighted_annual_return,
        'final_portfolio_value': portfolio_value,
        'total_fees': total_fees,
        'total_taxes': total_taxes,
        'total_cash_flows': total_cash_flows,
        'deferred_tax_liability': deferred_tax_liability,
        'account_type': account_type,
        'yearly_projections': yearly_projections
    }
