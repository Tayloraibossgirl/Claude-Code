"""
Scenario modeling and Monte Carlo simulation module.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dateutil.relativedelta import relativedelta


class ScenarioModeler:
    """Model financial scenarios and run Monte Carlo simulations."""

    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db

    def run_what_if_scenario(self, scenario_name: str, parameters: Dict) -> Dict:
        """
        Run a "what if" scenario analysis.

        Parameters can include:
        - income_change: Change in annual income
        - expense_change: One-time expense
        - recurring_expense_change: Change in monthly expenses
        - portfolio_return: Expected portfolio return
        - time_horizon_months: How many months to project
        """
        # Get baseline data
        from financial_analyst.modules.cashflow import CashFlowAnalyzer
        from financial_analyst.modules.portfolio import PortfolioAnalyzer

        cashflow = CashFlowAnalyzer(self.db)
        portfolio = PortfolioAnalyzer(self.db)

        baseline_runway = cashflow.calculate_runway()

        # Apply scenario parameters
        scenario_params = {
            'income_change': parameters.get('income_change', 0) / 12,  # Convert annual to monthly
            'expense_change': parameters.get('expense_change', 0),
            'recurring_expense_change': parameters.get('recurring_expense_change', 0)
        }

        # Project cash flow with scenario
        time_horizon = parameters.get('time_horizon_months', 24)
        projection = cashflow.project_cash_flow(
            months=time_horizon,
            scenarios=scenario_params
        )

        # Calculate scenario runway
        liquid_assets = baseline_runway['liquid_assets']
        one_time_expense = parameters.get('expense_change', 0)
        adjusted_assets = liquid_assets - one_time_expense

        monthly_burn = baseline_runway['monthly_burn_rate'] + scenario_params['recurring_expense_change']
        monthly_income = baseline_runway['monthly_income'] + scenario_params['income_change']

        scenario_runway = cashflow.calculate_runway(
            liquid_assets=adjusted_assets,
            monthly_burn=monthly_burn,
            monthly_income=monthly_income
        )

        # Calculate impact
        impact = {
            'runway_change_months': scenario_runway['runway_months'] - baseline_runway['runway_months'],
            'net_burn_change': scenario_runway['net_burn_rate'] - baseline_runway['net_burn_rate'],
            'final_balance': projection.iloc[-1]['balance'] if len(projection) > 0 else 0
        }

        result = {
            'scenario_name': scenario_name,
            'parameters': parameters,
            'baseline': baseline_runway,
            'scenario': scenario_runway,
            'impact': impact,
            'projection': projection.to_dict('records')
        }

        # Save scenario
        self.db.save_scenario(scenario_name, 'what_if', parameters, result)

        return result

    def monte_carlo_portfolio_simulation(
        self,
        years: int = 10,
        simulations: int = 1000,
        expected_return: float = 0.07,
        volatility: float = 0.15,
        annual_contribution: float = 0
    ) -> Dict:
        """
        Run Monte Carlo simulation for portfolio growth.

        Args:
            years: Number of years to simulate
            simulations: Number of simulation runs
            expected_return: Expected annual return (e.g., 0.07 for 7%)
            volatility: Annual volatility/standard deviation (e.g., 0.15 for 15%)
            annual_contribution: Annual contribution to portfolio
        """
        from financial_analyst.modules.portfolio import PortfolioAnalyzer

        portfolio = PortfolioAnalyzer(self.db)
        summary = portfolio.get_portfolio_summary()
        initial_value = summary['total_current_value']

        # Run simulations
        results = np.zeros((simulations, years + 1))
        results[:, 0] = initial_value

        for sim in range(simulations):
            for year in range(1, years + 1):
                # Generate random return based on normal distribution
                annual_return = np.random.normal(expected_return, volatility)

                # Calculate new value
                previous_value = results[sim, year - 1]
                new_value = previous_value * (1 + annual_return) + annual_contribution

                results[sim, year] = max(0, new_value)  # Can't go below 0

        # Calculate statistics
        percentiles = {
            '10th': np.percentile(results[:, -1], 10),
            '25th': np.percentile(results[:, -1], 25),
            '50th': np.percentile(results[:, -1], 50),
            '75th': np.percentile(results[:, -1], 75),
            '90th': np.percentile(results[:, -1], 90)
        }

        # Calculate probability of success (ending above initial value)
        success_count = np.sum(results[:, -1] > initial_value)
        success_probability = success_count / simulations * 100

        # Year-by-year statistics
        yearly_stats = []
        for year in range(years + 1):
            yearly_stats.append({
                'year': year,
                'mean': np.mean(results[:, year]),
                'median': np.median(results[:, year]),
                'std': np.std(results[:, year]),
                'min': np.min(results[:, year]),
                'max': np.max(results[:, year]),
                'percentile_10': np.percentile(results[:, year], 10),
                'percentile_90': np.percentile(results[:, year], 90)
            })

        return {
            'initial_value': initial_value,
            'years': years,
            'simulations': simulations,
            'expected_return': expected_return,
            'volatility': volatility,
            'annual_contribution': annual_contribution,
            'final_percentiles': percentiles,
            'success_probability': success_probability,
            'expected_final_value': np.mean(results[:, -1]),
            'yearly_statistics': yearly_stats,
            'all_simulations': results.tolist()  # For plotting
        }

    def monte_carlo_retirement_simulation(
        self,
        current_age: int,
        retirement_age: int,
        life_expectancy: int,
        annual_contribution: float,
        annual_withdrawal: float,
        expected_return: float = 0.07,
        volatility: float = 0.15,
        simulations: int = 1000
    ) -> Dict:
        """
        Run Monte Carlo simulation for retirement planning.

        Args:
            current_age: Current age
            retirement_age: Planned retirement age
            life_expectancy: Expected life expectancy
            annual_contribution: Annual contribution until retirement
            annual_withdrawal: Annual withdrawal after retirement
            expected_return: Expected annual return
            volatility: Annual volatility
            simulations: Number of simulation runs
        """
        from financial_analyst.modules.portfolio import PortfolioAnalyzer

        portfolio = PortfolioAnalyzer(self.db)
        summary = portfolio.get_portfolio_summary()
        initial_value = summary['total_current_value']

        years_to_retirement = retirement_age - current_age
        years_in_retirement = life_expectancy - retirement_age
        total_years = years_to_retirement + years_in_retirement

        # Run simulations
        results = np.zeros((simulations, total_years + 1))
        results[:, 0] = initial_value

        success_count = 0

        for sim in range(simulations):
            for year in range(1, total_years + 1):
                # Generate random return
                annual_return = np.random.normal(expected_return, volatility)

                previous_value = results[sim, year - 1]

                # Apply contribution or withdrawal
                if year <= years_to_retirement:
                    cash_flow = annual_contribution
                else:
                    cash_flow = -annual_withdrawal

                new_value = previous_value * (1 + annual_return) + cash_flow
                results[sim, year] = max(0, new_value)

            # Check if this simulation was successful (money left at end)
            if results[sim, -1] > 0:
                success_count += 1

        success_probability = success_count / simulations * 100

        # Calculate statistics
        final_values = results[:, -1]
        percentiles = {
            '10th': np.percentile(final_values, 10),
            '25th': np.percentile(final_values, 25),
            '50th': np.percentile(final_values, 50),
            '75th': np.percentile(final_values, 75),
            '90th': np.percentile(final_values, 90)
        }

        return {
            'current_age': current_age,
            'retirement_age': retirement_age,
            'life_expectancy': life_expectancy,
            'years_to_retirement': years_to_retirement,
            'years_in_retirement': years_in_retirement,
            'initial_value': initial_value,
            'annual_contribution': annual_contribution,
            'annual_withdrawal': annual_withdrawal,
            'success_probability': success_probability,
            'final_percentiles': percentiles,
            'expected_final_value': np.mean(final_values),
            'probability_depleted': 100 - success_probability,
            'all_simulations': results.tolist()
        }

    def job_change_scenario(
        self,
        new_salary: float,
        severance: float = 0,
        gap_months: int = 0,
        relocation_cost: float = 0,
        new_recurring_expenses: float = 0
    ) -> Dict:
        """
        Model a job change scenario.

        Args:
            new_salary: New annual salary
            severance: Severance package amount
            gap_months: Months between jobs
            relocation_cost: One-time relocation costs
            new_recurring_expenses: Change in monthly expenses
        """
        from financial_analyst.modules.cashflow import CashFlowAnalyzer

        cashflow = CashFlowAnalyzer(self.db)

        # Get current situation
        baseline_runway = cashflow.calculate_runway()
        current_income = baseline_runway['monthly_income'] * 12

        # Calculate impact
        income_change = new_salary - current_income
        monthly_income_change = income_change / 12

        # During gap period
        gap_impact = gap_months * baseline_runway['monthly_burn_rate']

        # Total one-time costs
        one_time_costs = relocation_cost + gap_impact - severance

        # Run what-if scenario
        scenario_params = {
            'income_change': income_change,
            'expense_change': one_time_costs,
            'recurring_expense_change': new_recurring_expenses,
            'time_horizon_months': 24
        }

        result = self.run_what_if_scenario(
            scenario_name=f"Job Change: ${new_salary:,.0f} salary",
            parameters=scenario_params
        )

        # Add job-specific details
        result['job_change_details'] = {
            'current_salary': current_income,
            'new_salary': new_salary,
            'salary_change': income_change,
            'severance': severance,
            'gap_months': gap_months,
            'gap_cost': gap_impact,
            'relocation_cost': relocation_cost,
            'total_one_time_cost': one_time_costs,
            'monthly_expense_change': new_recurring_expenses,
            'break_even_months': one_time_costs / monthly_income_change
                                 if monthly_income_change > 0 else float('inf')
        }

        return result

    def large_purchase_scenario(
        self,
        purchase_amount: float,
        purchase_name: str,
        financing: Optional[Dict] = None
    ) -> Dict:
        """
        Model a large purchase scenario.

        Args:
            purchase_amount: Total purchase amount
            purchase_name: Description of purchase
            financing: Optional dict with 'down_payment', 'loan_amount', 'interest_rate', 'term_months'
        """
        from financial_analyst.modules.cashflow import CashFlowAnalyzer

        cashflow = CashFlowAnalyzer(self.db)

        if financing:
            # Calculate loan payment
            down_payment = financing.get('down_payment', 0)
            loan_amount = financing.get('loan_amount', purchase_amount - down_payment)
            annual_rate = financing.get('interest_rate', 0.05)
            term_months = financing.get('term_months', 60)

            monthly_rate = annual_rate / 12
            monthly_payment = loan_amount * (
                monthly_rate * (1 + monthly_rate) ** term_months
            ) / ((1 + monthly_rate) ** term_months - 1) if monthly_rate > 0 else loan_amount / term_months

            one_time_cost = down_payment
            recurring_cost = monthly_payment
        else:
            one_time_cost = purchase_amount
            recurring_cost = 0

        scenario_params = {
            'expense_change': one_time_cost,
            'recurring_expense_change': recurring_cost,
            'time_horizon_months': financing.get('term_months', 24) if financing else 24
        }

        result = self.run_what_if_scenario(
            scenario_name=f"Purchase: {purchase_name}",
            parameters=scenario_params
        )

        # Add purchase details
        result['purchase_details'] = {
            'purchase_amount': purchase_amount,
            'purchase_name': purchase_name,
            'financed': financing is not None,
            'down_payment': financing.get('down_payment', 0) if financing else 0,
            'loan_amount': financing.get('loan_amount', 0) if financing else 0,
            'monthly_payment': recurring_cost,
            'total_financed_cost': recurring_cost * financing.get('term_months', 0) + one_time_cost
                                  if financing else purchase_amount
        }

        return result

    def tax_entity_comparison(
        self,
        annual_income: float,
        business_expenses: float = 0,
        self_employment_tax_rate: float = 0.153,
        s_corp_reasonable_salary_pct: float = 0.6
    ) -> Dict:
        """
        Compare tax implications of different business entities.

        Args:
            annual_income: Annual business income
            business_expenses: Deductible business expenses
            self_employment_tax_rate: Self-employment tax rate (default 15.3%)
            s_corp_reasonable_salary_pct: Percentage of income as salary for S-Corp
        """
        net_income = annual_income - business_expenses

        # Sole Proprietor / Single-member LLC
        sole_prop = {
            'entity_type': 'Sole Proprietor',
            'gross_income': annual_income,
            'business_expenses': business_expenses,
            'net_income': net_income,
            'self_employment_tax': net_income * self_employment_tax_rate,
            'se_tax_deduction': net_income * self_employment_tax_rate * 0.5,
            'taxable_income': net_income - (net_income * self_employment_tax_rate * 0.5)
        }

        # S-Corporation
        s_corp_salary = net_income * s_corp_reasonable_salary_pct
        s_corp_distribution = net_income - s_corp_salary

        s_corp = {
            'entity_type': 'S-Corporation',
            'gross_income': annual_income,
            'business_expenses': business_expenses,
            'net_income': net_income,
            'salary': s_corp_salary,
            'distribution': s_corp_distribution,
            'payroll_tax': s_corp_salary * self_employment_tax_rate,
            'taxable_income': net_income,
            'estimated_savings': sole_prop['self_employment_tax'] - (s_corp_salary * self_employment_tax_rate)
        }

        return {
            'annual_income': annual_income,
            'business_expenses': business_expenses,
            'sole_proprietor': sole_prop,
            's_corporation': s_corp,
            'comparison': {
                'se_tax_savings': s_corp['estimated_savings'],
                'recommendation': 'S-Corp' if s_corp['estimated_savings'] > 3000 else 'Sole Prop'
            }
        }

    def get_saved_scenarios(self) -> List[Dict]:
        """Get all saved scenarios."""
        scenarios = self.db.get_scenarios()

        for scenario in scenarios:
            if scenario.get('parameters'):
                import json
                scenario['parameters'] = json.loads(scenario['parameters'])
            if scenario.get('results'):
                import json
                scenario['results'] = json.loads(scenario['results'])

        return scenarios
