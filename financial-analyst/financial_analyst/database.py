"""
Database module for financial data storage using SQLite.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any
from contextlib import contextmanager


class FinancialDatabase:
    """Manages SQLite database for financial data."""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize database connection."""
        if db_path is None:
            db_path = Path.home() / ".finai" / "financial_data.db"
        else:
            db_path = Path(db_path)

        # Ensure directory exists
        db_path.parent.mkdir(parents=True, exist_ok=True)

        self.db_path = str(db_path)
        self._init_schema()

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self):
        """Initialize database schema."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Accounts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    account_type TEXT NOT NULL,
                    institution TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT,
                    UNIQUE(name)
                )
            """)

            # Holdings table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS holdings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER NOT NULL,
                    symbol TEXT NOT NULL,
                    asset_type TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    cost_basis REAL NOT NULL,
                    purchase_date DATE NOT NULL,
                    current_price REAL,
                    last_updated TIMESTAMP,
                    metadata TEXT,
                    FOREIGN KEY (account_id) REFERENCES accounts (id),
                    UNIQUE(account_id, symbol, purchase_date)
                )
            """)

            # Transactions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER,
                    transaction_date DATE NOT NULL,
                    transaction_type TEXT NOT NULL,
                    symbol TEXT,
                    quantity REAL,
                    price REAL,
                    amount REAL NOT NULL,
                    category TEXT,
                    description TEXT,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (account_id) REFERENCES accounts (id)
                )
            """)

            # Cash flow table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cash_flow (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    type TEXT NOT NULL,
                    category TEXT NOT NULL,
                    amount REAL NOT NULL,
                    description TEXT,
                    recurring BOOLEAN DEFAULT 0,
                    frequency TEXT,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Tax records table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tax_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tax_year INTEGER NOT NULL,
                    income_type TEXT NOT NULL,
                    amount REAL NOT NULL,
                    deduction REAL DEFAULT 0,
                    category TEXT,
                    description TEXT,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Scenarios table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scenarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    scenario_type TEXT NOT NULL,
                    parameters TEXT NOT NULL,
                    results TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(name)
                )
            """)

            # Market data cache table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS market_data (
                    symbol TEXT PRIMARY KEY,
                    current_price REAL,
                    change_percent REAL,
                    volume INTEGER,
                    market_cap REAL,
                    pe_ratio REAL,
                    dividend_yield REAL,
                    last_updated TIMESTAMP,
                    metadata TEXT
                )
            """)

            # Config table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.commit()

    # Account methods
    def add_account(self, name: str, account_type: str, institution: str = None,
                   metadata: Dict = None) -> int:
        """Add a new account."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO accounts (name, account_type, institution, metadata)
                   VALUES (?, ?, ?, ?)""",
                (name, account_type, institution, json.dumps(metadata) if metadata else None)
            )
            return cursor.lastrowid

    def get_accounts(self) -> List[Dict]:
        """Get all accounts."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM accounts")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_account_by_name(self, name: str) -> Optional[Dict]:
        """Get account by name."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM accounts WHERE name = ?", (name,))
            row = cursor.fetchone()
            return dict(row) if row else None

    # Holdings methods
    def add_holding(self, account_id: int, symbol: str, asset_type: str,
                   quantity: float, cost_basis: float, purchase_date: str,
                   current_price: float = None, metadata: Dict = None) -> int:
        """Add or update a holding."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT OR REPLACE INTO holdings
                   (account_id, symbol, asset_type, quantity, cost_basis,
                    purchase_date, current_price, last_updated, metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (account_id, symbol, asset_type, quantity, cost_basis,
                 purchase_date, current_price, datetime.now(),
                 json.dumps(metadata) if metadata else None)
            )
            return cursor.lastrowid

    def get_holdings(self, account_id: Optional[int] = None) -> List[Dict]:
        """Get holdings, optionally filtered by account."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if account_id:
                cursor.execute("SELECT * FROM holdings WHERE account_id = ?", (account_id,))
            else:
                cursor.execute("SELECT * FROM holdings")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def update_holding_price(self, holding_id: int, current_price: float):
        """Update current price for a holding."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """UPDATE holdings
                   SET current_price = ?, last_updated = ?
                   WHERE id = ?""",
                (current_price, datetime.now(), holding_id)
            )

    # Transaction methods
    def add_transaction(self, transaction_date: str, transaction_type: str,
                       amount: float, account_id: int = None, symbol: str = None,
                       quantity: float = None, price: float = None,
                       category: str = None, description: str = None,
                       metadata: Dict = None) -> int:
        """Add a transaction."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO transactions
                   (account_id, transaction_date, transaction_type, symbol,
                    quantity, price, amount, category, description, metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (account_id, transaction_date, transaction_type, symbol,
                 quantity, price, amount, category, description,
                 json.dumps(metadata) if metadata else None)
            )
            return cursor.lastrowid

    def get_transactions(self, start_date: str = None, end_date: str = None,
                        account_id: int = None, transaction_type: str = None) -> List[Dict]:
        """Get transactions with optional filters."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM transactions WHERE 1=1"
            params = []

            if start_date:
                query += " AND transaction_date >= ?"
                params.append(start_date)
            if end_date:
                query += " AND transaction_date <= ?"
                params.append(end_date)
            if account_id:
                query += " AND account_id = ?"
                params.append(account_id)
            if transaction_type:
                query += " AND transaction_type = ?"
                params.append(transaction_type)

            query += " ORDER BY transaction_date DESC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    # Cash flow methods
    def add_cash_flow(self, date: str, flow_type: str, category: str,
                     amount: float, description: str = None, recurring: bool = False,
                     frequency: str = None, metadata: Dict = None) -> int:
        """Add a cash flow entry."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO cash_flow
                   (date, type, category, amount, description, recurring, frequency, metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (date, flow_type, category, amount, description, recurring, frequency,
                 json.dumps(metadata) if metadata else None)
            )
            return cursor.lastrowid

    def get_cash_flow(self, start_date: str = None, end_date: str = None,
                     flow_type: str = None) -> List[Dict]:
        """Get cash flow entries with optional filters."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM cash_flow WHERE 1=1"
            params = []

            if start_date:
                query += " AND date >= ?"
                params.append(start_date)
            if end_date:
                query += " AND date <= ?"
                params.append(end_date)
            if flow_type:
                query += " AND type = ?"
                params.append(flow_type)

            query += " ORDER BY date DESC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    # Tax methods
    def add_tax_record(self, tax_year: int, income_type: str, amount: float,
                      deduction: float = 0, category: str = None,
                      description: str = None, metadata: Dict = None) -> int:
        """Add a tax record."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO tax_records
                   (tax_year, income_type, amount, deduction, category, description, metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (tax_year, income_type, amount, deduction, category, description,
                 json.dumps(metadata) if metadata else None)
            )
            return cursor.lastrowid

    def get_tax_records(self, tax_year: int = None) -> List[Dict]:
        """Get tax records, optionally filtered by year."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if tax_year:
                cursor.execute("SELECT * FROM tax_records WHERE tax_year = ?", (tax_year,))
            else:
                cursor.execute("SELECT * FROM tax_records ORDER BY tax_year DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    # Scenario methods
    def save_scenario(self, name: str, scenario_type: str, parameters: Dict,
                     results: Dict = None) -> int:
        """Save a scenario."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT OR REPLACE INTO scenarios
                   (name, scenario_type, parameters, results)
                   VALUES (?, ?, ?, ?)""",
                (name, scenario_type, json.dumps(parameters),
                 json.dumps(results) if results else None)
            )
            return cursor.lastrowid

    def get_scenarios(self, scenario_type: str = None) -> List[Dict]:
        """Get saved scenarios."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if scenario_type:
                cursor.execute("SELECT * FROM scenarios WHERE scenario_type = ?", (scenario_type,))
            else:
                cursor.execute("SELECT * FROM scenarios ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    # Market data methods
    def update_market_data(self, symbol: str, data: Dict):
        """Update market data for a symbol."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT OR REPLACE INTO market_data
                   (symbol, current_price, change_percent, volume, market_cap,
                    pe_ratio, dividend_yield, last_updated, metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (symbol, data.get('current_price'), data.get('change_percent'),
                 data.get('volume'), data.get('market_cap'), data.get('pe_ratio'),
                 data.get('dividend_yield'), datetime.now(),
                 json.dumps(data.get('metadata', {})))
            )

    def get_market_data(self, symbol: str) -> Optional[Dict]:
        """Get cached market data for a symbol."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM market_data WHERE symbol = ?", (symbol,))
            row = cursor.fetchone()
            return dict(row) if row else None

    # Config methods
    def set_config(self, key: str, value: str):
        """Set a configuration value."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT OR REPLACE INTO config (key, value, updated_at)
                   VALUES (?, ?, ?)""",
                (key, value, datetime.now())
            )

    def get_config(self, key: str) -> Optional[str]:
        """Get a configuration value."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM config WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row['value'] if row else None

    def get_all_config(self) -> Dict[str, str]:
        """Get all configuration values."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM config")
            rows = cursor.fetchall()
            return {row['key']: row['value'] for row in rows}
