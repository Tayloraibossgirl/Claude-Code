# Sample Data Files

This directory contains sample data files showing the expected format for importing your financial data.

## File Formats

### 1. Portfolio Holdings (CSV)

**File:** `sample_portfolio.csv`

Import with: `finai` then `/import portfolio sample_portfolio.csv`

**Columns:**
- `account`: Account name (will be created if doesn't exist)
- `symbol`: Stock ticker, crypto symbol, or asset identifier
- `asset_type`: Asset type (stocks, bonds, crypto, cash, options, etc.)
- `quantity`: Number of shares/units
- `cost_basis`: Purchase price per share/unit
- `purchase_date`: Date purchased (YYYY-MM-DD format)
- `current_price`: (Optional) Current price per share/unit

### 2. Transactions (CSV)

**File:** `sample_transactions.csv`

Import with: `finai` then `/import transactions sample_transactions.csv`

**Columns:**
- `date`: Transaction date (YYYY-MM-DD format)
- `type`: Transaction type (income, expense, buy, sell, deposit, withdrawal)
- `amount`: Transaction amount in dollars
- `category`: (Optional) Category for grouping (salary, consulting, housing, etc.)
- `description`: (Optional) Description of transaction

### 3. Cash Flow (JSON)

**File:** `sample_cashflow.json`

Import with: `finai` then `/import cashflow sample_cashflow.json`

**Format:**
```json
{
  "income": [
    {
      "date": "2024-01-15",
      "category": "salary",
      "amount": 16667,
      "description": "Monthly salary",
      "recurring": true,
      "frequency": "monthly"
    }
  ],
  "expenses": [
    {
      "date": "2024-01-01",
      "category": "housing",
      "amount": 3000,
      "description": "Rent",
      "recurring": true,
      "frequency": "monthly"
    }
  ]
}
```

**Frequency values:** daily, weekly, biweekly, monthly, quarterly, semi-annual, annual

### 4. Accounts (JSON)

**File:** `sample_accounts.json`

Import with: `finai` then `/import accounts sample_accounts.json`

**Format:**
```json
[
  {
    "name": "Brokerage",
    "account_type": "brokerage",
    "institution": "Fidelity",
    "metadata": {
      "account_number": "****1234",
      "opened": "2021-01-01"
    }
  }
]
```

**Account types:** brokerage, retirement, crypto, cash, options, real_estate, etc.

## Customizing Your Data

1. Copy these sample files
2. Replace the sample data with your actual financial data
3. Import using the CLI commands shown above
4. Keep your originals backed up securely

## Security Note

These are sample files with fake data. Never commit your actual financial data to version control or share it publicly.

## Getting Started

1. Install the package: `pip install -e .`
2. Run setup: `finai-setup`
3. Start the CLI: `finai`
4. Import your data: Use the `/import` commands
5. Ask questions: "What's my net worth?"

For more information, see the main README.md file.
