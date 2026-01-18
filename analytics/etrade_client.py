import os
import json
from requests_oauthlib import OAuth1Session
from requests.auth import HTTPBasicAuth
import requests


class ETradeClient:
    def __init__(self, consumer_key, consumer_secret, sandbox=True):
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.sandbox = sandbox

        if sandbox:
            self.base_url = "https://apisb.etrade.com"
        else:
            self.base_url = "https://api.etrade.com"

        self.oauth_token = None
        self.oauth_token_secret = None
        self.session = None

    def get_request_token(self):
        request_token_url = f"{self.base_url}/oauth/request_token"

        oauth = OAuth1Session(
            self.consumer_key,
            client_secret=self.consumer_secret,
            callback_uri='oob'
        )

        try:
            response = oauth.fetch_request_token(request_token_url)
            self.oauth_token = response.get('oauth_token')
            self.oauth_token_secret = response.get('oauth_token_secret')

            print(f"Request token obtained successfully!")
            print(f"OAuth Token: {self.oauth_token}")

            return self.oauth_token, self.oauth_token_secret
        except Exception as e:
            print(f"Error getting request token: {e}")
            raise

    def get_authorization_url(self):
        if not self.oauth_token:
            raise Exception("Request token not obtained. Call get_request_token() first.")

        auth_url = f"https://us.etrade.com/e/t/etws/authorize?key={self.consumer_key}&token={self.oauth_token}"
        return auth_url

    def get_access_token(self, verifier_code):
        if not self.oauth_token or not self.oauth_token_secret:
            raise Exception("Request token not obtained. Call get_request_token() first.")

        access_token_url = f"{self.base_url}/oauth/access_token"

        oauth = OAuth1Session(
            self.consumer_key,
            client_secret=self.consumer_secret,
            resource_owner_key=self.oauth_token,
            resource_owner_secret=self.oauth_token_secret,
            verifier=verifier_code
        )

        try:
            response = oauth.fetch_access_token(access_token_url)
            self.oauth_token = response.get('oauth_token')
            self.oauth_token_secret = response.get('oauth_token_secret')

            self.session = OAuth1Session(
                self.consumer_key,
                client_secret=self.consumer_secret,
                resource_owner_key=self.oauth_token,
                resource_owner_secret=self.oauth_token_secret
            )

            print("Access token obtained successfully!")
            return self.oauth_token, self.oauth_token_secret
        except Exception as e:
            print(f"Error getting access token: {e}")
            raise

    def set_access_token(self, oauth_token, oauth_token_secret):
        self.oauth_token = oauth_token
        self.oauth_token_secret = oauth_token_secret

        self.session = OAuth1Session(
            self.consumer_key,
            client_secret=self.consumer_secret,
            resource_owner_key=self.oauth_token,
            resource_owner_secret=self.oauth_token_secret
        )

    def renew_access_token(self):
        if not self.session:
            raise Exception("No active session. Get access token first.")

        renew_url = f"{self.base_url}/oauth/renew_access_token"

        try:
            response = self.session.get(renew_url)
            if response.status_code == 200:
                print("Access token renewed successfully!")
                return True
            else:
                print(f"Failed to renew token: {response.text}")
                return False
        except Exception as e:
            print(f"Error renewing access token: {e}")
            raise

    def list_accounts(self):
        if not self.session:
            raise Exception("Not authenticated. Get access token first.")

        url = f"{self.base_url}/v1/accounts/list.json"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
            return data
        except Exception as e:
            print(f"Error listing accounts: {e}")
            raise

    def get_account_portfolio(self, account_id_key, count=50, totals_required=True):
        if not self.session:
            raise Exception("Not authenticated. Get access token first.")

        url = f"{self.base_url}/v1/accounts/{account_id_key}/portfolio.json"

        params = {
            'count': count,
            'totalsRequired': str(totals_required).lower()
        }

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Validate response structure
            if not data or 'PortfolioResponse' not in data:
                print(f"Warning: Unexpected response structure for account {account_id_key}")
                return {'PortfolioResponse': {'AccountPortfolio': []}}
            
            return data
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                print(f"Authentication error for account {account_id_key}. Token may have expired.")
            print(f"HTTP Error getting portfolio for account {account_id_key}: {e}")
            raise
        except Exception as e:
            print(f"Error getting portfolio for account {account_id_key}: {e}")
            raise

    @staticmethod
    def _extract_quantity(quantity_field):
        if isinstance(quantity_field, dict):
            available_qty = quantity_field.get('available', {})
            if isinstance(available_qty, dict):
                value = available_qty.get('value')
                if value is not None:
                    return float(value)

            overall_qty = quantity_field.get('overall', {})
            if isinstance(overall_qty, dict):
                value = overall_qty.get('value')
                if value is not None:
                    return float(value)

            return 0.0
        else:
            return float(quantity_field) if quantity_field else 0.0

    @staticmethod
    def _extract_money_value(money_field):
        if isinstance(money_field, dict):
            # Try to get value from different possible keys
            value = money_field.get('value')
            if value is None:
                value = money_field.get('amount')
            if value is None:
                value = money_field.get('total')
            return float(value) if value is not None else 0.0
        elif isinstance(money_field, (int, float)):
            return float(money_field)
        elif isinstance(money_field, str):
            try:
                return float(money_field.replace(',', '').replace('$', ''))
            except:
                return 0.0
        else:
            return 0.0

    def get_holdings_summary(self, account_id_keys):
        holdings_summary = []

        for account_id_key in account_id_keys:
            try:
                portfolio_data = self.get_account_portfolio(account_id_key)

                if 'PortfolioResponse' in portfolio_data:
                    portfolio_response = portfolio_data['PortfolioResponse']
                    account_portfolio = portfolio_response.get('AccountPortfolio', [])

                    if not isinstance(account_portfolio, list):
                        account_portfolio = [account_portfolio]

                    for account in account_portfolio:
                        account_id = account.get('accountId', 'Unknown')
                        positions = account.get('Position', [])

                        if not isinstance(positions, list):
                            positions = [positions]

                        for position in positions:
                            product = position.get('Product', {})
                            symbol = product.get('symbol', 'N/A')
                            security_type = product.get('securityType', 'N/A')

                            quantity = self._extract_quantity(position.get('quantity', 0))
                            market_value = self._extract_money_value(position.get('marketValue', 0))
                            price_paid = self._extract_money_value(position.get('pricePaid', 0))
                            total_cost = self._extract_money_value(position.get('totalCost', 0))

                            holdings_summary.append({
                                'account_id': account_id,
                                'account_id_key': account_id_key,
                                'symbol': symbol,
                                'security_type': security_type,
                                'quantity': quantity,
                                'market_value': market_value,
                                'price_paid': price_paid,
                                'total_cost': total_cost
                            })
            except Exception as e:
                print(f"Error processing account {account_id_key}: {e}")
                continue

        return holdings_summary
