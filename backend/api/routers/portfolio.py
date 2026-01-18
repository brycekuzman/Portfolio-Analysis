from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Literal, Optional, List
from datetime import datetime, timedelta
from analytics.portfolio import Portfolio
from analytics.user_input import find_best_matching_model
from analytics.models import model_fee, growth_rates
from analytics.performance import project_portfolio_with_taxes

router = APIRouter()

class PortfolioHolding(BaseModel):
    ticker: str
    amount: float

class PortfolioAnalysisRequest(BaseModel):
    holdings: Dict[str, float]
    advisory_fee: float = 0.0
    asset_class_overrides: Dict[str, str] | None = None
    account_type: Literal['Brokerage', 'Roth IRA', 'Traditional IRA'] = 'Brokerage'
    annual_cash_flow: float = 0.0
    tax_rate: float = 0.0

class SinglePortfolioData(BaseModel):
    holdings: Dict[str, float]
    advisory_fee: float = 0.0
    asset_class_overrides: Dict[str, str] | None = None
    account_type: Literal['Brokerage', 'Roth IRA', 'Traditional IRA'] = 'Brokerage'
    annual_cash_flow: float = 0.0

class AggregateAnalysisRequest(BaseModel):
    portfolios: List[SinglePortfolioData]
    tax_rate: float = 0.0

class PortfolioAnalysisResponse(BaseModel):
    current_portfolio: dict
    model_portfolio: dict
    model_name: str
    similarity: float
    projections: dict
    historical_performance: dict
    fee_analysis: dict
    current_holdings: list
    model_holdings: list

@router.post("/analyze", response_model=PortfolioAnalysisResponse)
async def analyze_portfolio(request: PortfolioAnalysisRequest):
    """Analyze a portfolio and compare it against model portfolios"""

    if not request.holdings:
        raise HTTPException(status_code=400, detail="Portfolio must have at least one holding")

    try:
        current_portfolio = Portfolio(
            request.holdings,
            "Current",
            request.advisory_fee,
            request.asset_class_overrides
        )

        best_match, similarity = find_best_matching_model(current_portfolio.asset_class_allocation)
        if best_match is None:
            raise HTTPException(status_code=500, detail="No matching model portfolio found")
        model_name, model_allocations = best_match

        total_value = sum(request.holdings.values())
        model_portfolio_dollars = {ticker: total_value * weight for ticker, weight in model_allocations.items()}
        model_portfolio = Portfolio(model_portfolio_dollars, model_name, model_fee)

        end_date = datetime.today().strftime('%Y-%m-%d')
        start_date = (datetime.today() - timedelta(days=365*10)).strftime('%Y-%m-%d')

        current_historical = current_portfolio.analyze_historical_performance(start_date, end_date)
        model_historical = model_portfolio.analyze_historical_performance(start_date, end_date)

        def serialize_historical(hist_data):
            """Convert pandas objects to JSON-serializable format"""
            serialized = {}
            for key, value in hist_data.items():
                if key == 'cumulative_with_fees' or key == 'cumulative_no_advisory':
                    # Convert pandas Series to list
                    if hasattr(value, 'tolist'):
                        serialized[key] = value.tolist()
                    else:
                        serialized[key] = value
                    # Add dates if not already present
                    if 'dates' not in serialized and hasattr(value, 'index'):
                        serialized['dates'] = [d.strftime('%Y-%m-%d') for d in value.index]
                elif hasattr(value, 'tolist'):
                    serialized[key] = value.tolist()
                elif isinstance(value, dict):
                    serialized[key] = {k: v.tolist() if hasattr(v, 'tolist') else v for k, v in value.items()}
                else:
                    serialized[key] = value
            return serialized

        current_historical = serialize_historical(current_historical)
        model_historical = serialize_historical(model_historical)

        # Calculate total fee rate for projections
        current_total_fee_rate = current_portfolio.weighted_avg_er + current_portfolio.advisory_fee
        model_total_fee_rate = model_portfolio.weighted_avg_er + model_portfolio.advisory_fee
        
        # Use enhanced projection with taxes and cash flows
        current_projection = project_portfolio_with_taxes(
            asset_class_allocation=current_portfolio.asset_class_allocation,
            growth_rates=growth_rates,
            total_fee_rate=current_total_fee_rate,
            initial_value=current_portfolio.total_value,
            annual_cash_flow=request.annual_cash_flow,
            tax_rate=request.tax_rate,
            account_type=request.account_type,
            years=10
        )
        
        # Model portfolio projection (no cash flow, same tax rate for comparison)
        model_projection = project_portfolio_with_taxes(
            asset_class_allocation=model_portfolio.asset_class_allocation,
            growth_rates=growth_rates,
            total_fee_rate=model_total_fee_rate,
            initial_value=model_portfolio.total_value,
            annual_cash_flow=request.annual_cash_flow,
            tax_rate=request.tax_rate,
            account_type=request.account_type,
            years=10
        )

        # Access projections with yearly data for fee calculation
        current_projections_with_fees = current_projection
        model_projections_with_fees = model_projection

        # Fee analysis - calculate annual fee correctly
        current_annual_fee = (current_portfolio.weighted_avg_er + current_portfolio.advisory_fee) * current_portfolio.total_value
        model_annual_fee = (model_portfolio.weighted_avg_er + model_portfolio.advisory_fee) * model_portfolio.total_value

        # Calculate 10-year cumulative fees from projections (already in dollar amounts)
        current_cumulative_fees = current_projections_with_fees['total_fees']
        model_cumulative_fees = model_projections_with_fees['total_fees']

        fee_analysis = {
            "current_annual_fee": current_annual_fee,
            "model_annual_fee": model_annual_fee,
            "annual_savings": current_annual_fee - model_annual_fee,
            "current_total_fees": current_cumulative_fees,
            "model_total_fees": model_cumulative_fees
        }

        # Get detailed holdings information
        current_holdings = current_portfolio.get_detailed_holdings()
        model_holdings = model_portfolio.get_detailed_holdings()

        return PortfolioAnalysisResponse(
            current_portfolio={
                "total_value": current_portfolio.total_value,
                "weights": current_portfolio.portfolio_weights,
                "weighted_avg_er": current_portfolio.weighted_avg_er,
                "asset_class_allocation": current_portfolio.asset_class_allocation,
                "advisory_fee": request.advisory_fee
            },
            model_portfolio={
                "total_value": model_portfolio.total_value,
                "weights": model_portfolio.portfolio_weights,
                "weighted_avg_er": model_portfolio.weighted_avg_er,
                "asset_class_allocation": model_portfolio.asset_class_allocation,
                "advisory_fee": model_fee
            },
            model_name=model_name,
            similarity=similarity,
            projections={
                "current": current_projection,
                "model": model_projection
            },
            historical_performance={
                "current": current_historical,
                "model": model_historical
            },
            fee_analysis=fee_analysis,
            current_holdings=current_holdings,
            model_holdings=model_holdings
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/validate-holdings")
async def validate_holdings(holdings: Dict[str, float]):
    """Validate all holdings in a portfolio"""
    from analytics.data import validate_ticker

    results = {}
    for ticker, amount in holdings.items():
        is_valid, _ = validate_ticker(ticker)
        results[ticker] = {
            "valid": is_valid,
            "amount": amount
        }

    return results


@router.post("/analyze-aggregate", response_model=PortfolioAnalysisResponse)
async def analyze_aggregate_portfolio(request: AggregateAnalysisRequest):
    """Analyze aggregate portfolio combining multiple portfolios with different account types"""
    
    if not request.portfolios:
        raise HTTPException(status_code=400, detail="At least one portfolio is required")

    try:
        # Combine all holdings from all portfolios
        combined_holdings: Dict[str, float] = {}
        combined_overrides: Dict[str, str] = {}
        
        for p in request.portfolios:
            for ticker, amount in p.holdings.items():
                combined_holdings[ticker] = combined_holdings.get(ticker, 0) + amount
            if p.asset_class_overrides:
                combined_overrides.update(p.asset_class_overrides)

        if not combined_holdings:
            raise HTTPException(status_code=400, detail="No holdings found in any portfolio")

        # Calculate total value and weighted average fee
        total_value = sum(combined_holdings.values())
        weighted_fee = sum(
            (sum(p.holdings.values()) / total_value) * p.advisory_fee 
            for p in request.portfolios if sum(p.holdings.values()) > 0
        ) if total_value > 0 else 0.0

        # Create combined portfolio for analysis
        combined_portfolio = Portfolio(
            combined_holdings,
            "Aggregate",
            weighted_fee,
            combined_overrides
        )

        # Find best matching model portfolio
        best_match, similarity = find_best_matching_model(combined_portfolio.asset_class_allocation)
        if best_match is None:
            raise HTTPException(status_code=500, detail="No matching model portfolio found")
        model_name, model_allocations = best_match

        model_portfolio_dollars = {ticker: total_value * weight for ticker, weight in model_allocations.items()}
        model_portfolio = Portfolio(model_portfolio_dollars, model_name, model_fee)

        # Historical performance dates
        end_date = datetime.today().strftime('%Y-%m-%d')
        start_date = (datetime.today() - timedelta(days=365*10)).strftime('%Y-%m-%d')

        # Get historical performance for combined portfolio
        current_historical = combined_portfolio.analyze_historical_performance(start_date, end_date)
        model_historical = model_portfolio.analyze_historical_performance(start_date, end_date)

        def serialize_historical(hist_data):
            """Convert pandas objects to JSON-serializable format"""
            serialized = {}
            for key, value in hist_data.items():
                if key == 'cumulative_with_fees' or key == 'cumulative_no_advisory':
                    if hasattr(value, 'tolist'):
                        serialized[key] = value.tolist()
                    else:
                        serialized[key] = value
                    if 'dates' not in serialized and hasattr(value, 'index'):
                        serialized['dates'] = [d.strftime('%Y-%m-%d') for d in value.index]
                elif hasattr(value, 'tolist'):
                    serialized[key] = value.tolist()
                elif isinstance(value, dict):
                    serialized[key] = {k: v.tolist() if hasattr(v, 'tolist') else v for k, v in value.items()}
                else:
                    serialized[key] = value
            return serialized

        current_historical = serialize_historical(current_historical)
        model_historical = serialize_historical(model_historical)

        # Calculate projections for each portfolio separately, then aggregate
        aggregate_projections = None
        
        for p in request.portfolios:
            if not p.holdings:
                continue
                
            p_portfolio = Portfolio(
                p.holdings,
                "temp",
                p.advisory_fee,
                p.asset_class_overrides
            )
            
            p_total_fee_rate = p_portfolio.weighted_avg_er + p_portfolio.advisory_fee
            p_initial_value = sum(p.holdings.values())
            
            p_projection = project_portfolio_with_taxes(
                asset_class_allocation=p_portfolio.asset_class_allocation,
                growth_rates=growth_rates,
                total_fee_rate=p_total_fee_rate,
                initial_value=p_initial_value,
                annual_cash_flow=p.annual_cash_flow,
                tax_rate=request.tax_rate,
                account_type=p.account_type,
                years=10
            )
            
            if aggregate_projections is None:
                # Initialize with first portfolio's structure
                aggregate_projections = {
                    'weighted_annual_return': p_projection['weighted_annual_return'],
                    'final_portfolio_value': p_projection['final_portfolio_value'],
                    'total_fees': p_projection['total_fees'],
                    'total_taxes': p_projection.get('total_taxes', 0),
                    'total_cash_flows': p_projection.get('total_cash_flows', 0),
                    'deferred_tax_liability': p_projection.get('deferred_tax_liability', 0),
                    'yearly_projections': []
                }
                # Initialize yearly projections
                for yp in p_projection['yearly_projections']:
                    aggregate_projections['yearly_projections'].append({
                        'year': yp['year'],
                        'starting_value': yp['starting_value'],
                        'ending_value': yp['ending_value'],
                        'growth': yp['growth'],
                        'fees': yp['fees'],
                        'taxes': yp.get('taxes', 0),
                        'cash_flow': yp.get('cash_flow', 0),
                        'deferred_tax_liability': yp.get('deferred_tax_liability', 0)
                    })
            else:
                # Aggregate values from additional portfolios
                aggregate_projections['final_portfolio_value'] += p_projection['final_portfolio_value']
                aggregate_projections['total_fees'] += p_projection['total_fees']
                aggregate_projections['total_taxes'] += p_projection.get('total_taxes', 0)
                aggregate_projections['total_cash_flows'] += p_projection.get('total_cash_flows', 0)
                aggregate_projections['deferred_tax_liability'] += p_projection.get('deferred_tax_liability', 0)
                
                for i, yp in enumerate(p_projection['yearly_projections']):
                    if i < len(aggregate_projections['yearly_projections']):
                        aggregate_projections['yearly_projections'][i]['starting_value'] += yp['starting_value']
                        aggregate_projections['yearly_projections'][i]['ending_value'] += yp['ending_value']
                        aggregate_projections['yearly_projections'][i]['growth'] += yp['growth']
                        aggregate_projections['yearly_projections'][i]['fees'] += yp['fees']
                        aggregate_projections['yearly_projections'][i]['taxes'] += yp.get('taxes', 0)
                        aggregate_projections['yearly_projections'][i]['cash_flow'] += yp.get('cash_flow', 0)
                        aggregate_projections['yearly_projections'][i]['deferred_tax_liability'] += yp.get('deferred_tax_liability', 0)

        # Model portfolio projection (use combined total for comparison)
        model_total_fee_rate = model_portfolio.weighted_avg_er + model_portfolio.advisory_fee
        total_annual_cash_flow = sum(p.annual_cash_flow for p in request.portfolios)
        
        model_projection = project_portfolio_with_taxes(
            asset_class_allocation=model_portfolio.asset_class_allocation,
            growth_rates=growth_rates,
            total_fee_rate=model_total_fee_rate,
            initial_value=model_portfolio.total_value,
            annual_cash_flow=total_annual_cash_flow,
            tax_rate=request.tax_rate,
            account_type='Brokerage',  # Model portfolio assumes standard brokerage
            years=10
        )

        # Fee analysis
        current_annual_fee = (combined_portfolio.weighted_avg_er + weighted_fee) * total_value
        model_annual_fee = (model_portfolio.weighted_avg_er + model_portfolio.advisory_fee) * model_portfolio.total_value

        fee_analysis = {
            "current_annual_fee": current_annual_fee,
            "model_annual_fee": model_annual_fee,
            "annual_savings": current_annual_fee - model_annual_fee,
            "current_total_fees": aggregate_projections.get('total_fees', 0) if aggregate_projections else 0,
            "model_total_fees": model_projection.get('total_fees', 0)
        }

        # Get detailed holdings information
        current_holdings = combined_portfolio.get_detailed_holdings()
        model_holdings = model_portfolio.get_detailed_holdings()

        return PortfolioAnalysisResponse(
            current_portfolio={
                "total_value": combined_portfolio.total_value,
                "weights": combined_portfolio.portfolio_weights,
                "weighted_avg_er": combined_portfolio.weighted_avg_er,
                "asset_class_allocation": combined_portfolio.asset_class_allocation,
                "advisory_fee": weighted_fee
            },
            model_portfolio={
                "total_value": model_portfolio.total_value,
                "weights": model_portfolio.portfolio_weights,
                "weighted_avg_er": model_portfolio.weighted_avg_er,
                "asset_class_allocation": model_portfolio.asset_class_allocation,
                "advisory_fee": model_fee
            },
            model_name=model_name,
            similarity=similarity,
            projections={
                "current": aggregate_projections,
                "model": model_projection
            },
            historical_performance={
                "current": current_historical,
                "model": model_historical
            },
            fee_analysis=fee_analysis,
            current_holdings=current_holdings,
            model_holdings=model_holdings
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregate analysis failed: {str(e)}")