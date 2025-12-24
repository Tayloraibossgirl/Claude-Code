"""
Tax optimization and planning module.
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
import pandas as pd


class TaxOptimizer:
    """Tax optimization, planning, and estimation."""

    # 2024 Federal Tax Brackets (Single)
    TAX_BRACKETS_SINGLE = [
        (11600, 0.10),
        (47150, 0.12),
        (100525, 0.22),
        (191950, 0.24),
        (243725, 0.32),
        (609350, 0.35),
        (float('inf'), 0.37)
    ]

    # 2024 Federal Tax Brackets (Married Filing Jointly)
    TAX_BRACKETS_MARRIED = [
        (23200, 0.10),
        (94300, 0.12),
        (201050, 0.22),
        (383900, 0.24),
        (487450, 0.32),
        (731200, 0.35),
        (float('inf'), 0.37)
    ]

    # Standard deduction
    STANDARD_DEDUCTION_SINGLE = 14600
    STANDARD_DEDUCTION_MARRIED = 29200

    # Long-term capital gains brackets (Single)
    LTCG_BRACKETS_SINGLE = [
        (47025, 0.0),
        (518900, 0.15),
        (float('inf'), 0.20)
    ]

    # Long-term capital gains brackets (Married)
    LTCG_BRACKETS_MARRIED = [
        (94050, 0.0),
        (583750, 0.15),
        (float('inf'), 0.20)
    ]

    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db

    def calculate_federal_income_tax(
        self,
        taxable_income: float,
        filing_status: str = 'single'
    ) -> Dict:
        """Calculate federal income tax."""
        brackets = (self.TAX_BRACKETS_MARRIED if filing_status == 'married'
                   else self.TAX_BRACKETS_SINGLE)

        tax = 0
        previous_bracket_max = 0
        breakdown = []

        for bracket_max, rate in brackets:
            if taxable_income <= previous_bracket_max:
                break

            taxable_in_bracket = min(taxable_income, bracket_max) - previous_bracket_max
            tax_in_bracket = taxable_in_bracket * rate

            breakdown.append({
                'bracket': f"${previous_bracket_max:,.0f} - ${bracket_max:,.0f}" if bracket_max != float('inf')
                          else f"${previous_bracket_max:,.0f}+",
                'rate': rate,
                'taxable_income': taxable_in_bracket,
                'tax': tax_in_bracket
            })

            tax += tax_in_bracket
            previous_bracket_max = bracket_max

        effective_rate = (tax / taxable_income * 100) if taxable_income > 0 else 0

        return {
            'taxable_income': taxable_income,
            'total_tax': tax,
            'effective_rate': effective_rate,
            'breakdown': breakdown
        }

    def calculate_capital_gains_tax(
        self,
        gains: float,
        ordinary_income: float,
        filing_status: str = 'single',
        holding_period: str = 'long'
    ) -> Dict:
        """Calculate capital gains tax."""
        if holding_period == 'short':
            # Short-term gains taxed as ordinary income
            total_income = ordinary_income + gains
            tax_with_gains = self.calculate_federal_income_tax(total_income, filing_status)
            tax_without_gains = self.calculate_federal_income_tax(ordinary_income, filing_status)

            return {
                'gains': gains,
                'holding_period': 'short-term',
                'tax_on_gains': tax_with_gains['total_tax'] - tax_without_gains['total_tax'],
                'effective_rate': ((tax_with_gains['total_tax'] - tax_without_gains['total_tax'])
                                  / gains * 100) if gains > 0 else 0
            }

        else:
            # Long-term capital gains
            brackets = (self.LTCG_BRACKETS_MARRIED if filing_status == 'married'
                       else self.LTCG_BRACKETS_SINGLE)

            # LTCG brackets are based on total income
            total_income = ordinary_income + gains

            tax = 0
            previous_bracket_max = 0
            breakdown = []

            for bracket_max, rate in brackets:
                if total_income <= previous_bracket_max:
                    break

                # Calculate how much of this bracket applies to capital gains
                bracket_start = max(previous_bracket_max, ordinary_income)
                bracket_end = min(total_income, bracket_max)

                if bracket_end > bracket_start:
                    gains_in_bracket = bracket_end - bracket_start
                    tax_in_bracket = gains_in_bracket * rate

                    breakdown.append({
                        'bracket': f"${previous_bracket_max:,.0f} - ${bracket_max:,.0f}"
                                  if bracket_max != float('inf') else f"${previous_bracket_max:,.0f}+",
                        'rate': rate,
                        'gains': gains_in_bracket,
                        'tax': tax_in_bracket
                    })

                    tax += tax_in_bracket

                previous_bracket_max = bracket_max

            return {
                'gains': gains,
                'holding_period': 'long-term',
                'tax_on_gains': tax,
                'effective_rate': (tax / gains * 100) if gains > 0 else 0,
                'breakdown': breakdown
            }

    def estimate_annual_tax_liability(
        self,
        annual_income: float,
        filing_status: str = 'single',
        deductions: float = None,
        credits: float = 0,
        state_tax_rate: float = 0.0
    ) -> Dict:
        """Estimate total annual tax liability."""
        # Standard deduction if none provided
        if deductions is None:
            deductions = (self.STANDARD_DEDUCTION_MARRIED if filing_status == 'married'
                         else self.STANDARD_DEDUCTION_SINGLE)

        # Calculate taxable income
        taxable_income = max(0, annual_income - deductions)

        # Federal income tax
        federal_tax = self.calculate_federal_income_tax(taxable_income, filing_status)

        # State tax (simplified flat rate)
        state_tax = taxable_income * state_tax_rate

        # Social Security and Medicare (assume self-employed)
        ss_wage_base = 168600  # 2024 limit
        social_security_tax = min(annual_income, ss_wage_base) * 0.124  # 12.4% (self-employed)
        medicare_tax = annual_income * 0.029  # 2.9% (self-employed)
        additional_medicare = max(0, annual_income - 200000) * 0.009  # 0.9% additional

        total_payroll_tax = social_security_tax + medicare_tax + additional_medicare

        # Total tax
        total_tax = federal_tax['total_tax'] + state_tax + total_payroll_tax - credits

        # Quarterly estimates
        quarterly_payment = total_tax / 4

        return {
            'annual_income': annual_income,
            'deductions': deductions,
            'taxable_income': taxable_income,
            'federal_income_tax': federal_tax['total_tax'],
            'state_tax': state_tax,
            'social_security_tax': social_security_tax,
            'medicare_tax': medicare_tax + additional_medicare,
            'total_payroll_tax': total_payroll_tax,
            'credits': credits,
            'total_tax_liability': total_tax,
            'effective_tax_rate': (total_tax / annual_income * 100) if annual_income > 0 else 0,
            'quarterly_estimate': quarterly_payment,
            'federal_breakdown': federal_tax['breakdown']
        }

    def identify_tax_loss_harvesting_opportunities(
        self,
        min_loss_threshold: float = -1000,
        min_tax_benefit: float = 200
    ) -> List[Dict]:
        """
        Identify tax-loss harvesting opportunities.

        Args:
            min_loss_threshold: Minimum loss amount to consider
            min_tax_benefit: Minimum tax benefit to recommend
        """
        from financial_analyst.modules.portfolio import PortfolioAnalyzer

        portfolio = PortfolioAnalyzer(self.db)
        opportunities = portfolio.find_tax_loss_harvesting_opportunities()

        # Filter and add tax benefit calculation
        filtered_opportunities = []

        for opp in opportunities:
            loss_amount = abs(opp['loss_amount'])

            if loss_amount >= abs(min_loss_threshold):
                # Calculate tax benefit (simplified - assumes 22% federal + 15% LTCG rate)
                # Actual benefit depends on whether offsetting gains or ordinary income
                estimated_benefit = loss_amount * 0.22  # Conservative estimate

                if estimated_benefit >= min_tax_benefit:
                    opp['estimated_tax_benefit'] = estimated_benefit
                    opp['recommendation'] = (
                        f"Harvest ${loss_amount:,.2f} loss for ~${estimated_benefit:,.2f} tax benefit"
                    )
                    filtered_opportunities.append(opp)

        return filtered_opportunities

    def calculate_quarterly_estimated_taxes(
        self,
        year: int,
        estimated_annual_income: float,
        filing_status: str = 'single'
    ) -> Dict:
        """Calculate quarterly estimated tax payments."""
        tax_liability = self.estimate_annual_tax_liability(
            annual_income=estimated_annual_income,
            filing_status=filing_status
        )

        # Get actual payments made this year
        tax_records = self.db.get_tax_records(tax_year=year)
        payments_made = sum(
            record['amount'] for record in tax_records
            if record.get('income_type') == 'tax_payment'
        )

        remaining_liability = max(0, tax_liability['total_tax_liability'] - payments_made)
        quarterly_amount = tax_liability['quarterly_estimate']

        # Quarterly due dates
        current_date = datetime.now()
        quarters = [
            {'quarter': 1, 'due_date': f'{year}-04-15'},
            {'quarter': 2, 'due_date': f'{year}-06-15'},
            {'quarter': 3, 'due_date': f'{year}-09-15'},
            {'quarter': 4, 'due_date': f'{year + 1}-01-15'}
        ]

        # Determine next payment
        next_payment = None
        for q in quarters:
            due_date = datetime.strptime(q['due_date'], '%Y-%m-%d')
            if due_date > current_date:
                next_payment = q
                break

        return {
            'year': year,
            'estimated_annual_income': estimated_annual_income,
            'total_estimated_tax': tax_liability['total_tax_liability'],
            'quarterly_payment': quarterly_amount,
            'payments_made': payments_made,
            'remaining_liability': remaining_liability,
            'quarters': quarters,
            'next_payment_due': next_payment,
            'tax_breakdown': tax_liability
        }

    def compare_tax_scenarios(
        self,
        scenarios: List[Dict],
        filing_status: str = 'single'
    ) -> Dict:
        """
        Compare multiple tax scenarios.

        Args:
            scenarios: List of dicts with 'name', 'income', optional 'deductions'
            filing_status: Tax filing status
        """
        results = []

        for scenario in scenarios:
            name = scenario['name']
            income = scenario['income']
            deductions = scenario.get('deductions')

            tax_calc = self.estimate_annual_tax_liability(
                annual_income=income,
                filing_status=filing_status,
                deductions=deductions
            )

            results.append({
                'scenario_name': name,
                'income': income,
                'deductions': deductions or tax_calc['deductions'],
                'total_tax': tax_calc['total_tax_liability'],
                'effective_rate': tax_calc['effective_tax_rate'],
                'after_tax_income': income - tax_calc['total_tax_liability']
            })

        # Add comparisons to baseline (first scenario)
        if len(results) > 1:
            baseline = results[0]
            for result in results[1:]:
                result['vs_baseline'] = {
                    'income_diff': result['income'] - baseline['income'],
                    'tax_diff': result['total_tax'] - baseline['total_tax'],
                    'after_tax_diff': result['after_tax_income'] - baseline['after_tax_income']
                }

        return {
            'scenarios': results,
            'best_after_tax': max(results, key=lambda x: x['after_tax_income'])
        }

    def optimize_retirement_contributions(
        self,
        gross_income: float,
        desired_tax_bracket: float = 0.22,
        filing_status: str = 'single'
    ) -> Dict:
        """
        Calculate optimal retirement contributions to reach target tax bracket.

        Args:
            gross_income: Gross annual income
            desired_tax_bracket: Target marginal tax bracket
            filing_status: Tax filing status
        """
        # Binary search for optimal contribution
        low, high = 0, min(gross_income, 69000)  # 2024 401k limit for 50+
        optimal_contribution = 0

        while high - low > 100:
            mid = (low + high) / 2
            taxable_income = gross_income - mid - self.STANDARD_DEDUCTION_SINGLE

            tax_calc = self.calculate_federal_income_tax(taxable_income, filing_status)

            # Find marginal rate
            brackets = (self.TAX_BRACKETS_MARRIED if filing_status == 'married'
                       else self.TAX_BRACKETS_SINGLE)

            marginal_rate = 0
            for bracket_max, rate in brackets:
                if taxable_income <= bracket_max:
                    marginal_rate = rate
                    break

            if marginal_rate > desired_tax_bracket:
                low = mid
            else:
                high = mid
                optimal_contribution = mid

        # Calculate tax savings
        tax_without_contribution = self.estimate_annual_tax_liability(gross_income, filing_status)
        tax_with_contribution = self.estimate_annual_tax_liability(
            gross_income - optimal_contribution,
            filing_status
        )

        tax_savings = tax_without_contribution['total_tax_liability'] - tax_with_contribution['total_tax_liability']

        return {
            'gross_income': gross_income,
            'optimal_contribution': optimal_contribution,
            'target_bracket': desired_tax_bracket,
            'achieved_bracket': tax_with_contribution['effective_tax_rate'] / 100,
            'tax_savings': tax_savings,
            'effective_cost': optimal_contribution - tax_savings,
            'without_contribution': tax_without_contribution,
            'with_contribution': tax_with_contribution
        }

    def track_cost_basis(self, symbol: str) -> List[Dict]:
        """Get detailed cost basis tracking for a symbol."""
        holdings = [h for h in self.db.get_holdings() if h['symbol'] == symbol]

        lots = []
        for holding in holdings:
            purchase_date = datetime.strptime(holding['purchase_date'], '%Y-%m-%d')
            holding_period_days = (datetime.now() - purchase_date).days
            holding_period_type = 'long-term' if holding_period_days >= 365 else 'short-term'

            current_price = holding['current_price'] or holding['cost_basis']
            gain_loss = (current_price - holding['cost_basis']) * holding['quantity']

            lots.append({
                'purchase_date': holding['purchase_date'],
                'quantity': holding['quantity'],
                'cost_basis': holding['cost_basis'],
                'current_price': current_price,
                'holding_period_days': holding_period_days,
                'holding_period_type': holding_period_type,
                'unrealized_gain_loss': gain_loss,
                'account_id': holding['account_id']
            })

        return sorted(lots, key=lambda x: x['purchase_date'])
