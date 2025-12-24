# Financial Analyst AI Assistant

A comprehensive, AI-powered personal finance management tool that runs entirely on your local machine.

## Features

- **Portfolio Tracking**: Monitor multiple accounts (brokerage, retirement, crypto, stock options)
- **Cash Flow Analysis**: Track income streams, expenses, and calculate runway
- **Scenario Modeling**: Run "what if" analyses and Monte Carlo simulations
- **Investment Research**: Integrated web search and fundamental analysis
- **Tax Optimization**: Track cost basis, identify tax-loss harvesting opportunities
- **Reporting**: Generate detailed financial reports with visualizations
- **Daily Telegram Alerts**: Receive automated daily portfolio updates and actionable insights

## Installation

### Prerequisites

- Python 3.9 or higher
- pip or uv package manager

### Install from source

```bash
cd financial-analyst
pip install -e .
```

### Setup

1. Run the setup wizard to configure your API keys:

```bash
finai-setup
```

This will prompt you for:
- Anthropic API key (for AI conversations)
- Telegram Bot Token (optional, for daily alerts)
- Telegram Chat ID (optional, for daily alerts)

2. Start the assistant:

```bash
finai
```

## Usage

### Interactive CLI

The assistant supports natural language conversations:

```
> What's my current net worth?
> Show me my portfolio allocation
> If I make $300K this year, what's my estimated tax liability?
> Run a scenario where I relocate and have $50K in moving costs
> Research NVDA and tell me recent news
> Generate a Q4 financial report
```

### Data Import

Import portfolio data from CSV or JSON:

```
> Import portfolio from portfolio.csv
> Add account from accounts.json
```

See `sample_data/` directory for file format examples.

### Telegram Alerts

Set up daily alerts:

```bash
finai-setup
```

Test your alert configuration:

```
> Send me a test Telegram alert
> What would today's alert say?
> Change my alert time to 6:30am
```

### Scheduling Daily Alerts

#### Using cron (Linux/macOS)

```bash
# Edit crontab
crontab -e

# Add this line for 7am daily alerts
0 7 * * * /path/to/python -m financial_analyst.telegram_alerts
```

#### Using systemd timer (Linux)

Create `/etc/systemd/system/finai-alert.service`:

```ini
[Unit]
Description=Financial Analyst Daily Alert
After=network.target

[Service]
Type=oneshot
User=youruser
ExecStart=/path/to/finai-alert
```

Create `/etc/systemd/system/finai-alert.timer`:

```ini
[Unit]
Description=Run Financial Analyst Alert Daily
Requires=finai-alert.service

[Timer]
OnCalendar=*-*-* 07:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable finai-alert.timer
sudo systemctl start finai-alert.timer
```

## Data Storage

All data is stored locally in SQLite databases:

- `~/.finai/financial_data.db` - Portfolio, transactions, cash flow data
- `~/.finai/config.db` - Configuration and API keys (encrypted)

## Sample Data

The `sample_data/` directory contains example files showing expected formats:

- `sample_portfolio.csv` - Portfolio holdings format
- `sample_transactions.csv` - Transaction history format
- `sample_cashflow.json` - Income and expense data format
- `sample_accounts.json` - Account configuration format

## Security Notes

- API keys are stored encrypted in your home directory
- All financial data remains on your local machine
- Web searches use Anthropic's API (data is processed but not stored by Anthropic)
- Telegram messages are sent via Telegram's encrypted API

## Development

```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black financial_analyst/

# Lint
ruff financial_analyst/
```

## License

MIT
