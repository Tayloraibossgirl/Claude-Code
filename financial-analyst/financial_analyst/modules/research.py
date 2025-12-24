"""
Investment research module with web search and fundamental analysis.
"""

import yfinance as yf
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import anthropic


class InvestmentResearcher:
    """Research stocks and investments using web search and data sources."""

    def __init__(self, db, anthropic_api_key: str = None):
        """Initialize with database connection and API key."""
        self.db = db
        self.anthropic_api_key = anthropic_api_key
        if anthropic_api_key:
            self.client = anthropic.Anthropic(api_key=anthropic_api_key)

    def get_stock_fundamentals(self, symbol: str) -> Dict:
        """Get fundamental data for a stock using yfinance."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            fundamentals = {
                'symbol': symbol,
                'name': info.get('longName', symbol),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'current_price': info.get('currentPrice'),
                'market_cap': info.get('marketCap'),
                'pe_ratio': info.get('trailingPE'),
                'forward_pe': info.get('forwardPE'),
                'peg_ratio': info.get('pegRatio'),
                'price_to_book': info.get('priceToBook'),
                'dividend_yield': info.get('dividendYield'),
                'beta': info.get('beta'),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
                'fifty_day_average': info.get('fiftyDayAverage'),
                'two_hundred_day_average': info.get('twoHundredDayAverage'),
                'revenue': info.get('totalRevenue'),
                'revenue_growth': info.get('revenueGrowth'),
                'earnings_growth': info.get('earningsGrowth'),
                'profit_margin': info.get('profitMargin'),
                'operating_margin': info.get('operatingMargin'),
                'roe': info.get('returnOnEquity'),
                'roa': info.get('returnOnAssets'),
                'debt_to_equity': info.get('debtToEquity'),
                'current_ratio': info.get('currentRatio'),
                'quick_ratio': info.get('quickRatio'),
                'analyst_recommendation': info.get('recommendationKey'),
                'target_price': info.get('targetMeanPrice'),
                'last_updated': datetime.now().isoformat()
            }

            # Cache the data
            market_data = {
                'current_price': fundamentals['current_price'],
                'change_percent': 0,  # Would need historical data
                'volume': info.get('volume'),
                'market_cap': fundamentals['market_cap'],
                'pe_ratio': fundamentals['pe_ratio'],
                'dividend_yield': fundamentals['dividend_yield'],
                'metadata': fundamentals
            }
            self.db.update_market_data(symbol, market_data)

            return fundamentals

        except Exception as e:
            return {
                'symbol': symbol,
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }

    def get_price_history(self, symbol: str, period: str = "1mo") -> Dict:
        """
        Get historical price data.

        Args:
            symbol: Stock symbol
            period: Valid periods: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max
        """
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period)

            if hist.empty:
                return {'symbol': symbol, 'error': 'No data available'}

            # Calculate price changes
            current_price = hist['Close'].iloc[-1]
            start_price = hist['Close'].iloc[0]
            change = current_price - start_price
            change_pct = (change / start_price * 100) if start_price > 0 else 0

            return {
                'symbol': symbol,
                'period': period,
                'current_price': current_price,
                'start_price': start_price,
                'change': change,
                'change_pct': change_pct,
                'high': hist['High'].max(),
                'low': hist['Low'].min(),
                'avg_volume': hist['Volume'].mean(),
                'history': hist.to_dict('records')
            }

        except Exception as e:
            return {
                'symbol': symbol,
                'error': str(e)
            }

    def web_search_stock(self, symbol: str, query: str = None) -> str:
        """
        Search the web for information about a stock.

        Uses Claude's web search capability via extended thinking.
        """
        if not self.anthropic_api_key:
            return "Web search requires Anthropic API key. Please configure in setup."

        if query is None:
            query = f"Latest news and analysis for {symbol} stock"

        try:
            # Use Claude with extended thinking for web research
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                thinking={
                    "type": "enabled",
                    "budget_tokens": 3000
                },
                messages=[{
                    "role": "user",
                    "content": f"Search the web and provide a summary about: {query}. Include recent news, price movements, analyst opinions, and any significant developments. Be concise but comprehensive."
                }]
            )

            # Extract the response text
            response_text = ""
            for block in message.content:
                if block.type == "text":
                    response_text += block.text

            return response_text

        except Exception as e:
            return f"Web search error: {str(e)}"

    def analyze_holding(self, symbol: str) -> Dict:
        """Comprehensive analysis of a holding."""
        # Get fundamentals
        fundamentals = self.get_stock_fundamentals(symbol)

        # Get price history
        price_history = self.get_price_history(symbol, period="6mo")

        # Get holdings data
        holdings = [h for h in self.db.get_holdings() if h['symbol'] == symbol]

        # Calculate portfolio metrics
        total_shares = sum(h['quantity'] for h in holdings)
        avg_cost_basis = (sum(h['cost_basis'] * h['quantity'] for h in holdings) / total_shares
                         if total_shares > 0 else 0)
        current_price = fundamentals.get('current_price', 0)
        total_value = total_shares * current_price if current_price else 0
        total_cost = sum(h['cost_basis'] * h['quantity'] for h in holdings)
        unrealized_gain = total_value - total_cost
        unrealized_gain_pct = (unrealized_gain / total_cost * 100) if total_cost > 0 else 0

        return {
            'symbol': symbol,
            'fundamentals': fundamentals,
            'price_history': price_history,
            'holdings': {
                'total_shares': total_shares,
                'avg_cost_basis': avg_cost_basis,
                'current_price': current_price,
                'total_value': total_value,
                'total_cost': total_cost,
                'unrealized_gain': unrealized_gain,
                'unrealized_gain_pct': unrealized_gain_pct
            }
        }

    def get_earnings_calendar(self, symbol: str) -> Dict:
        """Get upcoming earnings information."""
        try:
            ticker = yf.Ticker(symbol)
            calendar = ticker.calendar

            if calendar is None or calendar.empty:
                return {'symbol': symbol, 'earnings_date': None}

            return {
                'symbol': symbol,
                'earnings_date': str(calendar.get('Earnings Date', [None])[0]) if hasattr(calendar, 'get') else None,
                'calendar': calendar.to_dict() if hasattr(calendar, 'to_dict') else str(calendar)
            }

        except Exception as e:
            return {
                'symbol': symbol,
                'error': str(e)
            }

    def screen_portfolio_health(self) -> Dict:
        """Screen entire portfolio for health metrics."""
        holdings = self.db.get_holdings()
        symbols = list(set(h['symbol'] for h in holdings))

        portfolio_health = {
            'total_symbols': len(symbols),
            'concerns': [],
            'opportunities': [],
            'summary': {}
        }

        for symbol in symbols:
            try:
                fundamentals = self.get_stock_fundamentals(symbol)

                # Check for concerns
                if fundamentals.get('pe_ratio') and fundamentals['pe_ratio'] > 40:
                    portfolio_health['concerns'].append({
                        'symbol': symbol,
                        'issue': 'High P/E ratio',
                        'value': fundamentals['pe_ratio']
                    })

                if fundamentals.get('debt_to_equity') and fundamentals['debt_to_equity'] > 2.0:
                    portfolio_health['concerns'].append({
                        'symbol': symbol,
                        'issue': 'High debt to equity',
                        'value': fundamentals['debt_to_equity']
                    })

                # Check for opportunities
                if fundamentals.get('dividend_yield') and fundamentals['dividend_yield'] > 0.03:
                    portfolio_health['opportunities'].append({
                        'symbol': symbol,
                        'opportunity': 'Good dividend yield',
                        'value': fundamentals['dividend_yield']
                    })

                portfolio_health['summary'][symbol] = {
                    'price': fundamentals.get('current_price'),
                    'pe_ratio': fundamentals.get('pe_ratio'),
                    'market_cap': fundamentals.get('market_cap'),
                    'dividend_yield': fundamentals.get('dividend_yield')
                }

            except Exception as e:
                portfolio_health['concerns'].append({
                    'symbol': symbol,
                    'issue': 'Error fetching data',
                    'error': str(e)
                })

        return portfolio_health

    def refresh_all_prices(self) -> Dict:
        """Refresh current prices for all holdings."""
        holdings = self.db.get_holdings()
        symbols = list(set(h['symbol'] for h in holdings))

        updated = []
        errors = []

        for symbol in symbols:
            try:
                fundamentals = self.get_stock_fundamentals(symbol)
                current_price = fundamentals.get('current_price')

                if current_price:
                    # Update all holdings with this symbol
                    for holding in holdings:
                        if holding['symbol'] == symbol:
                            self.db.update_holding_price(holding['id'], current_price)

                    updated.append({
                        'symbol': symbol,
                        'price': current_price
                    })
                else:
                    errors.append({
                        'symbol': symbol,
                        'error': 'No price data available'
                    })

            except Exception as e:
                errors.append({
                    'symbol': symbol,
                    'error': str(e)
                })

        return {
            'updated': updated,
            'errors': errors,
            'total_updated': len(updated),
            'total_errors': len(errors)
        }
