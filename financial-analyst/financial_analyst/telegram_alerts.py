"""
Telegram bot integration for daily financial alerts.
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from telegram import Bot
import asyncio

from financial_analyst.core import FinancialAssistant
from financial_analyst.database import FinancialDatabase


def load_config():
    """Load configuration."""
    env_path = Path.home() / ".finai" / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    return {
        'anthropic_api_key': os.getenv("ANTHROPIC_API_KEY"),
        'telegram_bot_token': os.getenv("TELEGRAM_BOT_TOKEN"),
        'telegram_chat_id': os.getenv("TELEGRAM_CHAT_ID")
    }


def generate_daily_alert_message(assistant: FinancialAssistant) -> str:
    """Generate daily alert message content."""
    from financial_analyst.modules.portfolio import PortfolioAnalyzer
    from financial_analyst.modules.research import InvestmentResearcher

    portfolio = PortfolioAnalyzer(assistant.db)
    research = InvestmentResearcher(assistant.db, assistant.client.api_key)

    # Get portfolio summary
    summary = portfolio.get_portfolio_summary()
    top_movers = portfolio.get_top_movers(limit=3)
    tax_opportunities = assistant.tax.identify_tax_loss_harvesting_opportunities(
        min_loss_threshold=-1000,
        min_tax_benefit=200
    )

    # Check for rebalancing needs (example target allocation)
    target_allocation = {
        'stocks': 60.0,
        'bonds': 30.0,
        'cash': 10.0
    }
    rebalancing = portfolio.check_rebalancing_needs(target_allocation, threshold=5.0)

    # Build message
    lines = []
    lines.append(f"📊 *Daily Portfolio Update* - {datetime.now().strftime('%B %d, %Y')}")
    lines.append("")

    # Portfolio value
    lines.append("*Portfolio Summary*")
    lines.append(f"• Total Value: ${summary['total_current_value']:,.2f}")

    # Calculate daily change (simplified - would need historical data)
    lines.append(f"• Unrealized Gain: ${summary['total_gain_loss']:,.2f} ({summary['total_return_pct']:.2f}%)")
    lines.append("")

    # Top movers
    if top_movers['top_gainers']:
        lines.append("*📈 Top Gainers*")
        for holding in top_movers['top_gainers'][:3]:
            lines.append(f"• {holding['symbol']}: {holding['change_pct']:+.2f}%")
        lines.append("")

    if top_movers['top_losers']:
        lines.append("*📉 Top Losers*")
        for holding in top_movers['top_losers'][:3]:
            lines.append(f"• {holding['symbol']}: {holding['change_pct']:+.2f}%")
        lines.append("")

    # Actionable alerts
    alerts = []

    # Check for significant moves (>3%)
    for holding in top_movers['top_gainers']:
        if abs(holding['change_pct']) > 3:
            alerts.append(f"⚠️ {holding['symbol']} moved {holding['change_pct']:+.2f}% - consider rebalancing")

    for holding in top_movers['top_losers']:
        if abs(holding['change_pct']) > 3:
            alerts.append(f"⚠️ {holding['symbol']} moved {holding['change_pct']:+.2f}% - monitor closely")

    # Rebalancing suggestions
    if rebalancing['rebalancing_needed']:
        lines.append("*🎯 Rebalancing Needed*")
        for asset_type, adjustment in rebalancing['adjustments'].items():
            lines.append(
                f"• {asset_type}: {adjustment['current']:.1f}% → {adjustment['target']:.1f}% "
                f"({adjustment['action']})"
            )
        lines.append("")

    # Tax-loss harvesting
    if tax_opportunities:
        lines.append("*💰 Tax-Loss Harvesting Opportunities*")
        for opp in tax_opportunities[:3]:
            lines.append(
                f"• {opp['symbol']}: ${opp['loss_amount']:,.0f} loss "
                f"(~${opp['estimated_tax_benefit']:,.0f} tax benefit)"
            )
        lines.append("")

    # General alerts
    if alerts:
        lines.append("*🔔 Action Items*")
        for alert in alerts[:5]:
            lines.append(f"• {alert}")
        lines.append("")

    # Footer
    lines.append("_Reply 'status' for detailed portfolio status_")
    lines.append("_Reply 'help' for available commands_")

    return "\n".join(lines)


async def send_telegram_alert(bot_token: str, chat_id: str, message: str):
    """Send Telegram message."""
    bot = Bot(token=bot_token)
    await bot.send_message(
        chat_id=chat_id,
        text=message,
        parse_mode='Markdown'
    )


def run_daily_alert():
    """Main function to run daily alert."""
    try:
        # Load config
        config = load_config()

        if not config['anthropic_api_key']:
            print("Error: ANTHROPIC_API_KEY not configured")
            sys.exit(1)

        if not config['telegram_bot_token'] or not config['telegram_chat_id']:
            print("Error: Telegram not configured. Run 'finai-setup' to configure.")
            sys.exit(1)

        # Initialize assistant
        print("Initializing Financial Analyst AI...")
        assistant = FinancialAssistant(anthropic_api_key=config['anthropic_api_key'])

        # Refresh prices first
        print("Refreshing portfolio prices...")
        research = assistant.research
        research.refresh_all_prices()

        # Generate alert message
        print("Generating daily alert...")
        message = generate_daily_alert_message(assistant)

        # Send via Telegram
        print("Sending Telegram alert...")
        asyncio.run(send_telegram_alert(
            config['telegram_bot_token'],
            config['telegram_chat_id'],
            message
        ))

        print(f"Daily alert sent successfully at {datetime.now()}")

        # Also log to file
        log_dir = Path.home() / ".finai" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"alert_{datetime.now().strftime('%Y%m%d')}.txt"
        with open(log_file, 'w') as f:
            f.write(message)

    except Exception as e:
        print(f"Error sending daily alert: {str(e)}")
        sys.exit(1)


def get_test_alert():
    """Get test alert without sending."""
    try:
        config = load_config()

        if not config['anthropic_api_key']:
            return "Error: ANTHROPIC_API_KEY not configured"

        assistant = FinancialAssistant(anthropic_api_key=config['anthropic_api_key'])
        message = generate_daily_alert_message(assistant)
        return message

    except Exception as e:
        return f"Error generating alert: {str(e)}"


def send_test_alert():
    """Send a test alert."""
    try:
        config = load_config()

        if not all([config['anthropic_api_key'], config['telegram_bot_token'], config['telegram_chat_id']]):
            print("Error: Configuration incomplete. Run 'finai-setup' first.")
            sys.exit(1)

        assistant = FinancialAssistant(anthropic_api_key=config['anthropic_api_key'])
        message = generate_daily_alert_message(assistant)
        message = "🧪 *TEST ALERT*\n\n" + message

        asyncio.run(send_telegram_alert(
            config['telegram_bot_token'],
            config['telegram_chat_id'],
            message
        ))

        print("Test alert sent successfully!")

    except Exception as e:
        print(f"Error sending test alert: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    run_daily_alert()
