
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
from analytics.etrade_client import ETradeClient

router = APIRouter()

class ETradeAuthResponse(BaseModel):
    auth_url: str
    request_token: str
    request_token_secret: str
    instructions: str

class ETradeVerifyRequest(BaseModel):
    request_token: str
    request_token_secret: str
    verifier_code: str

class ETradeTokenResponse(BaseModel):
    oauth_token: str
    oauth_token_secret: str
    instructions: str

@router.get("/start-auth", response_model=ETradeAuthResponse)
async def start_etrade_auth():
    """Start E*TRADE authentication flow"""
    consumer_key = os.getenv("ETRADE_CONSUMER_KEY")
    consumer_secret = os.getenv("ETRADE_CONSUMER_SECRET")
    
    if not consumer_key or not consumer_secret:
        raise HTTPException(
            status_code=400, 
            detail="E*TRADE credentials not configured. Add ETRADE_CONSUMER_KEY and ETRADE_CONSUMER_SECRET to Secrets."
        )
    
    try:
        use_sandbox = os.getenv("ETRADE_SANDBOX", "true").lower() == "true"
        client = ETradeClient(consumer_key, consumer_secret, sandbox=use_sandbox)
        
        request_token, request_token_secret = client.get_request_token()
        auth_url = client.get_authorization_url()
        
        return ETradeAuthResponse(
            auth_url=auth_url,
            request_token=request_token,
            request_token_secret=request_token_secret,
            instructions=f"Visit the URL, authorize, and use the verifier code"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start auth: {str(e)}")

@router.post("/verify-auth", response_model=ETradeTokenResponse)
async def verify_etrade_auth(request: ETradeVerifyRequest):
    """Complete E*TRADE authentication with verifier code"""
    consumer_key = os.getenv("ETRADE_CONSUMER_KEY")
    consumer_secret = os.getenv("ETRADE_CONSUMER_SECRET")
    
    if not consumer_key or not consumer_secret:
        raise HTTPException(status_code=400, detail="E*TRADE credentials not configured")
    
    try:
        use_sandbox = os.getenv("ETRADE_SANDBOX", "true").lower() == "true"
        client = ETradeClient(consumer_key, consumer_secret, sandbox=use_sandbox)
        
        # Set the request tokens
        client.oauth_token = request.request_token
        client.oauth_token_secret = request.request_token_secret
        
        # Exchange for access tokens
        oauth_token, oauth_token_secret = client.get_access_token(request.verifier_code)
        
        instructions = (
            "Add these to your Replit Secrets:\n"
            f"ETRADE_OAUTH_TOKEN: {oauth_token}\n"
            f"ETRADE_OAUTH_TOKEN_SECRET: {oauth_token_secret}"
        )
        
        return ETradeTokenResponse(
            oauth_token=oauth_token,
            oauth_token_secret=oauth_token_secret,
            instructions=instructions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify auth: {str(e)}")

@router.get("/accounts")
async def get_etrade_accounts():
    """Get list of E*TRADE accounts"""
    consumer_key = os.getenv("ETRADE_CONSUMER_KEY")
    consumer_secret = os.getenv("ETRADE_CONSUMER_SECRET")
    oauth_token = os.getenv("ETRADE_OAUTH_TOKEN")
    oauth_token_secret = os.getenv("ETRADE_OAUTH_TOKEN_SECRET")
    
    if not all([consumer_key, consumer_secret, oauth_token, oauth_token_secret]):
        raise HTTPException(
            status_code=400, 
            detail="E*TRADE credentials not fully configured. Make sure all tokens are in Secrets."
        )
    
    try:
        use_sandbox = os.getenv("ETRADE_SANDBOX", "true").lower() == "true"
        client = ETradeClient(consumer_key, consumer_secret, sandbox=use_sandbox)
        client.set_access_token(oauth_token, oauth_token_secret)
        
        accounts_data = client.list_accounts()
        accounts = []
        
        if 'AccountListResponse' in accounts_data:
            account_list = accounts_data['AccountListResponse'].get('Accounts', {}).get('Account', [])
            if not isinstance(account_list, list):
                account_list = [account_list]
            
            for acc in account_list:
                accounts.append({
                    'account_id': acc.get('accountId', ''),
                    'account_id_key': acc.get('accountIdKey', ''),
                    'account_name': acc.get('accountName', 'Unknown'),
                    'account_type': acc.get('accountType', 'Unknown')
                })
        
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")

class ETradeHoldingsRequest(BaseModel):
    account_id_keys: List[str]

@router.post("/holdings")
async def get_etrade_holdings(request: ETradeHoldingsRequest):
    """Get holdings from specified E*TRADE accounts"""
    consumer_key = os.getenv("ETRADE_CONSUMER_KEY")
    consumer_secret = os.getenv("ETRADE_CONSUMER_SECRET")
    oauth_token = os.getenv("ETRADE_OAUTH_TOKEN")
    oauth_token_secret = os.getenv("ETRADE_OAUTH_TOKEN_SECRET")
    
    if not all([consumer_key, consumer_secret, oauth_token, oauth_token_secret]):
        raise HTTPException(
            status_code=400, 
            detail="E*TRADE credentials not fully configured. Make sure all tokens are in Secrets."
        )
    
    if not request.account_id_keys:
        raise HTTPException(status_code=400, detail="No account IDs provided")
    
    try:
        use_sandbox = os.getenv("ETRADE_SANDBOX", "true").lower() == "true"
        client = ETradeClient(consumer_key, consumer_secret, sandbox=use_sandbox)
        client.set_access_token(oauth_token, oauth_token_secret)
        
        # Fetch holdings from all selected accounts
        holdings = client.get_holdings_summary(request.account_id_keys)
        
        # Aggregate holdings by symbol
        symbol_aggregated = {}
        for holding in holdings:
            symbol = holding['symbol']
            market_value = holding['market_value']
            
            if symbol in symbol_aggregated:
                symbol_aggregated[symbol]['market_value'] += market_value
            else:
                symbol_aggregated[symbol] = {
                    'symbol': symbol,
                    'market_value': market_value,
                    'security_type': holding['security_type']
                }
        
        # Convert to list
        holdings_list = list(symbol_aggregated.values())
        
        return {"holdings": holdings_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch holdings: {str(e)}")
