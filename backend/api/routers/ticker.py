from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from analytics.data import validate_ticker, get_investment_name, classify_investment

router = APIRouter()

class TickerValidationResponse(BaseModel):
    valid: bool
    ticker: str
    name: str | None = None
    asset_class: str | None = None
    error: str | None = None

@router.get("/validate/{ticker}", response_model=TickerValidationResponse)
async def validate_ticker_endpoint(ticker: str):
    """Validate a stock ticker and return its information"""
    ticker = ticker.upper().strip()
    
    is_valid, ticker_info = validate_ticker(ticker)
    
    if not is_valid:
        return TickerValidationResponse(
            valid=False,
            ticker=ticker,
            error="Invalid ticker symbol"
        )
    
    name = get_investment_name(ticker)
    asset_class = classify_investment(ticker)
    
    return TickerValidationResponse(
        valid=True,
        ticker=ticker,
        name=name,
        asset_class=asset_class
    )

@router.get("/info/{ticker}")
async def get_ticker_info(ticker: str):
    """Get detailed information about a ticker"""
    ticker = ticker.upper().strip()
    
    is_valid, ticker_info = validate_ticker(ticker)
    
    if not is_valid:
        raise HTTPException(status_code=404, detail="Ticker not found")
    
    name = get_investment_name(ticker)
    asset_class = classify_investment(ticker)
    
    return {
        "ticker": ticker,
        "name": name,
        "asset_class": asset_class,
        "valid": True
    }
