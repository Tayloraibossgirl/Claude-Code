"""
Portfolio tracking and performance metrics module.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from scipy.optimize import newton


class PortfolioAnalyzer:
    """Analyzes portfolio performance and calculates metrics."""

    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db

    def get_portfolio_summary(self) -> Dict:
        """Get comprehensive portfolio summary."""
        accounts = self.db.get_accounts()
        all_holdings = self.db.get_holdings()

        total_cost_basis = 0
        total_current_value = 0
        holdings_by_account = {}

        for account in accounts:
            account_holdings = [h for h in all_holdings if h['account_id'] == account['id']]
            account_cost = sum(h['quantity'] * h['cost_basis'] for h in account_holdings)
            account_value = sum(
                h['quantity'] * (h['current_price'] or h['cost_basis'])
                for h in account_holdings
            )

            holdings_by_account[account['name']] = {
                'holdings': account_holdings,
                'cost_basis': account_cost,
                'current_value': account_value,
                'gain_loss': account_value - account_cost,
                'return_pct': ((account_value - account_cost) / account_cost * 100)
                              if account_cost > 0 else 0
            }

            total_cost_basis += account_cost
            total_current_value += account_value

        return {
            'total_cost_basis': total_cost_basis,
            'total_current_value': total_current_value,
            'total_gain_loss': total_current_value - total_cost_basis,
            'total_return_pct': ((total_current_value - total_cost_basis) / total_cost_basis * 100)
                               if total_cost_basis > 0 else 0,
            'accounts': holdings_by_account,
            'num_accounts': len(accounts),
            'num_holdings': len(all_holdings)
        }

    def calculate_allocation(self) -> Dict[str, float]:
        """Calculate asset allocation percentages."""
        holdings = self.db.get_holdings()

        allocation = {}
        total_value = 0

        for holding in holdings:
            value = holding['quantity'] * (holding['current_price'] or holding['cost_basis'])
            asset_type = holding['asset_type']

            if asset_type not in allocation:
                allocation[asset_type] = 0
            allocation[asset_type] += value
            total_value += value

        # Convert to percentages
        if total_value > 0:
            allocation = {k: (v / total_value * 100) for k, v in allocation.items()}

        return allocation

    def calculate_symbol_allocation(self) -> Dict[str, Dict]:
        """Calculate allocation by symbol."""
        holdings = self.db.get_holdings()

        symbol_data = {}
        total_value = 0

        for holding in holdings:
            value = holding['quantity'] * (holding['current_price'] or holding['cost_basis'])
            symbol = holding['symbol']

            if symbol not in symbol_data:
                symbol_data[symbol] = {
                    'value': 0,
                    'quantity': 0,
                    'asset_type': holding['asset_type']
                }

            symbol_data[symbol]['value'] += value
            symbol_data[symbol]['quantity'] += holding['quantity']
            total_value += value

        # Add percentages and sort by value
        for symbol in symbol_data:
            symbol_data[symbol]['allocation_pct'] = (
                symbol_data[symbol]['value'] / total_value * 100
            ) if total_value > 0 else 0

        # Sort by allocation percentage
        sorted_symbols = dict(
            sorted(symbol_data.items(), key=lambda x: x[1]['allocation_pct'], reverse=True)
        )

        return sorted_symbols

    def calculate_irr(self, account_id: Optional[int] = None) -> float:
        """
        Calculate Internal Rate of Return (IRR) for portfolio or specific account.

        IRR is the discount rate that makes NPV of all cash flows equal to zero.
        """
        # Get all transactions
        transactions = self.db.get_transactions(account_id=account_id)

        if not transactions:
            return 0.0

        # Build cash flow series
        cash_flows = []
        dates = []

        for txn in transactions:
            date = datetime.strptime(txn['transaction_date'], '%Y-%m-%d')
            amount = txn['amount']

            # Inflows are negative (money into portfolio), outflows are positive
            if txn['transaction_type'] in ['buy', 'deposit', 'contribution']:
                amount = -abs(amount)
            elif txn['transaction_type'] in ['sell', 'withdrawal', 'distribution']:
                amount = abs(amount)

            cash_flows.append(amount)
            dates.append(date)

        # Add current portfolio value as final cash flow
        if account_id:
            holdings = self.db.get_holdings(account_id=account_id)
        else:
            holdings = self.db.get_holdings()

        current_value = sum(
            h['quantity'] * (h['current_price'] or h['cost_basis'])
            for h in holdings
        )

        cash_flows.append(current_value)
        dates.append(datetime.now())

        # Calculate IRR using numpy's IRR calculation
        try:
            # Convert to daily returns
            days = [(d - dates[0]).days for d in dates]

            # Use Newton's method to find IRR
            def npv(rate, cash_flows, days):
                return sum(cf / ((1 + rate) ** (day / 365.0))
                          for cf, day in zip(cash_flows, days))

            # Find the rate where NPV = 0
            irr = newton(lambda r: npv(r, cash_flows, days), 0.1)
            return irr * 100  # Convert to percentage

        except (RuntimeError, ValueError):
            # If calculation fails, return simple return
            total_invested = sum(cf for cf in cash_flows[:-1] if cf < 0)
            if total_invested == 0:
                return 0.0
            return (current_value / abs(total_invested) - 1) * 100

    def calculate_unrealized_gains(self) -> Dict:
        """Calculate unrealized gains/losses with tax lot detail."""
        holdings = self.db.get_holdings()

        gains_data = {
            'short_term': [],  # < 1 year
            'long_term': [],   # >= 1 year
            'total_unrealized': 0
        }

        current_date = datetime.now()

        for holding in holdings:
            purchase_date = datetime.strptime(holding['purchase_date'], '%Y-%m-%d')
            holding_period = (current_date - purchase_date).days

            current_price = holding['current_price'] or holding['cost_basis']
            cost_basis = holding['cost_basis']
            quantity = holding['quantity']

            gain_loss = (current_price - cost_basis) * quantity
            gain_loss_pct = ((current_price - cost_basis) / cost_basis * 100) if cost_basis > 0 else 0

            lot_data = {
                'symbol': holding['symbol'],
                'quantity': quantity,
                'purchase_date': holding['purchase_date'],
                'holding_period_days': holding_period,
                'cost_basis': cost_basis,
                'current_price': current_price,
                'gain_loss': gain_loss,
                'gain_loss_pct': gain_loss_pct
            }

            if holding_period < 365:
                gains_data['short_term'].append(lot_data)
            else:
                gains_data['long_term'].append(lot_data)

            gains_data['total_unrealized'] += gain_loss

        # Calculate totals
        gains_data['short_term_total'] = sum(lot['gain_loss'] for lot in gains_data['short_term'])
        gains_data['long_term_total'] = sum(lot['gain_loss'] for lot in gains_data['long_term'])

        return gains_data

    def find_tax_loss_harvesting_opportunities(self, threshold: float = -3.0) -> List[Dict]:
        """
        Identify holdings with unrealized losses suitable for tax-loss harvesting.

        Args:
            threshold: Minimum loss percentage to consider (default -3%)
        """
        holdings = self.db.get_holdings()
        opportunities = []

        for holding in holdings:
            current_price = holding['current_price'] or holding['cost_basis']
            cost_basis = holding['cost_basis']

            if cost_basis == 0:
                continue

            loss_pct = ((current_price - cost_basis) / cost_basis * 100)

            if loss_pct < threshold:
                loss_amount = (current_price - cost_basis) * holding['quantity']

                opportunities.append({
                    'symbol': holding['symbol'],
                    'quantity': holding['quantity'],
                    'purchase_date': holding['purchase_date'],
                    'cost_basis': cost_basis,
                    'current_price': current_price,
                    'loss_amount': loss_amount,
                    'loss_pct': loss_pct,
                    'account_id': holding['account_id']
                })

        # Sort by loss amount (largest losses first)
        opportunities.sort(key=lambda x: x['loss_amount'])

        return opportunities

    def check_rebalancing_needs(self, target_allocation: Dict[str, float],
                                threshold: float = 5.0) -> Dict:
        """
        Check if portfolio needs rebalancing based on target allocation.

        Args:
            target_allocation: Dict of asset_type -> target percentage
            threshold: Percentage drift threshold to trigger rebalancing
        """
        current_allocation = self.calculate_allocation()

        rebalancing_needed = False
        adjustments = {}

        for asset_type, target_pct in target_allocation.items():
            current_pct = current_allocation.get(asset_type, 0)
            drift = current_pct - target_pct

            if abs(drift) > threshold:
                rebalancing_needed = True
                adjustments[asset_type] = {
                    'current': current_pct,
                    'target': target_pct,
                    'drift': drift,
                    'action': 'reduce' if drift > 0 else 'increase'
                }

        return {
            'rebalancing_needed': rebalancing_needed,
            'adjustments': adjustments,
            'current_allocation': current_allocation,
            'target_allocation': target_allocation
        }

    def get_top_movers(self, limit: int = 5) -> Dict[str, List[Dict]]:
        """Get top gainers and losers in portfolio."""
        holdings = self.db.get_holdings()

        movers = []
        for holding in holdings:
            current_price = holding['current_price']
            if not current_price:
                continue

            cost_basis = holding['cost_basis']
            if cost_basis == 0:
                continue

            change_pct = ((current_price - cost_basis) / cost_basis * 100)
            value = current_price * holding['quantity']

            movers.append({
                'symbol': holding['symbol'],
                'change_pct': change_pct,
                'current_price': current_price,
                'cost_basis': cost_basis,
                'value': value,
                'quantity': holding['quantity']
            })

        # Sort by change percentage
        movers.sort(key=lambda x: x['change_pct'], reverse=True)

        return {
            'top_gainers': movers[:limit],
            'top_losers': list(reversed(movers[-limit:]))
        }

    def calculate_holding_period_returns(self) -> pd.DataFrame:
        """Calculate returns for different holding periods."""
        holdings = self.db.get_holdings()

        if not holdings:
            return pd.DataFrame()

        data = []
        current_date = datetime.now()

        for holding in holdings:
            purchase_date = datetime.strptime(holding['purchase_date'], '%Y-%m-%d')
            days_held = (current_date - purchase_date).days

            current_price = holding['current_price'] or holding['cost_basis']
            cost_basis = holding['cost_basis']

            if cost_basis == 0:
                continue

            total_return = ((current_price - cost_basis) / cost_basis * 100)
            annualized_return = (total_return / days_held * 365) if days_held > 0 else 0

            data.append({
                'symbol': holding['symbol'],
                'purchase_date': holding['purchase_date'],
                'days_held': days_held,
                'total_return': total_return,
                'annualized_return': annualized_return,
                'value': current_price * holding['quantity']
            })

        return pd.DataFrame(data)
