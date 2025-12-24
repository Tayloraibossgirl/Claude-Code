"""
Setup wizard for configuring Financial Analyst AI.
"""

import os
import sys
from pathlib import Path
from getpass import getpass
from rich.console import Console
from rich.prompt import Prompt, Confirm
from rich.panel import Panel
from rich.markdown import Markdown

console = Console()


def setup_wizard():
    """Interactive setup wizard."""
    console.print(Panel.fit(
        "[bold green]Financial Analyst AI - Setup Wizard[/bold green]\n\n"
        "This wizard will help you configure your API keys and settings.",
        border_style="green"
    ))

    config_dir = Path.home() / ".finai"
    config_dir.mkdir(parents=True, exist_ok=True)
    env_file = config_dir / ".env"

    # Load existing config if any
    existing_config = {}
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    existing_config[key] = value

    console.print("\n[bold]Step 1: Anthropic API Key[/bold]")
    console.print("This is required for AI-powered financial analysis.")
    console.print("Get your API key from: https://console.anthropic.com/")

    current_key = existing_config.get('ANTHROPIC_API_KEY', '')
    if current_key:
        console.print(f"Current API key: {current_key[:20]}...")
        if not Confirm.ask("Update API key?", default=False):
            anthropic_api_key = current_key
        else:
            anthropic_api_key = getpass("Enter Anthropic API key: ")
    else:
        anthropic_api_key = getpass("Enter Anthropic API key: ")

    # Telegram setup
    console.print("\n[bold]Step 2: Telegram Bot (Optional)[/bold]")
    console.print("Set up daily alerts via Telegram bot.")

    setup_telegram = Confirm.ask("Configure Telegram alerts?", default=True)

    telegram_bot_token = ""
    telegram_chat_id = ""

    if setup_telegram:
        console.print("\n[cyan]Creating a Telegram Bot:[/cyan]")
        console.print("1. Open Telegram and search for @BotFather")
        console.print("2. Send /newbot and follow the instructions")
        console.print("3. Copy the bot token provided")

        current_token = existing_config.get('TELEGRAM_BOT_TOKEN', '')
        if current_token:
            console.print(f"Current bot token: {current_token[:20]}...")
            if not Confirm.ask("Update bot token?", default=False):
                telegram_bot_token = current_token
            else:
                telegram_bot_token = Prompt.ask("Enter Telegram Bot Token")
        else:
            telegram_bot_token = Prompt.ask("Enter Telegram Bot Token")

        console.print("\n[cyan]Getting your Chat ID:[/cyan]")
        console.print("1. Search for @userinfobot on Telegram")
        console.print("2. Send /start to the bot")
        console.print("3. Copy your User ID (this is your chat ID)")

        current_chat_id = existing_config.get('TELEGRAM_CHAT_ID', '')
        if current_chat_id:
            console.print(f"Current chat ID: {current_chat_id}")
            if not Confirm.ask("Update chat ID?", default=False):
                telegram_chat_id = current_chat_id
            else:
                telegram_chat_id = Prompt.ask("Enter Telegram Chat ID")
        else:
            telegram_chat_id = Prompt.ask("Enter Telegram Chat ID")

    # Alert time
    console.print("\n[bold]Step 3: Alert Settings[/bold]")
    alert_time = Prompt.ask(
        "Daily alert time (HH:MM, 24-hour format)",
        default=existing_config.get('ALERT_TIME', '07:00')
    )

    # Save configuration
    with open(env_file, 'w') as f:
        f.write("# Financial Analyst AI Configuration\n")
        f.write(f"ANTHROPIC_API_KEY={anthropic_api_key}\n")

        if telegram_bot_token:
            f.write(f"TELEGRAM_BOT_TOKEN={telegram_bot_token}\n")
        if telegram_chat_id:
            f.write(f"TELEGRAM_CHAT_ID={telegram_chat_id}\n")

        f.write(f"ALERT_TIME={alert_time}\n")

    # Set restrictive permissions
    os.chmod(env_file, 0o600)

    console.print("\n[green]✓ Configuration saved![/green]")
    console.print(f"Config file: {env_file}")

    # Offer to set up cron job
    if setup_telegram and sys.platform != 'win32':
        console.print("\n[bold]Step 4: Schedule Daily Alerts (Optional)[/bold]")

        if Confirm.ask("Set up daily alerts using cron?", default=True):
            setup_cron_job(alert_time)

    # Test connection
    console.print("\n[bold]Testing Configuration...[/bold]")

    try:
        from financial_analyst.core import FinancialAssistant

        with console.status("[bold green]Initializing..."):
            assistant = FinancialAssistant(anthropic_api_key=anthropic_api_key)

        console.print("[green]✓ Anthropic API connection successful![/green]")

        if telegram_bot_token and telegram_chat_id:
            if Confirm.ask("Send test Telegram alert?", default=True):
                from financial_analyst.telegram_alerts import send_test_alert
                send_test_alert()

    except Exception as e:
        console.print(f"[red]Error testing configuration: {str(e)}[/red]")

    # Show next steps
    console.print("\n" + "="*60)
    console.print("[bold green]Setup Complete![/bold green]")
    console.print("\n[bold]Next Steps:[/bold]")
    console.print("1. Run 'finai' to start the interactive assistant")
    console.print("2. Import your financial data using sample files in sample_data/")
    console.print("3. Try asking: 'What's my current net worth?'")
    console.print("\n[bold]Sample Data:[/bold]")
    console.print("Check the sample_data/ directory for example file formats.")
    console.print("\nFor help, run 'finai' and type '/help'")


def setup_cron_job(alert_time: str):
    """Help user set up cron job for daily alerts."""
    hour, minute = alert_time.split(':')

    cron_line = f"{minute} {hour} * * * {sys.executable} -m financial_analyst.telegram_alerts"

    console.print("\n[cyan]Cron Job Setup:[/cyan]")
    console.print("Add this line to your crontab (run 'crontab -e'):")
    console.print(f"\n  [bold]{cron_line}[/bold]\n")

    console.print("This will run the daily alert at", alert_time, "every day.")

    if Confirm.ask("Copy instructions to clipboard?", default=False):
        try:
            import pyperclip
            pyperclip.copy(cron_line)
            console.print("[green]✓ Copied to clipboard![/green]")
        except ImportError:
            console.print("[yellow]Install pyperclip to enable clipboard copy[/yellow]")


def main():
    """Main entry point for setup wizard."""
    try:
        setup_wizard()
    except KeyboardInterrupt:
        console.print("\n[yellow]Setup cancelled[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"\n[red]Setup failed: {str(e)}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
