
# E*TRADE API Setup Instructions

## Required Secrets

Add the following secrets in the Replit Secrets tool:

### 1. ETRADE_CONSUMER_KEY
Your E*TRADE API consumer key from the E*TRADE Developer Platform.

### 2. ETRADE_CONSUMER_SECRET
Your E*TRADE API consumer secret from the E*TRADE Developer Platform.

### 3. ETRADE_OAUTH_TOKEN (After Authentication)
The OAuth token obtained after completing the authorization flow.

### 4. ETRADE_OAUTH_TOKEN_SECRET (After Authentication)
The OAuth token secret obtained after completing the authorization flow.

### 5. ETRADE_SANDBOX (Optional)
Set to "true" for sandbox environment or "false" for production. Default is "true".

## Initial Authentication Flow

If you don't have OAuth tokens yet, you'll need to run an initial authentication:

```python
from analytics.etrade_client import ETradeClient
import os

consumer_key = os.getenv("ETRADE_CONSUMER_KEY")
consumer_secret = os.getenv("ETRADE_CONSUMER_SECRET")
use_sandbox = True  # Change to False for production

client = ETradeClient(consumer_key, consumer_secret, sandbox=use_sandbox)

# Step 1: Get request token
client.get_request_token()

# Step 2: Get authorization URL
auth_url = client.get_authorization_url()
print(f"Visit this URL to authorize: {auth_url}")

# Step 3: After visiting URL and getting verifier code
verifier = input("Enter verifier code: ")
oauth_token, oauth_token_secret = client.get_access_token(verifier)

print(f"Add these to Secrets:")
print(f"ETRADE_OAUTH_TOKEN: {oauth_token}")
print(f"ETRADE_OAUTH_TOKEN_SECRET: {oauth_token_secret}")
```

## Token Renewal

E*TRADE tokens expire after inactivity. To renew:

```python
client.renew_access_token()
```

Tokens are automatically renewed when possible, but you may need to re-authenticate if they've fully expired.
