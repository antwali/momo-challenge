# REST Client Files

These `.http` files allow you to test API endpoints directly from VS Code without using Postman, curl, or the browser.

## Setup

1. **Install REST Client extension** in VS Code:
   - Open VS Code Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
   - Search for "REST Client" by Huachao Mao
   - Install it

2. **Start the API:**

   ```bash
   npm run dev
   ```

3. **Update variables** in each `.http` file:
   - Replace `YOUR_USER_ID_HERE` with actual user IDs from registration
   - Replace `YOUR_ACCOUNT_ID_HERE` with actual account IDs
   - Or set them in VS Code settings: `rest-client.environmentVariables`

## Usage

1. Open any `.http` file (e.g., `http/auth.http`)
2. Click "Send Request" above each request (or `Cmd+Alt+R` / `Ctrl+Alt+R`)
3. View the response in a new tab

## Files

- **`auth.http`** - User registration
- **`accounts.http`** - List accounts, create pockets, get balance
- **`transactions.http`** - Cash-in, P2P, pocket transfer, merchant pay, history
- **`merchants.http`** - Merchant onboarding

## Workflow Example

1. Register a user in `auth.http` → copy the `userId` from response
2. Update `@userId` variable in other files
3. Cash-in some money in `transactions.http`
4. List accounts in `accounts.http` → copy an `accountId`
5. Make a P2P transfer in `transactions.http`
6. Check transaction history

## Environment Variables (Optional)

Create `.vscode/settings.json`:

```json
{
  "rest-client.environmentVariables": {
    "local": {
      "baseUrl": "http://localhost:3000",
      "userId": "your-user-id",
      "accountId": "your-account-id"
    },
    "test": {
      "baseUrl": "http://localhost:3000",
      "userId": "test-user-id"
    }
  }
}
```

Then use `{{$dotenv baseUrl}}` instead of `{{baseUrl}}` and switch environments in VS Code.
