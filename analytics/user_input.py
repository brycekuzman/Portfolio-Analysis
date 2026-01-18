
from .models import model_portfolios
import numpy as np


def calculate_portfolio_similarity(current_allocation, model_allocation):
    """Calculate similarity between current portfolio and model portfolio asset allocations."""
    # Get all unique asset classes from both portfolios
    all_asset_classes = set(current_allocation.keys()) | set(model_allocation.keys())
    
    # Create vectors for comparison
    current_vector = []
    model_vector = []
    
    for asset_class in sorted(all_asset_classes):
        current_vector.append(current_allocation.get(asset_class, 0))
        model_vector.append(model_allocation.get(asset_class, 0))
    
    # Calculate cosine similarity
    current_array = np.array(current_vector)
    model_array = np.array(model_vector)
    
    # Handle edge case where one vector is all zeros
    if np.linalg.norm(current_array) == 0 or np.linalg.norm(model_array) == 0:
        return 0
    
    cosine_similarity = np.dot(current_array, model_array) / (
        np.linalg.norm(current_array) * np.linalg.norm(model_array)
    )
    
    return cosine_similarity


def find_best_matching_model(current_asset_allocation):
    """Find the model portfolio that best matches the current asset allocation."""
    from .portfolio import Portfolio
    from .models import model_fee
    
    best_match = None
    best_similarity = -1
    
    # Calculate asset allocation for each model portfolio
    for model_name, model_allocations in model_portfolios.items():
        # Create a temporary model portfolio to get asset class allocation
        temp_portfolio = Portfolio({ticker: 1000 * weight for ticker, weight in model_allocations.items()}, 
                                 model_name, model_fee)
        model_asset_allocation = temp_portfolio.asset_class_allocation
        
        # Calculate similarity
        similarity = calculate_portfolio_similarity(current_asset_allocation, model_asset_allocation)
        
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = (model_name, model_allocations)
    
    return best_match, best_similarity


def get_user_portfolio():
    """Get user's current portfolio input."""
    print("Enter your current portfolio (ticker: dollar_amount):")
    print("Example: AAPL:10000,MSFT:5000")
    print("Or press Enter to use default: IEFA:10000,PULS:10000,VOO:20000,JRE:20000")
    
    user_input = input("Portfolio: ").strip()
    
    if not user_input:
        return {"IEFA": 10000, "PULS": 10000, "VOO": 20000, "JRE": 20000}
    
    portfolio = {}
    try:
        for item in user_input.split(','):
            ticker, amount = item.strip().split(':')
            portfolio[ticker.upper()] = float(amount)
        return portfolio
    except ValueError:
        print("Invalid format. Using default portfolio.")
        return {"AAPL": 10000, "PULS": 10000, "VOO": 20000}


def get_model_portfolio_choice(current_asset_allocation):
    """Automatically select the best matching model portfolio."""
    print("\nAnalyzing your portfolio to find the best matching model...")
    
    best_match, similarity = find_best_matching_model(current_asset_allocation)
    model_name, model_allocations = best_match
    
    print(f"\nBest matching model portfolio: {model_name}")
    print(f"Asset allocation similarity: {similarity:.1%}")
    
    print(f"\n{model_name} Portfolio Allocation:")
    for ticker, weight in model_allocations.items():
        print(f"   {ticker}: {weight:.0%}")
    
    print(f"\nAll Available Model Portfolios for reference:")
    for name, allocations in model_portfolios.items():
        indicator = " ← SELECTED" if name == model_name else ""
        print(f"• {name}{indicator}")
        for ticker, weight in allocations.items():
            print(f"   {ticker}: {weight:.0%}")
        print()
    
    return model_name, model_allocations
