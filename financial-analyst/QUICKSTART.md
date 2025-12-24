# Quick Start Guide

Get up and running with Financial Analyst AI in 5 minutes.

## Prerequisites

- Python 3.9 or higher
- pip or uv package manager
- Anthropic API key ([get one here](https://console.anthropic.com/))

## Installation

```bash
cd financial-analyst
pip install -e .
```

## Setup

Run the setup wizard:

```bash
finai-setup
```

This will guide you through:
1. Setting your Anthropic API key
2. Optionally configuring Telegram alerts
3. Setting alert preferences

## Import Sample Data

To test the system with sample data:

```bash
finai
```

Then in the CLI:

```
> /import accounts sample_data/sample_accounts.json
> /import portfolio sample_data/sample_portfolio.csv
> /import cashflow sample_data/sample_cashflow.json
```

## Try Your First Queries

```
> What's my current net worth?

> Show me my portfolio allocation

> Calculate my financial runway

> If I make $300K this year, what's my estimated tax liability?

> Run a Monte Carlo simulation for 10 years

> Research NVDA and tell me recent news

> Generate a comprehensive report
```

## Set Up Daily Alerts (Optional)

### Test Alert

```
> Send me a test Telegram alert
```

### Schedule with Cron

Add to your crontab (`crontab -e`):

```cron
0 7 * * * /usr/bin/python3 -m financial_analyst.telegram_alerts
```

This runs daily at 7 AM.

### Schedule with systemd (Linux)

Create `/etc/systemd/system/finai-alert.timer`:

```ini
[Unit]
Description=Financial Analyst Daily Alert

[Timer]
OnCalendar=*-*-* 07:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Create `/etc/systemd/system/finai-alert.service`:

```ini
[Unit]
Description=Financial Analyst Alert Service

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 -m financial_analyst.telegram_alerts
User=yourusername
```

Enable and start:

```bash
sudo systemctl enable finai-alert.timer
sudo systemctl start finai-alert.timer
```

## Importing Your Real Data

### Portfolio Holdings

Create a CSV file with your actual holdings:

```csv
account,symbol,asset_type,quantity,cost_basis,purchase_date,current_price
MyBrokerage,AAPL,stocks,100,150.00,2023-01-15,
MyIRA,VOO,stocks,50,350.00,2022-06-01,
```

Import:
```
> /import portfolio my_portfolio.csv
```

### Cash Flow

Create a JSON file with your income and expenses:

```json
{
  "income": [
    {"date": "2024-01-15", "category": "salary", "amount": 10000, "recurring": true, "frequency": "monthly"}
  ],
  "expenses": [
    {"date": "2024-01-01", "category": "rent", "amount": 2000, "recurring": true, "frequency": "monthly"}
  ]
}
```

Import:
```
> /import cashflow my_cashflow.json
```

## Common Use Cases

### Portfolio Analysis

```
> What's my portfolio allocation by asset type?
> Show me my top holdings
> Which stocks have the best returns?
> What are my unrealized gains?
> Calculate my portfolio's IRR
```

### Cash Flow Management

```
> What's my monthly burn rate?
> How long is my financial runway?
> Show me my expenses by category
> What's my savings rate?
> Project my cash flow for the next 12 months
```

### Scenario Planning

```
> Run a scenario where I take a job paying $250K with $30K relocation costs
> What if I buy a house with a $500K mortgage?
> Model my retirement with $50K annual withdrawals
> Compare W2 vs 1099 tax implications for $200K income
```

### Tax Optimization

```
> Estimate my tax liability for $300K income
> Find tax-loss harvesting opportunities
> Calculate quarterly estimated taxes
> Compare sole proprietor vs S-Corp for my business
```

### Investment Research

```
> Research TSLA and summarize recent news
> Get fundamentals for NVDA
> Refresh all my portfolio prices
> Screen my portfolio for health concerns
```

## Tips

1. **Natural Language**: Ask questions naturally - the AI understands context
2. **Be Specific**: Include numbers and details in your scenarios
3. **Refresh Prices**: Run `/refresh` regularly to update current prices
4. **Generate Reports**: Use `/report comprehensive` for full overview
5. **Export to PDF**: Reports are saved as markdown and can be exported to PDF

## Security Best Practices

- Never commit actual financial data to version control
- Keep your `.finai` directory private (contains sensitive data)
- Regularly backup your database: `~/.finai/financial_data.db`
- Use strong API keys and rotate them periodically
- Keep your Telegram bot token secure

## Troubleshooting

### "API key not found"
Run `finai-setup` to configure your API key

### "Telegram not configured"
Run `finai-setup` and enable Telegram alerts

### "Module not found"
Reinstall: `pip install -e .`

### "Database locked"
Close other instances of the CLI

## Next Steps

- Customize your target asset allocation for rebalancing alerts
- Set up automated daily alerts
- Import historical transaction data
- Explore advanced scenarios and simulations
- Generate monthly reports

## Getting Help

- Type `/help` in the CLI for commands
- Check `README.md` for full documentation
- Review `sample_data/` for file format examples

Happy analyzing! 📊
