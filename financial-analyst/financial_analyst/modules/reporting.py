"""
Reporting and visualization module.
"""

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import json


class ReportGenerator:
    """Generate financial reports and visualizations."""

    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db
        self.output_dir = Path.home() / ".finai" / "reports"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_portfolio_report(self, output_format: str = 'markdown') -> str:
        """Generate comprehensive portfolio report."""
        from financial_analyst.modules.portfolio import PortfolioAnalyzer

        portfolio = PortfolioAnalyzer(self.db)

        summary = portfolio.get_portfolio_summary()
        allocation = portfolio.calculate_allocation()
        symbol_allocation = portfolio.calculate_symbol_allocation()
        irr = portfolio.calculate_irr()
        gains = portfolio.calculate_unrealized_gains()
        top_movers = portfolio.get_top_movers()

        report = []
        report.append(f"# Portfolio Report")
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")

        # Summary
        report.append("## Summary")
        report.append(f"- **Total Value**: ${summary['total_current_value']:,.2f}")
        report.append(f"- **Total Cost Basis**: ${summary['total_cost_basis']:,.2f}")
        report.append(f"- **Total Gain/Loss**: ${summary['total_gain_loss']:,.2f} ({summary['total_return_pct']:.2f}%)")
        report.append(f"- **IRR**: {irr:.2f}%")
        report.append(f"- **Number of Accounts**: {summary['num_accounts']}")
        report.append(f"- **Number of Holdings**: {summary['num_holdings']}")
        report.append("")

        # Asset Allocation
        report.append("## Asset Allocation")
        for asset_type, pct in sorted(allocation.items(), key=lambda x: x[1], reverse=True):
            report.append(f"- **{asset_type}**: {pct:.2f}%")
        report.append("")

        # Top Holdings
        report.append("## Top Holdings")
        for symbol, data in list(symbol_allocation.items())[:10]:
            report.append(f"- **{symbol}**: ${data['value']:,.2f} ({data['allocation_pct']:.2f}%)")
        report.append("")

        # Unrealized Gains
        report.append("## Unrealized Gains/Losses")
        report.append(f"- **Total Unrealized**: ${gains['total_unrealized']:,.2f}")
        report.append(f"- **Short-term**: ${gains['short_term_total']:,.2f}")
        report.append(f"- **Long-term**: ${gains['long_term_total']:,.2f}")
        report.append("")

        # Top Movers
        report.append("## Top Performers")
        for holding in top_movers['top_gainers'][:5]:
            report.append(f"- **{holding['symbol']}**: {holding['change_pct']:+.2f}%")
        report.append("")

        report.append("## Top Losers")
        for holding in top_movers['top_losers'][:5]:
            report.append(f"- **{holding['symbol']}**: {holding['change_pct']:+.2f}%")
        report.append("")

        # Account Breakdown
        report.append("## Account Breakdown")
        for account_name, account_data in summary['accounts'].items():
            report.append(f"### {account_name}")
            report.append(f"- **Value**: ${account_data['current_value']:,.2f}")
            report.append(f"- **Cost Basis**: ${account_data['cost_basis']:,.2f}")
            report.append(f"- **Gain/Loss**: ${account_data['gain_loss']:,.2f} ({account_data['return_pct']:.2f}%)")
            report.append("")

        report_text = "\n".join(report)

        # Save report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = self.output_dir / f"portfolio_report_{timestamp}.md"
        with open(filename, 'w') as f:
            f.write(report_text)

        return report_text

    def generate_cashflow_report(self, months: int = 12) -> str:
        """Generate cash flow report."""
        from financial_analyst.modules.cashflow import CashFlowAnalyzer

        cashflow = CashFlowAnalyzer(self.db)

        end_date = datetime.now()
        start_date = end_date - pd.DateOffset(months=months)

        income_summary = cashflow.get_income_summary(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )
        expense_summary = cashflow.get_expense_summary(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )
        burn_rate = cashflow.calculate_burn_rate()
        runway = cashflow.calculate_runway()
        savings_rate = cashflow.calculate_savings_rate()

        report = []
        report.append(f"# Cash Flow Report")
        report.append(f"Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")

        # Income Summary
        report.append("## Income Summary")
        report.append(f"- **Total Income**: ${income_summary['total_income']:,.2f}")
        report.append(f"- **Average Monthly**: ${income_summary['total_income'] / months:,.2f}")
        report.append("")
        report.append("### By Category")
        for category, data in income_summary['by_category'].items():
            report.append(f"- **{category}**: ${data['sum']:,.2f} ({data['count']} entries)")
        report.append("")

        # Expense Summary
        report.append("## Expense Summary")
        report.append(f"- **Total Expenses**: ${expense_summary['total_expenses']:,.2f}")
        report.append(f"- **Average Monthly**: ${expense_summary['total_expenses'] / months:,.2f}")
        report.append(f"- **Monthly Burn Rate**: ${burn_rate['monthly_burn_rate']:,.2f}")
        report.append("")
        report.append("### By Category")
        for category, data in sorted(
            expense_summary['by_category'].items(),
            key=lambda x: x[1]['sum'],
            reverse=True
        ):
            report.append(f"- **{category}**: ${data['sum']:,.2f} ({data['count']} entries)")
        report.append("")

        # Net Cash Flow
        net_flow = income_summary['total_income'] - expense_summary['total_expenses']
        report.append("## Net Cash Flow")
        report.append(f"- **Net**: ${net_flow:,.2f}")
        report.append(f"- **Savings Rate**: {savings_rate['savings_rate']:.2f}%")
        report.append("")

        # Runway
        report.append("## Financial Runway")
        report.append(f"- **Liquid Assets**: ${runway['liquid_assets']:,.2f}")
        report.append(f"- **Monthly Burn**: ${runway['monthly_burn_rate']:,.2f}")
        report.append(f"- **Monthly Income**: ${runway['monthly_income']:,.2f}")
        report.append(f"- **Net Burn**: ${runway['net_burn_rate']:,.2f}")
        if runway['runway_months'] == float('inf'):
            report.append(f"- **Runway**: Indefinite (income exceeds expenses)")
        else:
            report.append(f"- **Runway**: {runway['runway_months']:.1f} months (until {runway['runway_date']})")
        report.append("")

        report_text = "\n".join(report)

        # Save report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = self.output_dir / f"cashflow_report_{timestamp}.md"
        with open(filename, 'w') as f:
            f.write(report_text)

        return report_text

    def create_allocation_pie_chart(self, output_file: str = None) -> str:
        """Create portfolio allocation pie chart."""
        from financial_analyst.modules.portfolio import PortfolioAnalyzer

        portfolio = PortfolioAnalyzer(self.db)
        allocation = portfolio.calculate_allocation()

        if not allocation:
            return "No allocation data available"

        fig = go.Figure(data=[go.Pie(
            labels=list(allocation.keys()),
            values=list(allocation.values()),
            hole=.3
        )])

        fig.update_layout(
            title="Portfolio Allocation by Asset Type",
            showlegend=True
        )

        if output_file is None:
            output_file = str(self.output_dir / f"allocation_pie_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html")

        fig.write_html(output_file)
        return output_file

    def create_networth_chart(self, output_file: str = None) -> str:
        """Create net worth over time chart."""
        # Get historical transactions
        transactions = self.db.get_transactions()

        if not transactions:
            return "No transaction data available"

        df = pd.DataFrame(transactions)
        df['transaction_date'] = pd.to_datetime(df['transaction_date'])
        df = df.sort_values('transaction_date')

        # Calculate cumulative net worth
        df['cumulative'] = df['amount'].cumsum()

        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=df['transaction_date'],
            y=df['cumulative'],
            mode='lines',
            name='Net Worth',
            fill='tozeroy'
        ))

        fig.update_layout(
            title="Net Worth Over Time",
            xaxis_title="Date",
            yaxis_title="Net Worth ($)",
            hovermode='x unified'
        )

        if output_file is None:
            output_file = str(self.output_dir / f"networth_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html")

        fig.write_html(output_file)
        return output_file

    def create_cashflow_waterfall(self, year: int, output_file: str = None) -> str:
        """Create cash flow waterfall chart."""
        from financial_analyst.modules.cashflow import CashFlowAnalyzer

        cashflow = CashFlowAnalyzer(self.db)

        # Get quarterly data
        quarters = [cashflow.get_quarterly_summary(year, q) for q in range(1, 5)]

        categories = ['Q1 Income', 'Q1 Expenses', 'Q2 Income', 'Q2 Expenses',
                     'Q3 Income', 'Q3 Expenses', 'Q4 Income', 'Q4 Expenses']
        values = []

        for q in quarters:
            values.append(q['income']['total_income'])
            values.append(-q['expenses']['total_expenses'])

        # Calculate cumulative
        measure = ['relative'] * len(values)
        measure[-1] = 'total'

        fig = go.Figure(go.Waterfall(
            name="Cash Flow",
            orientation="v",
            measure=measure,
            x=categories,
            y=values,
            connector={"line": {"color": "rgb(63, 63, 63)"}},
        ))

        fig.update_layout(
            title=f"Cash Flow Waterfall - {year}",
            showlegend=False
        )

        if output_file is None:
            output_file = str(self.output_dir / f"cashflow_waterfall_{year}.html")

        fig.write_html(output_file)
        return output_file

    def create_monte_carlo_chart(self, simulation_results: Dict, output_file: str = None) -> str:
        """Create Monte Carlo simulation visualization."""
        simulations = np.array(simulation_results['all_simulations'])
        years = simulation_results['years']

        fig = go.Figure()

        # Plot percentile bands
        x_years = list(range(years + 1))

        # 10th-90th percentile band
        percentile_10 = [simulation_results['yearly_statistics'][y]['percentile_10'] for y in x_years]
        percentile_90 = [simulation_results['yearly_statistics'][y]['percentile_90'] for y in x_years]

        fig.add_trace(go.Scatter(
            x=x_years,
            y=percentile_90,
            mode='lines',
            line=dict(width=0),
            showlegend=False,
            hoverinfo='skip'
        ))

        fig.add_trace(go.Scatter(
            x=x_years,
            y=percentile_10,
            mode='lines',
            line=dict(width=0),
            fillcolor='rgba(68, 68, 68, 0.3)',
            fill='tonexty',
            name='10th-90th Percentile',
            hoverinfo='skip'
        ))

        # Median line
        median_values = [simulation_results['yearly_statistics'][y]['median'] for y in x_years]
        fig.add_trace(go.Scatter(
            x=x_years,
            y=median_values,
            mode='lines',
            name='Median',
            line=dict(color='blue', width=3)
        ))

        # Sample paths
        num_samples = min(50, len(simulations))
        sample_indices = np.random.choice(len(simulations), num_samples, replace=False)

        for idx in sample_indices:
            fig.add_trace(go.Scatter(
                x=x_years,
                y=simulations[idx],
                mode='lines',
                line=dict(width=0.5, color='rgba(128, 128, 128, 0.3)'),
                showlegend=False,
                hoverinfo='skip'
            ))

        fig.update_layout(
            title=f"Monte Carlo Portfolio Simulation ({simulation_results['simulations']} runs)",
            xaxis_title="Year",
            yaxis_title="Portfolio Value ($)",
            hovermode='x unified'
        )

        if output_file is None:
            output_file = str(self.output_dir / f"monte_carlo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html")

        fig.write_html(output_file)
        return output_file

    def export_to_pdf(self, markdown_file: str) -> str:
        """
        Export markdown report to PDF.

        Note: Requires pandoc to be installed.
        """
        import subprocess

        pdf_file = markdown_file.replace('.md', '.pdf')

        try:
            subprocess.run(
                ['pandoc', markdown_file, '-o', pdf_file],
                check=True
            )
            return pdf_file
        except subprocess.CalledProcessError:
            return "Error: PDF export requires pandoc to be installed"
        except FileNotFoundError:
            return "Error: pandoc not found. Install with: sudo apt-get install pandoc"

    def generate_comprehensive_report(self) -> Dict[str, str]:
        """Generate all reports and visualizations."""
        outputs = {}

        # Text reports
        outputs['portfolio_report'] = self.generate_portfolio_report()
        outputs['cashflow_report'] = self.generate_cashflow_report()

        # Visualizations
        outputs['allocation_chart'] = self.create_allocation_pie_chart()
        outputs['networth_chart'] = self.create_networth_chart()

        current_year = datetime.now().year
        outputs['cashflow_waterfall'] = self.create_cashflow_waterfall(current_year)

        return outputs
