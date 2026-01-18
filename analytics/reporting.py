def print_portfolio_summary(portfolio):
    """Print detailed portfolio summary."""
    summary = portfolio.get_portfolio_summary()

    print(f"\n{'='*60}")
    print(f"ANALYZING {summary['name'].upper()} PORTFOLIO")
    print(f"{'='*60}")

    print(f"\nPortfolio allocation based on ${summary['total_value']:,.0f} investment:")
    for holding in summary['holdings']:
        er_display = f" (ER: {holding['expense_ratio']:.2%})" if holding['expense_ratio'] > 0 else " (ER: 0.00%)"
        print(f"{holding['ticker']}: ${holding['dollar_amount']:,.0f} ({holding['weight']:.1%}) - "
              f"{holding['shares']:.2f} shares at ${holding['price']:.2f}{er_display} [{holding['classification']}]")

    print(f"\nWeighted Average Expense Ratio: {summary['weighted_avg_er']:.2%}")
    if summary['advisory_fee'] > 0:
        print(f"Advisory Fee: {summary['advisory_fee']:.2%}")
        print(f"Total Annual Fees: {summary['total_fees']:.2%}")

    print(f"\nAsset Class Allocation:")
    for asset_class, allocation in sorted(summary['asset_class_allocation'].items()):
        dollar_amount = allocation * summary['total_value']
        print(f"{asset_class}: ${dollar_amount:,.0f} ({allocation:.1%})")


def print_historical_performance(portfolio, results):
    """Print historical performance results."""
    print(f"\nIndividual Asset Total Returns ({results['actual_start_date']} to {results['actual_end_date']}):")
    for ticker, return_pct in results['individual_returns'].items():
        print(f"{ticker}: {return_pct:.2%}")

    print(f"\n{portfolio.name} Portfolio Performance Stats (After All Fees):")
    for k, v in results['stats_with_fees'].items():
        if k == "Sharpe Ratio":
            print(f"{k}: {v:.2f}")
        else:
            print(f"{k}: {v:.2%}")

    if portfolio.advisory_fee > 0:
        print(f"\n{portfolio.name} Portfolio Performance Stats (Before Advisory Fee):")
        for k, v in results['stats_no_advisory'].items():
            if k == "Sharpe Ratio":
                print(f"{k}: {v:.2f}")
            else:
                print(f"{k}: {v:.2%}")


def print_projection_comparison(current_portfolio, model_portfolio, current_projections, model_projections, total_investment):
    """Print 10-year projection comparison."""
    print(f"\n{'='*60}")
    print("10-YEAR PORTFOLIO PROJECTIONS")
    print(f"{'='*60}")

    # Fee comparison
    current_summary = current_portfolio.get_portfolio_summary()
    model_summary = model_portfolio.get_portfolio_summary()

    print(f"\nFee Comparison:")
    print(f"Current Portfolio - Weighted Avg Expense Ratio: {current_summary['weighted_avg_er']:.2%}, "
          f"Advisory Fee: {current_summary['advisory_fee']:.2%}, Total: {current_summary['total_fees']:.2%}")
    print(f"{model_summary['name']} Portfolio - Weighted Avg Expense Ratio: {model_summary['weighted_avg_er']:.2%}, "
          f"Advisory Fee: {model_summary['advisory_fee']:.2%}, Total: {model_summary['total_fees']:.2%}")

    fee_difference = model_summary['total_fees'] - current_summary['total_fees']
    print(f"Fee Difference: {fee_difference:+.2%}")

    # Forward-looking metrics
    current_forward = current_portfolio.calculate_forward_metrics()
    model_forward = model_portfolio.calculate_forward_metrics()

    print(f"\nEstimated Forward Performance Metrics:")
    print(f"Current Portfolio:")
    print(f"  Expected Return: {current_forward['expected_return']:.2%}")
    print(f"  Estimated Volatility: {current_forward['portfolio_volatility']:.2%}")
    print(f"  Estimated Sharpe Ratio: {current_forward['sharpe_ratio']:.2f}")

    print(f"\n{model_summary['name']} Portfolio:")
    print(f"  Expected Return: {model_forward['expected_return']:.2%}")
    print(f"  Estimated Volatility: {model_forward['portfolio_volatility']:.2%}")
    print(f"  Estimated Sharpe Ratio: {model_forward['sharpe_ratio']:.2f}")

    # Differences
    return_diff = model_forward['expected_return'] - current_forward['expected_return']
    vol_diff = model_forward['portfolio_volatility'] - current_forward['portfolio_volatility']
    sharpe_diff = model_forward['sharpe_ratio'] - current_forward['sharpe_ratio']

    print(f"\nForward Metrics Differences:")
    print(f"  Expected Return Difference: {return_diff:+.2%}")
    print(f"  Volatility Difference: {vol_diff:+.2%}")
    print(f"  Sharpe Ratio Difference: {sharpe_diff:+.2f}")

    # Asset class allocations
    from .models import growth_rates, asset_volatility

    print(f"\nCurrent Portfolio Asset Class Allocation:")
    for asset_class, allocation in sorted(current_summary['asset_class_allocation'].items()):
        growth_rate = growth_rates.get(asset_class, 0)
        volatility = asset_volatility.get(asset_class, 0)
        print(f"  {asset_class}: {allocation:.1%} (Est. Growth: {growth_rate:.1%}, Est. Vol: {volatility:.1%})")

    print(f"\n{model_summary['name']} Portfolio Asset Class Allocation:")
    for asset_class, allocation in sorted(model_summary['asset_class_allocation'].items()):
        growth_rate = growth_rates.get(asset_class, 0)
        volatility = asset_volatility.get(asset_class, 0)
        print(f"  {asset_class}: {allocation:.1%} (Est. Growth: {growth_rate:.1%}, Est. Vol: {volatility:.1%})")


def print_fee_breakdown(current_portfolio, model_portfolio, total_investment):
    """Print detailed fee breakdown for 10-year projections and current year savings."""
    current_projections = current_portfolio.project_future_returns(10)
    model_projections = model_portfolio.project_future_returns(10)

    current_summary = current_portfolio.get_portfolio_summary()
    model_summary = model_portfolio.get_portfolio_summary()

    # Calculate projections with and without advisory fees
    current_gross_return = current_projections['weighted_annual_return']
    model_gross_return = model_projections['weighted_annual_return']

    current_net_return = current_gross_return - current_summary['weighted_avg_er'] - current_summary['advisory_fee']
    model_net_return = model_gross_return - model_summary['weighted_avg_er'] - model_summary['advisory_fee']

    current_gross_final = total_investment * ((1 + current_gross_return) ** 10)
    model_gross_final = total_investment * ((1 + model_gross_return) ** 10)
    current_net_final = total_investment * ((1 + current_net_return) ** 10)
    model_net_final = total_investment * ((1 + model_net_return) ** 10)

    print(f"\n10-Year Fee Savings Analysis:")
    print("=" * 60)

    # Calculate fee savings (current minus model)
    advisory_fee_savings = (current_summary['advisory_fee'] - model_summary['advisory_fee']) * total_investment * 10
    expense_ratio_savings = (current_summary['weighted_avg_er'] - model_summary['weighted_avg_er']) * total_investment * 10
    total_fee_savings = advisory_fee_savings + expense_ratio_savings

    print(f"\nAdvisory Fee Savings (10-year):")
    print(f"Current Portfolio Advisory Fee: {current_summary['advisory_fee']:.2%} annually")
    print(f"{model_summary['name']} Portfolio Advisory Fee: {model_summary['advisory_fee']:.2%} annually")
    print(f"Advisory Fee Savings: ${advisory_fee_savings:+,.0f}")

    print(f"\nManager Fee (Expense Ratio) Savings (10-year):")
    print(f"Current Portfolio Weighted Avg Expense Ratio: {current_summary['weighted_avg_er']:.2%} annually")
    print(f"{model_summary['name']} Portfolio Weighted Avg Expense Ratio: {model_summary['weighted_avg_er']:.2%} annually")
    print(f"Manager Fee Savings: ${expense_ratio_savings:+,.0f}")

    print(f"\nTotal Fee Savings Summary (10-year):")
    print(f"Total Fee Savings: ${total_fee_savings:+,.0f}")

    if total_fee_savings > 0:
        print(f"💰 The {model_summary['name']} portfolio saves ${total_fee_savings:,.0f} in fees over 10 years!")
    elif total_fee_savings < 0:
        print(f"⚠️  The {model_summary['name']} portfolio costs ${abs(total_fee_savings):,.0f} more in fees over 10 years.")
    else:
        print(f"The {model_summary['name']} portfolio has similar fees to your current portfolio.")

    # Current Year Fee Savings Analysis
    print(f"\nCurrent Year Fee Savings Analysis:")
    print("=" * 60)

    current_year_advisory_savings = (current_summary['advisory_fee'] - model_summary['advisory_fee']) * total_investment
    current_year_expense_savings = (current_summary['weighted_avg_er'] - model_summary['weighted_avg_er']) * total_investment
    current_year_total_savings = current_year_advisory_savings + current_year_expense_savings

    print(f"\nIn the past year, you would have saved:")
    print(f"Advisory Fee Savings: ${current_year_advisory_savings:+,.0f}")
    print(f"Manager Fee Savings: ${current_year_expense_savings:+,.0f}")
    print(f"Total Fee Savings: ${current_year_total_savings:+,.0f}")

    if current_year_total_savings > 0:
        print(f"💰 You could have saved ${current_year_total_savings:,.0f} in fees in the past year with the {model_summary['name']} portfolio!")
    elif current_year_total_savings < 0:
        print(f"⚠️  The {model_summary['name']} portfolio would have cost ${abs(current_year_total_savings):,.0f} more in fees in the past year.")
    else:
        print(f"The fee difference would have been minimal in the past year.")