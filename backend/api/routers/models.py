from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from analytics.models import model_portfolios, model_fee, growth_rates

router = APIRouter()

class ModelPortfolio(BaseModel):
    name: str
    allocations: Dict[str, float]
    fee: float

class ModelPortfoliosResponse(BaseModel):
    models: Dict[str, Dict[str, float]]
    model_fee: float
    growth_rates: Dict[str, float]

@router.get("/all", response_model=ModelPortfoliosResponse)
async def get_all_models():
    """Get all available model portfolios"""
    return ModelPortfoliosResponse(
        models=model_portfolios,
        model_fee=model_fee,
        growth_rates=growth_rates
    )

@router.get("/{model_name}")
async def get_model(model_name: str):
    """Get a specific model portfolio"""
    if model_name not in model_portfolios:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Model portfolio not found")
    
    return {
        "name": model_name,
        "allocations": model_portfolios[model_name],
        "fee": model_fee
    }
