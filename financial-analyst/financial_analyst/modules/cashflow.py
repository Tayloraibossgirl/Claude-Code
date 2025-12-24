"""
Cash flow analysis module for income, expenses, and runway calculations.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dateutil.relativedelta import relativedelta


class CashFlowAnalyzer:
    """Analyzes cash flow, income, expenses, and calculates runway."""

    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db

    def get_income_summary(self, start_date: str = None, end_date: str = None) -> Dict:
        """Get income summary for a period."""
        income_flows = self.db.get_cash_flow(
            start_date=start_date,
            end_date=end_date,
            flow_type='income'
        )

        if not income_flows:
            return {
                'total_income': 0,
                'by_category': {},
                'num_entries': 0
            }

        df = pd.DataFrame(income_flows)
        total_income = df['amount'].sum()

        by_category = df.groupby('category')['amount'].agg(['sum', 'count', 'mean']).to_dict('index')

        return {
            'total_income': total_income,
            'by_category': by_category,
            'num_entries': len(income_flows),
            'average_per_entry': total_income / len(income_flows) if income_flows else 0
        }

    def get_expense_summary(self, start_date: str = None, end_date: str = None) -> Dict:
        """Get expense summary for a period."""
        expense_flows = self.db.get_cash_flow(
            start_date=start_date,
            end_date=end_date,
            flow_type='expense'
        )

        if not expense_flows:
            return {
                'total_expenses': 0,
                'by_category': {},
                'num_entries': 0
            }

        df = pd.DataFrame(expense_flows)
        total_expenses = df['amount'].sum()

        by_category = df.groupby('category')['amount'].agg(['sum', 'count', 'mean']).to_dict('index')

        return {
            'total_expenses': total_expenses,
            'by_category': by_category,
            'num_entries': len(expense_flows),
            'average_per_entry': total_expenses / len(expense_flows) if expense_flows else 0
        }

    def calculate_burn_rate(self, period_months: int = 3) -> Dict:
        """
        Calculate monthly burn rate based on recent expenses.

        Args:
            period_months: Number of months to analyze (default 3)
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_months * 30)

        expense_summary = self.get_expense_summary(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )

        total_expenses = expense_summary['total_expenses']
        monthly_burn = total_expenses / period_months if period_months > 0 else 0

        # Get recurring expenses
        all_expenses = self.db.get_cash_flow(flow_type='expense')
        recurring = [e for e in all_expenses if e.get('recurring')]
        recurring_monthly = sum(
            self._normalize_to_monthly(e['amount'], e.get('frequency', 'monthly'))
            for e in recurring
        )

        return {
            'monthly_burn_rate': monthly_burn,
            'period_months': period_months,
            'total_expenses': total_expenses,
            'recurring_monthly': recurring_monthly,
            'non_recurring_monthly': monthly_burn - recurring_monthly,
            'by_category': expense_summary['by_category']
        }

    def _normalize_to_monthly(self, amount: float, frequency: str) -> float:
        """Normalize an amount to monthly based on frequency."""
        frequency_map = {
            'daily': 30,
            'weekly': 4.33,
            'biweekly': 2.17,
            'monthly': 1,
            'quarterly': 1/3,
            'semi-annual': 1/6,
            'annual': 1/12
        }
        return amount * frequency_map.get(frequency.lower(), 1)

    def calculate_runway(self, liquid_assets: float = None,
                        monthly_burn: float = None,
                        monthly_income: float = None) -> Dict:
        """
        Calculate financial runway.

        Args:
            liquid_assets: Available liquid assets (if None, calculated from portfolio)
            monthly_burn: Monthly burn rate (if None, calculated from recent expenses)
            monthly_income: Expected monthly income (if None, calculated from recent income)
        """
        # Calculate liquid assets if not provided
        if liquid_assets is None:
            # Sum up cash and liquid holdings
            holdings = self.db.get_holdings()
            liquid_assets = sum(
                h['quantity'] * (h['current_price'] or h['cost_basis'])
                for h in holdings
                if h['asset_type'] in ['cash', 'money_market', 'bonds']
            )

        # Calculate monthly burn if not provided
        if monthly_burn is None:
            burn_data = self.calculate_burn_rate()
            monthly_burn = burn_data['monthly_burn_rate']

        # Calculate monthly income if not provided
        if monthly_income is None:
            # Get last 3 months of income
            end_date = datetime.now()
            start_date = end_date - timedelta(days=90)
            income_summary = self.get_income_summary(
                start_date=start_date.strftime('%Y-%m-%d'),
                end_date=end_date.strftime('%Y-%m-%d')
            )
            monthly_income = income_summary['total_income'] / 3

        # Calculate net burn
        net_burn = monthly_burn - monthly_income

        # Calculate runway
        if net_burn <= 0:
            runway_months = float('inf')  # Infinite runway if income covers expenses
        else:
            runway_months = liquid_assets / net_burn

        return {
            'liquid_assets': liquid_assets,
            'monthly_burn_rate': monthly_burn,
            'monthly_income': monthly_income,
            'net_burn_rate': net_burn,
            'runway_months': runway_months,
            'runway_date': (datetime.now() + relativedelta(months=int(runway_months))).strftime('%Y-%m-%d')
                          if runway_months != float('inf') else 'Indefinite'
        }

    def project_cash_flow(self, months: int = 12, scenarios: Dict = None) -> pd.DataFrame:
        """
        Project cash flow for future months.

        Args:
            months: Number of months to project
            scenarios: Dict with scenario adjustments (e.g., {'income_change': -50000})
        """
        # Get current recurring income and expenses
        all_income = self.db.get_cash_flow(flow_type='income')
        all_expenses = self.db.get_cash_flow(flow_type='expense')

        recurring_income = sum(
            self._normalize_to_monthly(e['amount'], e.get('frequency', 'monthly'))
            for e in all_income if e.get('recurring')
        )

        recurring_expenses = sum(
            self._normalize_to_monthly(e['amount'], e.get('frequency', 'monthly'))
            for e in all_expenses if e.get('recurring')
        )

        # Get recent averages for non-recurring
        burn_data = self.calculate_burn_rate()
        income_data = self.get_income_summary(
            start_date=(datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        )

        avg_monthly_income = income_data['total_income'] / 3
        avg_monthly_expenses = burn_data['monthly_burn_rate']

        # Apply scenarios
        if scenarios:
            if 'income_change' in scenarios:
                avg_monthly_income += scenarios['income_change']
            if 'expense_change' in scenarios:
                avg_monthly_expenses += scenarios['expense_change']
            if 'income_multiplier' in scenarios:
                avg_monthly_income *= scenarios['income_multiplier']
            if 'expense_multiplier' in scenarios:
                avg_monthly_expenses *= scenarios['expense_multiplier']

        # Build projection
        current_date = datetime.now()
        projections = []

        # Get current liquid assets
        runway_data = self.calculate_runway()
        current_balance = runway_data['liquid_assets']

        for month in range(months):
            projection_date = current_date + relativedelta(months=month)

            monthly_income = avg_monthly_income
            monthly_expenses = avg_monthly_expenses
            net_cash_flow = monthly_income - monthly_expenses
            current_balance += net_cash_flow

            projections.append({
                'month': projection_date.strftime('%Y-%m'),
                'income': monthly_income,
                'expenses': monthly_expenses,
                'net_cash_flow': net_cash_flow,
                'balance': current_balance
            })

        return pd.DataFrame(projections)

    def analyze_income_streams(self) -> Dict[str, Dict]:
        """Analyze different income streams."""
        income_flows = self.db.get_cash_flow(flow_type='income')

        if not income_flows:
            return {}

        df = pd.DataFrame(income_flows)
        df['date'] = pd.to_datetime(df['date'])

        # Group by category
        by_category = {}
        for category in df['category'].unique():
            cat_data = df[df['category'] == category]

            # Calculate statistics
            by_category[category] = {
                'total': cat_data['amount'].sum(),
                'count': len(cat_data),
                'average': cat_data['amount'].mean(),
                'median': cat_data['amount'].median(),
                'min': cat_data['amount'].min(),
                'max': cat_data['amount'].max(),
                'std_dev': cat_data['amount'].std(),
                'is_recurring': cat_data['recurring'].any(),
                'last_received': cat_data['date'].max().strftime('%Y-%m-%d'),
                'first_received': cat_data['date'].min().strftime('%Y-%m-%d')
            }

        return by_category

    def calculate_savings_rate(self, period_months: int = 3) -> Dict:
        """
        Calculate savings rate over a period.

        Savings Rate = (Income - Expenses) / Income * 100
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_months * 30)

        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')

        income_summary = self.get_income_summary(start_str, end_str)
        expense_summary = self.get_expense_summary(start_str, end_str)

        total_income = income_summary['total_income']
        total_expenses = expense_summary['total_expenses']

        savings = total_income - total_expenses
        savings_rate = (savings / total_income * 100) if total_income > 0 else 0

        return {
            'period_months': period_months,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'total_savings': savings,
            'savings_rate': savings_rate,
            'monthly_avg_savings': savings / period_months if period_months > 0 else 0
        }

    def get_quarterly_summary(self, year: int, quarter: int) -> Dict:
        """Get quarterly financial summary."""
        # Calculate quarter date range
        quarter_start_month = (quarter - 1) * 3 + 1
        start_date = datetime(year, quarter_start_month, 1)
        end_date = start_date + relativedelta(months=3) - timedelta(days=1)

        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')

        income_summary = self.get_income_summary(start_str, end_str)
        expense_summary = self.get_expense_summary(start_str, end_str)

        return {
            'year': year,
            'quarter': quarter,
            'start_date': start_str,
            'end_date': end_str,
            'income': income_summary,
            'expenses': expense_summary,
            'net_cash_flow': income_summary['total_income'] - expense_summary['total_expenses'],
            'savings_rate': ((income_summary['total_income'] - expense_summary['total_expenses'])
                           / income_summary['total_income'] * 100)
                          if income_summary['total_income'] > 0 else 0
        }

    def get_annual_summary(self, year: int) -> Dict:
        """Get annual financial summary."""
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"

        income_summary = self.get_income_summary(start_date, end_date)
        expense_summary = self.get_expense_summary(start_date, end_date)

        # Get quarterly breakdowns
        quarters = [self.get_quarterly_summary(year, q) for q in range(1, 5)]

        return {
            'year': year,
            'income': income_summary,
            'expenses': expense_summary,
            'net_cash_flow': income_summary['total_income'] - expense_summary['total_expenses'],
            'savings_rate': ((income_summary['total_income'] - expense_summary['total_expenses'])
                           / income_summary['total_income'] * 100)
                          if income_summary['total_income'] > 0 else 0,
            'quarters': quarters
        }
