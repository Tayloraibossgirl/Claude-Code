"""
Command-line interface for Financial Analyst AI.
"""

import os
import sys
from pathlib import Path
from rich.console import Console
from rich.markdown import Markdown
from rich.prompt import Prompt
from rich.panel import Panel
from dotenv import load_dotenv

from financial_analyst.core import FinancialAssistant
from financial_analyst.utils.data_import import DataImporter


console = Console()


def load_config():
    """Load configuration from environment or config file."""
    # Load from .env file
    env_path = Path.home() / ".finai" / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        console.print("[red]Error: ANTHROPIC_API_KEY not found.[/red]")
        console.print("Please run 'finai-setup' to configure your API keys.")
        sys.exit(1)

    return api_key


def display_welcome():
    """Display welcome message."""
    welcome_text = """
# Financial Analyst AI Assistant

Your personal AI-powered financial advisor.

**Commands:**
- Type your questions naturally (e.g., "What's my net worth?")
- Type `/import <file>` to import data
- Type `/report <type>` to generate reports
- Type `/help` for more commands
- Type `/quit` to exit
"""
    console.print(Panel(Markdown(welcome_text), border_style="green"))


def display_help():
    """Display help message."""
    help_text = """
# Available Commands

**Data Management:**
- `/import portfolio <file.csv>` - Import portfolio holdings
- `/import transactions <file.csv>` - Import transactions
- `/import cashflow <file.json>` - Import cash flow data
- `/import accounts <file.json>` - Import account configurations

**Reports:**
- `/report portfolio` - Generate portfolio report
- `/report cashflow` - Generate cash flow report
- `/report comprehensive` - Generate all reports

**Utilities:**
- `/refresh` - Refresh current prices for all holdings
- `/reset` - Reset conversation history
- `/help` - Show this help message
- `/quit` or `/exit` - Exit the application

**Natural Language Queries:**
Just ask questions naturally! Examples:
- "What's my current net worth?"
- "Show me my portfolio allocation"
- "Calculate my financial runway"
- "If I make $300K this year, what's my tax liability?"
- "Run a scenario where I relocate with $50K costs"
- "Research NVDA and tell me recent news"
- "What tax-loss harvesting opportunities do I have?"
"""
    console.print(Markdown(help_text))


def handle_command(command: str, assistant: FinancialAssistant) -> bool:
    """
    Handle special commands.

    Returns True if should continue, False if should exit.
    """
    parts = command.split(maxsplit=2)
    cmd = parts[0].lower()

    if cmd in ['/quit', '/exit']:
        console.print("[yellow]Goodbye![/yellow]")
        return False

    elif cmd == '/help':
        display_help()

    elif cmd == '/reset':
        assistant.reset_conversation()
        console.print("[green]Conversation history reset.[/green]")

    elif cmd == '/refresh':
        with console.status("[bold green]Refreshing prices..."):
            response = assistant.chat("Refresh all portfolio prices")
        console.print(Markdown(response))

    elif cmd == '/import':
        if len(parts) < 3:
            console.print("[red]Usage: /import <type> <file_path>[/red]")
            console.print("Types: portfolio, transactions, cashflow, accounts")
            return True

        import_type = parts[1].lower()
        file_path = parts[2]

        if not os.path.exists(file_path):
            console.print(f"[red]Error: File not found: {file_path}[/red]")
            return True

        importer = assistant.importer

        with console.status(f"[bold green]Importing {import_type}..."):
            if import_type == 'portfolio':
                result = importer.import_portfolio_csv(file_path)
            elif import_type == 'transactions':
                result = importer.import_transactions_csv(file_path)
            elif import_type == 'cashflow':
                result = importer.import_cashflow_json(file_path)
            elif import_type == 'accounts':
                result = importer.import_accounts_json(file_path)
            else:
                console.print(f"[red]Unknown import type: {import_type}[/red]")
                return True

        if 'error' in result:
            console.print(f"[red]Import failed: {result['error']}[/red]")
        else:
            console.print(f"[green]Successfully imported {result.get('imported', 0)} entries[/green]")
            if result.get('errors'):
                console.print(f"[yellow]{len(result['errors'])} errors occurred[/yellow]")

    elif cmd == '/report':
        if len(parts) < 2:
            console.print("[red]Usage: /report <type>[/red]")
            console.print("Types: portfolio, cashflow, comprehensive")
            return True

        report_type = parts[1].lower()

        with console.status(f"[bold green]Generating {report_type} report..."):
            response = assistant.chat(f"Generate a {report_type} report")

        console.print(Markdown(response))

    else:
        console.print(f"[red]Unknown command: {cmd}[/red]")
        console.print("Type /help for available commands")

    return True


def main():
    """Main CLI loop."""
    try:
        # Load API key
        api_key = load_config()

        # Initialize assistant
        with console.status("[bold green]Initializing Financial Analyst AI..."):
            assistant = FinancialAssistant(anthropic_api_key=api_key)

        # Display welcome
        display_welcome()

        # Main loop
        while True:
            try:
                # Get user input
                user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]")

                if not user_input.strip():
                    continue

                # Handle commands
                if user_input.startswith('/'):
                    if not handle_command(user_input, assistant):
                        break
                    continue

                # Process as chat
                with console.status("[bold green]Thinking..."):
                    response = assistant.chat(user_input)

                # Display response
                console.print("\n[bold green]Assistant[/bold green]")
                console.print(Markdown(response))

            except KeyboardInterrupt:
                console.print("\n[yellow]Use /quit to exit[/yellow]")
                continue

            except Exception as e:
                console.print(f"[red]Error: {str(e)}[/red]")
                continue

    except Exception as e:
        console.print(f"[red]Fatal error: {str(e)}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
