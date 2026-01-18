from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routers import ticker, portfolio, models, etrade

app = FastAPI(
    title="Portfolio Analyzer API",
    description="REST API for portfolio analysis and optimization",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ticker.router, prefix="/api/ticker", tags=["ticker"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(models.router, prefix="/api/models", tags=["models"])
app.include_router(etrade.router, prefix="/api/etrade", tags=["etrade"])

@app.get("/")
async def root():
    return {"message": "Portfolio Analyzer API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}