"""
Data import utilities for CSV and JSON files.
"""

import pandas as pd
import json
from pathlib import Path
from typing import Dict, List
from datetime import datetime


class DataImporter:
    """Import financial data from CSV and JSON files."""

    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db

    def import_portfolio_csv(self, file_path: str) -> Dict:
        """
        Import portfolio holdings from CSV.

        Expected columns:
        account, symbol, asset_type, quantity, cost_basis, purchase_date, current_price (optional)
        """
        try:
            df = pd.read_csv(file_path)

            required_columns = ['account', 'symbol', 'asset_type', 'quantity', 'cost_basis', 'purchase_date']
            if not all(col in df.columns for col in required_columns):
                return {
                    'error': f'Missing required columns. Required: {required_columns}'
                }

            imported = 0
            errors = []

            for _, row in df.iterrows():
                try:
                    # Get or create account
                    account = self.db.get_account_by_name(row['account'])
                    if not account:
                        account_id = self.db.add_account(
                            name=row['account'],
                            account_type=row.get('account_type', 'brokerage')
                        )
                    else:
                        account_id = account['id']

                    # Add holding
                    self.db.add_holding(
                        account_id=account_id,
                        symbol=row['symbol'],
                        asset_type=row['asset_type'],
                        quantity=float(row['quantity']),
                        cost_basis=float(row['cost_basis']),
                        purchase_date=row['purchase_date'],
                        current_price=float(row['current_price']) if 'current_price' in row and pd.notna(row['current_price']) else None
                    )
                    imported += 1

                except Exception as e:
                    errors.append(f"Row {_}: {str(e)}")

            return {
                'imported': imported,
                'errors': errors,
                'total_rows': len(df)
            }

        except Exception as e:
            return {'error': str(e)}

    def import_transactions_csv(self, file_path: str) -> Dict:
        """
        Import transactions from CSV.

        Expected columns:
        date, type, amount, category (optional), description (optional)
        """
        try:
            df = pd.read_csv(file_path)

            required_columns = ['date', 'type', 'amount']
            if not all(col in df.columns for col in required_columns):
                return {
                    'error': f'Missing required columns. Required: {required_columns}'
                }

            imported = 0
            errors = []

            for _, row in df.iterrows():
                try:
                    self.db.add_transaction(
                        transaction_date=row['date'],
                        transaction_type=row['type'],
                        amount=float(row['amount']),
                        category=row.get('category'),
                        description=row.get('description')
                    )
                    imported += 1

                except Exception as e:
                    errors.append(f"Row {_}: {str(e)}")

            return {
                'imported': imported,
                'errors': errors,
                'total_rows': len(df)
            }

        except Exception as e:
            return {'error': str(e)}

    def import_cashflow_json(self, file_path: str) -> Dict:
        """
        Import cash flow data from JSON.

        Expected format:
        {
            "income": [
                {"date": "2024-01-15", "category": "salary", "amount": 16667, "recurring": true, "frequency": "monthly"}
            ],
            "expenses": [
                {"date": "2024-01-01", "category": "housing", "amount": 3000, "recurring": true, "frequency": "monthly"}
            ]
        }
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            imported = 0
            errors = []

            # Import income
            for entry in data.get('income', []):
                try:
                    self.db.add_cash_flow(
                        date=entry['date'],
                        flow_type='income',
                        category=entry['category'],
                        amount=float(entry['amount']),
                        description=entry.get('description'),
                        recurring=entry.get('recurring', False),
                        frequency=entry.get('frequency')
                    )
                    imported += 1
                except Exception as e:
                    errors.append(f"Income entry: {str(e)}")

            # Import expenses
            for entry in data.get('expenses', []):
                try:
                    self.db.add_cash_flow(
                        date=entry['date'],
                        flow_type='expense',
                        category=entry['category'],
                        amount=float(entry['amount']),
                        description=entry.get('description'),
                        recurring=entry.get('recurring', False),
                        frequency=entry.get('frequency')
                    )
                    imported += 1
                except Exception as e:
                    errors.append(f"Expense entry: {str(e)}")

            return {
                'imported': imported,
                'errors': errors
            }

        except Exception as e:
            return {'error': str(e)}

    def import_accounts_json(self, file_path: str) -> Dict:
        """
        Import account configurations from JSON.

        Expected format:
        [
            {"name": "Brokerage", "account_type": "brokerage", "institution": "Fidelity"},
            {"name": "IRA", "account_type": "retirement", "institution": "Vanguard"}
        ]
        """
        try:
            with open(file_path, 'r') as f:
                accounts = json.load(f)

            imported = 0
            errors = []

            for account in accounts:
                try:
                    self.db.add_account(
                        name=account['name'],
                        account_type=account['account_type'],
                        institution=account.get('institution'),
                        metadata=account.get('metadata')
                    )
                    imported += 1
                except Exception as e:
                    errors.append(f"{account.get('name', 'Unknown')}: {str(e)}")

            return {
                'imported': imported,
                'errors': errors,
                'total_accounts': len(accounts)
            }

        except Exception as e:
            return {'error': str(e)}
