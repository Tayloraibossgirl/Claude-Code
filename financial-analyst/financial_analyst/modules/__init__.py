"""
Financial analysis modules.
"""

from financial_analyst.modules.portfolio import PortfolioAnalyzer
from financial_analyst.modules.cashflow import CashFlowAnalyzer
from financial_analyst.modules.scenarios import ScenarioModeler
from financial_analyst.modules.research import InvestmentResearcher
from financial_analyst.modules.tax import TaxOptimizer

__all__ = [
    'PortfolioAnalyzer',
    'CashFlowAnalyzer',
    'ScenarioModeler',
    'InvestmentResearcher',
    'TaxOptimizer'
]
