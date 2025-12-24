"""
Core Financial Assistant with conversational AI.
"""

import anthropic
import json
from typing import Dict, List, Optional
from datetime import datetime
import pandas as pd

from financial_analyst.database import FinancialDatabase
from financial_analyst.modules.portfolio import PortfolioAnalyzer
from financial_analyst.modules.cashflow import CashFlowAnalyzer
from financial_analyst.modules.scenarios import ScenarioModeler
from financial_analyst.modules.research import InvestmentResearcher
from financial_analyst.modules.tax import TaxOptimizer
from financial_analyst.modules.reporting import ReportGenerator
from financial_analyst.utils.data_import import DataImporter


class FinancialAssistant:
    """Main conversational financial assistant."""

    def __init__(self, anthropic_api_key: str, db_path: str = None):
        """Initialize the financial assistant."""
        self.db = FinancialDatabase(db_path)
        self.client = anthropic.Anthropic(api_key=anthropic_api_key)

        # Initialize modules
        self.portfolio = PortfolioAnalyzer(self.db)
        self.cashflow = CashFlowAnalyzer(self.db)
        self.scenarios = ScenarioModeler(self.db)
        self.research = InvestmentResearcher(self.db, anthropic_api_key)
        self.tax = TaxOptimizer(self.db)
        self.reporting = ReportGenerator(self.db)
        self.importer = DataImporter(self.db)

        # Conversation history
        self.conversation_history = []

        # System prompt
        self.system_prompt = """You are a personal financial analyst AI assistant. You help users manage their portfolio, track cash flow, plan taxes, run financial scenarios, and provide investment insights.

You have access to various financial analysis tools and can:
- Analyze portfolio performance and allocation
- Track income and expenses
- Calculate financial runway and projections
- Run Monte Carlo simulations and scenario analyses
- Research stocks and investments
- Optimize tax strategies
- Generate comprehensive reports

When users ask questions, analyze their financial data and provide clear, actionable insights. Be concise but thorough. Use numbers and percentages to quantify your analysis.

For numerical questions, always provide specific dollar amounts and percentages from the data.
For research questions, use web search to get current information.
For scenario questions, run the appropriate analysis and explain the implications.

Available function tools:
- get_portfolio_summary: Get current portfolio overview
- get_allocation: Get asset allocation
- calculate_net_worth: Calculate total net worth
- get_cashflow_summary: Get income and expense summary
- calculate_runway: Calculate financial runway
- run_scenario: Run a what-if scenario
- monte_carlo_simulation: Run Monte Carlo portfolio simulation
- research_stock: Research a specific stock
- estimate_taxes: Estimate tax liability
- generate_report: Generate financial reports
- import_data: Import financial data from files
- refresh_prices: Update current prices for all holdings

When asked to perform actions like importing data or generating reports, use the appropriate tool and confirm completion.
"""

    def _get_available_tools(self) -> List[Dict]:
        """Define available function tools for Claude."""
        return [
            {
                "name": "get_portfolio_summary",
                "description": "Get comprehensive portfolio summary including total value, returns, and account breakdown",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "get_allocation",
                "description": "Get portfolio allocation by asset type or by symbol",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "by_symbol": {
                            "type": "boolean",
                            "description": "If true, return allocation by symbol; otherwise by asset type"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "calculate_net_worth",
                "description": "Calculate total net worth across all accounts",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "get_cashflow_summary",
                "description": "Get cash flow summary for a time period",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "months": {
                            "type": "integer",
                            "description": "Number of months to analyze (default 3)"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "calculate_runway",
                "description": "Calculate financial runway based on current assets and burn rate",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "run_scenario",
                "description": "Run a what-if scenario analysis",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "scenario_name": {
                            "type": "string",
                            "description": "Name of the scenario"
                        },
                        "income_change": {
                            "type": "number",
                            "description": "Annual income change (can be negative)"
                        },
                        "expense_change": {
                            "type": "number",
                            "description": "One-time expense"
                        },
                        "recurring_expense_change": {
                            "type": "number",
                            "description": "Monthly recurring expense change"
                        },
                        "time_horizon_months": {
                            "type": "integer",
                            "description": "How many months to project (default 24)"
                        }
                    },
                    "required": ["scenario_name"]
                }
            },
            {
                "name": "monte_carlo_simulation",
                "description": "Run Monte Carlo simulation for portfolio projections",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "years": {
                            "type": "integer",
                            "description": "Number of years to simulate (default 10)"
                        },
                        "simulations": {
                            "type": "integer",
                            "description": "Number of simulation runs (default 1000)"
                        },
                        "expected_return": {
                            "type": "number",
                            "description": "Expected annual return as decimal (e.g., 0.07 for 7%)"
                        },
                        "volatility": {
                            "type": "number",
                            "description": "Annual volatility as decimal (e.g., 0.15 for 15%)"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "research_stock",
                "description": "Research a stock symbol with fundamentals and news",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "symbol": {
                            "type": "string",
                            "description": "Stock symbol (e.g., AAPL, NVDA)"
                        },
                        "include_news": {
                            "type": "boolean",
                            "description": "Whether to include web search for news (default true)"
                        }
                    },
                    "required": ["symbol"]
                }
            },
            {
                "name": "estimate_taxes",
                "description": "Estimate annual tax liability",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "annual_income": {
                            "type": "number",
                            "description": "Estimated annual income"
                        },
                        "filing_status": {
                            "type": "string",
                            "description": "Filing status: 'single' or 'married' (default 'single')"
                        }
                    },
                    "required": ["annual_income"]
                }
            },
            {
                "name": "generate_report",
                "description": "Generate financial report",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "report_type": {
                            "type": "string",
                            "description": "Type of report: 'portfolio', 'cashflow', or 'comprehensive'"
                        }
                    },
                    "required": ["report_type"]
                }
            },
            {
                "name": "refresh_prices",
                "description": "Refresh current prices for all portfolio holdings",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "add_transaction",
                "description": "Add a financial transaction (income, expense, investment)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "date": {
                            "type": "string",
                            "description": "Transaction date (YYYY-MM-DD)"
                        },
                        "type": {
                            "type": "string",
                            "description": "Transaction type: income, expense, buy, sell"
                        },
                        "amount": {
                            "type": "number",
                            "description": "Transaction amount"
                        },
                        "category": {
                            "type": "string",
                            "description": "Category (e.g., consulting, salary, housing)"
                        },
                        "description": {
                            "type": "string",
                            "description": "Description of transaction"
                        }
                    },
                    "required": ["date", "type", "amount"]
                }
            }
        ]

    def _execute_tool(self, tool_name: str, tool_input: Dict) -> str:
        """Execute a tool and return results as JSON string."""
        try:
            if tool_name == "get_portfolio_summary":
                result = self.portfolio.get_portfolio_summary()
                return json.dumps(result, indent=2, default=str)

            elif tool_name == "get_allocation":
                if tool_input.get('by_symbol'):
                    result = self.portfolio.calculate_symbol_allocation()
                else:
                    result = self.portfolio.calculate_allocation()
                return json.dumps(result, indent=2, default=str)

            elif tool_name == "calculate_net_worth":
                summary = self.portfolio.get_portfolio_summary()
                result = {
                    'net_worth': summary['total_current_value'],
                    'cost_basis': summary['total_cost_basis'],
                    'unrealized_gains': summary['total_gain_loss']
                }
                return json.dumps(result, indent=2)

            elif tool_name == "get_cashflow_summary":
                months = tool_input.get('months', 3)
                end_date = datetime.now()
                start_date = end_date - pd.DateOffset(months=months)
                income = self.cashflow.get_income_summary(
                    start_date.strftime('%Y-%m-%d'),
                    end_date.strftime('%Y-%m-%d')
                )
                expenses = self.cashflow.get_expense_summary(
                    start_date.strftime('%Y-%m-%d'),
                    end_date.strftime('%Y-%m-%d')
                )
                result = {
                    'income': income,
                    'expenses': expenses,
                    'net': income['total_income'] - expenses['total_expenses']
                }
                return json.dumps(result, indent=2, default=str)

            elif tool_name == "calculate_runway":
                result = self.cashflow.calculate_runway()
                return json.dumps(result, indent=2, default=str)

            elif tool_name == "run_scenario":
                result = self.scenarios.run_what_if_scenario(
                    scenario_name=tool_input['scenario_name'],
                    parameters=tool_input
                )
                return json.dumps(result, indent=2, default=str)

            elif tool_name == "monte_carlo_simulation":
                result = self.scenarios.monte_carlo_portfolio_simulation(
                    years=tool_input.get('years', 10),
                    simulations=tool_input.get('simulations', 1000),
                    expected_return=tool_input.get('expected_return', 0.07),
                    volatility=tool_input.get('volatility', 0.15),
                    annual_contribution=tool_input.get('annual_contribution', 0)
                )
                # Don't include all simulations in response (too large)
                result_summary = {k: v for k, v in result.items() if k != 'all_simulations'}
                return json.dumps(result_summary, indent=2, default=str)

            elif tool_name == "research_stock":
                symbol = tool_input['symbol']
                fundamentals = self.research.get_stock_fundamentals(symbol)
                result = {'fundamentals': fundamentals}

                if tool_input.get('include_news', True):
                    news = self.research.web_search_stock(symbol)
                    result['news_summary'] = news

                return json.dumps(result, indent=2, default=str)

            elif tool_name == "estimate_taxes":
                result = self.tax.estimate_annual_tax_liability(
                    annual_income=tool_input['annual_income'],
                    filing_status=tool_input.get('filing_status', 'single')
                )
                return json.dumps(result, indent=2, default=str)

            elif tool_name == "generate_report":
                report_type = tool_input['report_type']
                if report_type == 'portfolio':
                    result = self.reporting.generate_portfolio_report()
                elif report_type == 'cashflow':
                    result = self.reporting.generate_cashflow_report()
                elif report_type == 'comprehensive':
                    result = self.reporting.generate_comprehensive_report()
                else:
                    return json.dumps({'error': 'Invalid report type'})
                return json.dumps({'status': 'success', 'output': result}, default=str)

            elif tool_name == "refresh_prices":
                result = self.research.refresh_all_prices()
                return json.dumps(result, indent=2)

            elif tool_name == "add_transaction":
                transaction_id = self.db.add_transaction(
                    transaction_date=tool_input['date'],
                    transaction_type=tool_input['type'],
                    amount=tool_input['amount'],
                    category=tool_input.get('category'),
                    description=tool_input.get('description')
                )

                # Also add to cash_flow if income or expense
                if tool_input['type'] in ['income', 'expense']:
                    self.db.add_cash_flow(
                        date=tool_input['date'],
                        flow_type=tool_input['type'],
                        category=tool_input.get('category', 'uncategorized'),
                        amount=tool_input['amount'],
                        description=tool_input.get('description')
                    )

                return json.dumps({'status': 'success', 'transaction_id': transaction_id})

            else:
                return json.dumps({'error': f'Unknown tool: {tool_name}'})

        except Exception as e:
            return json.dumps({'error': str(e)})

    def chat(self, user_message: str) -> str:
        """
        Process a user message and return assistant response.

        Args:
            user_message: User's message/question

        Returns:
            Assistant's response as a string
        """
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        # Call Claude API with function calling
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=self.system_prompt,
            tools=self._get_available_tools(),
            messages=self.conversation_history
        )

        # Process response and tool calls
        assistant_message = {"role": "assistant", "content": []}

        while response.stop_reason == "tool_use":
            # Add assistant's response to history
            assistant_message["content"].extend(response.content)

            # Execute tools
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_result = self._execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": tool_result
                    })

            # Add tool results to conversation
            self.conversation_history.append(assistant_message)
            self.conversation_history.append({
                "role": "user",
                "content": tool_results
            })

            # Continue conversation
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=self.system_prompt,
                tools=self._get_available_tools(),
                messages=self.conversation_history
            )

            assistant_message = {"role": "assistant", "content": []}

        # Extract final text response
        assistant_message["content"].extend(response.content)
        self.conversation_history.append(assistant_message)

        # Get text from response
        response_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                response_text += block.text

        return response_text

    def reset_conversation(self):
        """Reset conversation history."""
        self.conversation_history = []
