"""
Financial Stress Calculator Service

This service calculates financial stress scores based on predictions, transaction patterns,
and financial health indicators. It provides risk assessment, alerts, and personalized
recommendations to help users improve their financial health.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import json

logger = logging.getLogger(__name__)

class RiskLevel(Enum):
    """Risk level enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FactorCategory(Enum):
    """Financial stress factor categories"""
    SPENDING_TREND = "spending_trend"
    INCOME_VOLATILITY = "income_volatility"
    BALANCE_PROJECTION = "balance_projection"
    DEBT_RATIO = "debt_ratio"
    EMERGENCY_FUND = "emergency_fund"
    RECURRING_EXPENSES = "recurring_expenses"
    SEASONAL_PATTERNS = "seasonal_patterns"

class RecommendationType(Enum):
    """Recommendation types"""
    REDUCE_SPENDING = "reduce_spending"
    INCREASE_INCOME = "increase_income"
    BUILD_EMERGENCY_FUND = "build_emergency_fund"
    OPTIMIZE_CATEGORIES = "optimize_categories"
    REVIEW_SUBSCRIPTIONS = "review_subscriptions"
    DEBT_MANAGEMENT = "debt_management"
    BUDGET_PLANNING = "budget_planning"

@dataclass
class StressFactor:
    """Individual stress factor"""
    category: FactorCategory
    impact: float  # 0.0 to 1.0
    description: str
    severity: str  # low, medium, high
    value: float  # The actual metric value
    threshold: float  # The threshold that triggered this factor
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'category': self.category.value,
            'impact': self.impact,
            'description': self.description,
            'severity': self.severity,
            'value': self.value,
            'threshold': self.threshold
        }

@dataclass
class Recommendation:
    """Financial recommendation"""
    type: RecommendationType
    priority: str  # low, medium, high, urgent
    title: str
    description: str
    potential_impact: float  # Expected stress score reduction (0.0 to 1.0)
    action_items: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.type.value,
            'priority': self.priority,
            'title': self.title,
            'description': self.description,
            'potential_impact': self.potential_impact,
            'action_items': self.action_items
        }

@dataclass
class FinancialStressResult:
    """Complete financial stress assessment result"""
    user_id: str
    stress_score: float  # 0.0 to 100.0
    risk_level: RiskLevel
    factors: List[StressFactor]
    recommendations: List[Recommendation]
    calculated_at: datetime
    
    # Supporting metrics
    current_balance: float
    predicted_balance_30d: float
    monthly_spending_avg: float
    monthly_income_avg: float
    spending_volatility: float
    savings_rate: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'user_id': self.user_id,
            'stress_score': self.stress_score,
            'risk_level': self.risk_level.value,
            'factors': [factor.to_dict() for factor in self.factors],
            'recommendations': [rec.to_dict() for rec in self.recommendations],
            'calculated_at': self.calculated_at.isoformat(),
            'metrics': {
                'current_balance': self.current_balance,
                'predicted_balance_30d': self.predicted_balance_30d,
                'monthly_spending_avg': self.monthly_spending_avg,
                'monthly_income_avg': self.monthly_income_avg,
                'spending_volatility': self.spending_volatility,
                'savings_rate': self.savings_rate
            }
        }

class FinancialStressCalculator:
    """
    Financial stress calculator that analyzes user's financial health
    and provides stress scores, risk assessment, and recommendations
    """
    
    def __init__(self):
        """Initialize the financial stress calculator"""
        self.logger = logging.getLogger(__name__)
        
        # Stress score weights for different factors
        self.factor_weights = {
            FactorCategory.BALANCE_PROJECTION: 0.25,
            FactorCategory.SPENDING_TREND: 0.20,
            FactorCategory.INCOME_VOLATILITY: 0.15,
            FactorCategory.EMERGENCY_FUND: 0.15,
            FactorCategory.DEBT_RATIO: 0.10,
            FactorCategory.RECURRING_EXPENSES: 0.10,
            FactorCategory.SEASONAL_PATTERNS: 0.05
        }
        
        # Risk level thresholds
        self.risk_thresholds = {
            RiskLevel.LOW: 25.0,
            RiskLevel.MEDIUM: 50.0,
            RiskLevel.HIGH: 75.0,
            RiskLevel.CRITICAL: 100.0
        }
        
        self.logger.info("FinancialStressCalculator initialized")
    
    def calculate_stress_score(self,
                             user_id: str,
                             current_balance: float,
                             predictions: List[Dict[str, Any]],
                             transaction_history: List[Dict[str, Any]]) -> FinancialStressResult:
        """
        Calculate comprehensive financial stress score
        
        Args:
            user_id: User identifier
            current_balance: Current account balance
            predictions: List of balance predictions
            transaction_history: Historical transaction data
            
        Returns:
            FinancialStressResult with complete assessment
        """
        try:
            self.logger.info(f"Calculating stress score for user {user_id}")
            
            # Convert data to DataFrames for analysis
            transactions_df = self._prepare_transaction_data(transaction_history)
            predictions_df = self._prepare_prediction_data(predictions)
            
            # Calculate financial metrics
            metrics = self._calculate_financial_metrics(
                current_balance, transactions_df, predictions_df
            )
            
            # Analyze stress factors
            factors = self._analyze_stress_factors(metrics, transactions_df, predictions_df)
            
            # Calculate overall stress score
            stress_score = self._calculate_overall_stress_score(factors)
            
            # Determine risk level
            risk_level = self._determine_risk_level(stress_score)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(factors, metrics, risk_level)
            
            # Create result
            result = FinancialStressResult(
                user_id=user_id,
                stress_score=stress_score,
                risk_level=risk_level,
                factors=factors,
                recommendations=recommendations,
                calculated_at=datetime.now(),
                current_balance=current_balance,
                predicted_balance_30d=metrics['predicted_balance_30d'],
                monthly_spending_avg=metrics['monthly_spending_avg'],
                monthly_income_avg=metrics['monthly_income_avg'],
                spending_volatility=metrics['spending_volatility'],
                savings_rate=metrics['savings_rate']
            )
            
            self.logger.info(f"Stress score calculated: {stress_score:.1f} ({risk_level.value})")
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to calculate stress score: {str(e)}")
            raise
    
    def _prepare_transaction_data(self, transaction_history: List[Dict[str, Any]]) -> pd.DataFrame:
        """Prepare transaction data for analysis"""
        if not transaction_history:
            return pd.DataFrame()
        
        df = pd.DataFrame(transaction_history)
        df['date'] = pd.to_datetime(df['date'])
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        
        # Sort by date
        df = df.sort_values('date')
        
        # Add derived columns
        df['is_income'] = df['amount'] > 0
        df['is_expense'] = df['amount'] < 0
        df['abs_amount'] = df['amount'].abs()
        
        return df
    
    def _prepare_prediction_data(self, predictions: List[Dict[str, Any]]) -> pd.DataFrame:
        """Prepare prediction data for analysis"""
        if not predictions:
            return pd.DataFrame()
        
        df = pd.DataFrame(predictions)
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
        if 'predicted_balance' in df.columns:
            df['predicted_balance'] = pd.to_numeric(df['predicted_balance'], errors='coerce')
        
        return df.sort_values('date') if 'date' in df.columns else df
    
    def _calculate_financial_metrics(self,
                                   current_balance: float,
                                   transactions_df: pd.DataFrame,
                                   predictions_df: pd.DataFrame) -> Dict[str, float]:
        """Calculate key financial metrics"""
        metrics = {}
        
        # Current balance
        metrics['current_balance'] = current_balance
        
        # Predicted balance (30 days ahead)
        if not predictions_df.empty and 'predicted_balance' in predictions_df.columns:
            metrics['predicted_balance_30d'] = predictions_df['predicted_balance'].iloc[-1]
        else:
            metrics['predicted_balance_30d'] = current_balance
        
        if transactions_df.empty:
            # Default values if no transaction history
            metrics.update({
                'monthly_spending_avg': 0.0,
                'monthly_income_avg': 0.0,
                'spending_volatility': 0.0,
                'income_volatility': 0.0,
                'savings_rate': 0.0,
                'emergency_fund_months': 0.0,
                'debt_to_income_ratio': 0.0
            })
            return metrics
        
        # Calculate monthly averages
        monthly_expenses = transactions_df[transactions_df['is_expense']].groupby(
            transactions_df['date'].dt.to_period('M')
        )['amount'].sum().abs()
        
        monthly_income = transactions_df[transactions_df['is_income']].groupby(
            transactions_df['date'].dt.to_period('M')
        )['amount'].sum()
        
        metrics['monthly_spending_avg'] = monthly_expenses.mean() if not monthly_expenses.empty else 0.0
        metrics['monthly_income_avg'] = monthly_income.mean() if not monthly_income.empty else 0.0
        
        # Calculate volatility (coefficient of variation)
        metrics['spending_volatility'] = (
            monthly_expenses.std() / monthly_expenses.mean() 
            if not monthly_expenses.empty and monthly_expenses.mean() > 0 else 0.0
        )
        
        metrics['income_volatility'] = (
            monthly_income.std() / monthly_income.mean() 
            if not monthly_income.empty and monthly_income.mean() > 0 else 0.0
        )
        
        # Calculate savings rate
        if metrics['monthly_income_avg'] > 0:
            metrics['savings_rate'] = (
                metrics['monthly_income_avg'] - metrics['monthly_spending_avg']
            ) / metrics['monthly_income_avg']
        else:
            metrics['savings_rate'] = 0.0
        
        # Emergency fund (months of expenses covered by current balance)
        if metrics['monthly_spending_avg'] > 0:
            metrics['emergency_fund_months'] = current_balance / metrics['monthly_spending_avg']
        else:
            metrics['emergency_fund_months'] = float('inf') if current_balance > 0 else 0.0
        
        # Debt-to-income ratio (simplified - based on negative balance trend)
        balance_trend = metrics['predicted_balance_30d'] - current_balance
        if metrics['monthly_income_avg'] > 0 and balance_trend < 0:
            metrics['debt_to_income_ratio'] = abs(balance_trend) / metrics['monthly_income_avg']
        else:
            metrics['debt_to_income_ratio'] = 0.0
        
        return metrics
    
    def _analyze_stress_factors(self,
                               metrics: Dict[str, float],
                               transactions_df: pd.DataFrame,
                               predictions_df: pd.DataFrame) -> List[StressFactor]:
        """Analyze individual stress factors"""
        factors = []
        
        # 1. Balance Projection Factor
        balance_change = metrics['predicted_balance_30d'] - metrics['current_balance']
        balance_change_pct = (
            balance_change / abs(metrics['current_balance']) 
            if metrics['current_balance'] != 0 else 0
        )
        
        if balance_change < -500 or balance_change_pct < -0.2:
            severity = "high" if balance_change < -1000 or balance_change_pct < -0.3 else "medium"
            impact = min(0.8, abs(balance_change_pct) * 2) if balance_change_pct < 0 else 0.0
            
            factors.append(StressFactor(
                category=FactorCategory.BALANCE_PROJECTION,
                impact=impact,
                description=f"Balance projected to decrease by ${abs(balance_change):.0f} ({abs(balance_change_pct)*100:.1f}%) in 30 days",
                severity=severity,
                value=balance_change,
                threshold=-500
            ))
        
        # 2. Spending Trend Factor
        if metrics['spending_volatility'] > 0.3:
            impact = min(0.7, metrics['spending_volatility'])
            severity = "high" if metrics['spending_volatility'] > 0.5 else "medium"
            
            factors.append(StressFactor(
                category=FactorCategory.SPENDING_TREND,
                impact=impact,
                description=f"High spending volatility ({metrics['spending_volatility']*100:.1f}%) indicates unpredictable expenses",
                severity=severity,
                value=metrics['spending_volatility'],
                threshold=0.3
            ))
        
        # 3. Income Volatility Factor
        if metrics['income_volatility'] > 0.2:
            impact = min(0.6, metrics['income_volatility'])
            severity = "high" if metrics['income_volatility'] > 0.4 else "medium"
            
            factors.append(StressFactor(
                category=FactorCategory.INCOME_VOLATILITY,
                impact=impact,
                description=f"Income volatility ({metrics['income_volatility']*100:.1f}%) suggests unstable income",
                severity=severity,
                value=metrics['income_volatility'],
                threshold=0.2
            ))
        
        # 4. Emergency Fund Factor
        if metrics['emergency_fund_months'] < 3:
            impact = max(0.3, (3 - metrics['emergency_fund_months']) / 3 * 0.8)
            severity = "high" if metrics['emergency_fund_months'] < 1 else "medium"
            
            factors.append(StressFactor(
                category=FactorCategory.EMERGENCY_FUND,
                impact=impact,
                description=f"Emergency fund covers only {metrics['emergency_fund_months']:.1f} months of expenses (recommended: 3-6 months)",
                severity=severity,
                value=metrics['emergency_fund_months'],
                threshold=3.0
            ))
        
        # 5. Savings Rate Factor (negative savings)
        if metrics['savings_rate'] < 0:
            impact = min(0.9, abs(metrics['savings_rate']))
            severity = "high" if metrics['savings_rate'] < -0.2 else "medium"
            
            factors.append(StressFactor(
                category=FactorCategory.DEBT_RATIO,
                impact=impact,
                description=f"Negative savings rate ({metrics['savings_rate']*100:.1f}%) - spending exceeds income",
                severity=severity,
                value=metrics['savings_rate'],
                threshold=0.0
            ))
        
        # 6. Recurring Expenses Factor (high fixed costs)
        if not transactions_df.empty:
            recurring_expenses = self._identify_recurring_expenses(transactions_df)
            recurring_ratio = recurring_expenses / metrics['monthly_income_avg'] if metrics['monthly_income_avg'] > 0 else 0
            
            if recurring_ratio > 0.7:
                impact = min(0.5, (recurring_ratio - 0.7) * 2)
                severity = "high" if recurring_ratio > 0.8 else "medium"
                
                factors.append(StressFactor(
                    category=FactorCategory.RECURRING_EXPENSES,
                    impact=impact,
                    description=f"High recurring expenses ({recurring_ratio*100:.1f}% of income) limit financial flexibility",
                    severity=severity,
                    value=recurring_ratio,
                    threshold=0.7
                ))
        
        # 7. Seasonal Patterns Factor
        if not transactions_df.empty and len(transactions_df) > 90:
            seasonal_volatility = self._calculate_seasonal_volatility(transactions_df)
            if seasonal_volatility > 0.4:
                impact = min(0.3, seasonal_volatility - 0.4)
                
                factors.append(StressFactor(
                    category=FactorCategory.SEASONAL_PATTERNS,
                    impact=impact,
                    description=f"High seasonal spending variation ({seasonal_volatility*100:.1f}%) may cause cash flow issues",
                    severity="medium",
                    value=seasonal_volatility,
                    threshold=0.4
                ))
        
        return factors
    
    def _identify_recurring_expenses(self, transactions_df: pd.DataFrame) -> float:
        """Identify and calculate recurring monthly expenses"""
        if transactions_df.empty:
            return 0.0
        
        # Group expenses by description and calculate frequency
        expense_df = transactions_df[transactions_df['is_expense']].copy()
        
        # Simple heuristic: expenses that appear multiple times with similar amounts
        recurring_patterns = expense_df.groupby('description').agg({
            'amount': ['count', 'mean', 'std'],
            'date': ['min', 'max']
        }).round(2)
        
        recurring_patterns.columns = ['count', 'mean_amount', 'std_amount', 'first_date', 'last_date']
        
        # Consider as recurring if appears 3+ times with low amount variation
        recurring_mask = (
            (recurring_patterns['count'] >= 3) &
            (recurring_patterns['std_amount'] / recurring_patterns['mean_amount'].abs() < 0.2)
        )
        
        recurring_expenses = recurring_patterns[recurring_mask]['mean_amount'].abs().sum()
        return recurring_expenses
    
    def _calculate_seasonal_volatility(self, transactions_df: pd.DataFrame) -> float:
        """Calculate seasonal spending volatility"""
        if transactions_df.empty:
            return 0.0
        
        # Group by month and calculate spending
        monthly_spending = transactions_df[transactions_df['is_expense']].groupby(
            transactions_df['date'].dt.month
        )['amount'].sum().abs()
        
        if len(monthly_spending) < 3:
            return 0.0
        
        # Calculate coefficient of variation across months
        return monthly_spending.std() / monthly_spending.mean() if monthly_spending.mean() > 0 else 0.0
    
    def _calculate_overall_stress_score(self, factors: List[StressFactor]) -> float:
        """Calculate weighted overall stress score"""
        if not factors:
            return 0.0
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for factor in factors:
            weight = self.factor_weights.get(factor.category, 0.1)
            weighted_impact = factor.impact * weight * 100  # Convert to 0-100 scale
            total_weighted_score += weighted_impact
            total_weight += weight
        
        # Normalize by total weight used
        if total_weight > 0:
            stress_score = total_weighted_score / total_weight
        else:
            stress_score = 0.0
        
        # Ensure score is within bounds
        return min(100.0, max(0.0, stress_score))
    
    def _determine_risk_level(self, stress_score: float) -> RiskLevel:
        """Determine risk level based on stress score"""
        if stress_score < self.risk_thresholds[RiskLevel.LOW]:
            return RiskLevel.LOW
        elif stress_score < self.risk_thresholds[RiskLevel.MEDIUM]:
            return RiskLevel.MEDIUM
        elif stress_score < self.risk_thresholds[RiskLevel.HIGH]:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _generate_recommendations(self,
                                factors: List[StressFactor],
                                metrics: Dict[str, float],
                                risk_level: RiskLevel) -> List[Recommendation]:
        """Generate personalized recommendations based on stress factors"""
        recommendations = []
        
        # Sort factors by impact (highest first)
        factors_by_impact = sorted(factors, key=lambda f: f.impact, reverse=True)
        
        for factor in factors_by_impact[:5]:  # Top 5 factors
            recs = self._get_recommendations_for_factor(factor, metrics, risk_level)
            recommendations.extend(recs)
        
        # Add general recommendations based on risk level
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recommendations.extend(self._get_emergency_recommendations(metrics))
        
        # Remove duplicates and sort by priority
        unique_recommendations = self._deduplicate_recommendations(recommendations)
        return sorted(unique_recommendations, key=lambda r: self._priority_score(r.priority), reverse=True)
    
    def _get_recommendations_for_factor(self,
                                      factor: StressFactor,
                                      metrics: Dict[str, float],
                                      risk_level: RiskLevel) -> List[Recommendation]:
        """Get specific recommendations for a stress factor"""
        recommendations = []
        
        if factor.category == FactorCategory.BALANCE_PROJECTION:
            if factor.value < -1000:
                recommendations.append(Recommendation(
                    type=RecommendationType.REDUCE_SPENDING,
                    priority="urgent",
                    title="Reduce Non-Essential Spending",
                    description="Your balance is projected to drop significantly. Focus on cutting discretionary expenses immediately.",
                    potential_impact=0.3,
                    action_items=[
                        "Review and cancel unused subscriptions",
                        "Reduce dining out and entertainment expenses",
                        "Postpone non-essential purchases"
                    ]
                ))
            
            recommendations.append(Recommendation(
                type=RecommendationType.BUDGET_PLANNING,
                priority="high",
                title="Create Emergency Budget Plan",
                description="Develop a plan to stabilize your balance and prevent further decline.",
                potential_impact=0.4,
                action_items=[
                    "Set strict spending limits for each category",
                    "Track daily expenses",
                    "Identify areas for immediate cost reduction"
                ]
            ))
        
        elif factor.category == FactorCategory.EMERGENCY_FUND:
            recommendations.append(Recommendation(
                type=RecommendationType.BUILD_EMERGENCY_FUND,
                priority="high" if risk_level == RiskLevel.CRITICAL else "medium",
                title="Build Emergency Fund",
                description=f"Increase your emergency fund to cover at least 3 months of expenses (currently {factor.value:.1f} months).",
                potential_impact=0.25,
                action_items=[
                    "Set up automatic savings transfer",
                    "Save any windfalls or bonuses",
                    "Consider a high-yield savings account"
                ]
            ))
        
        elif factor.category == FactorCategory.SPENDING_TREND:
            recommendations.append(Recommendation(
                type=RecommendationType.OPTIMIZE_CATEGORIES,
                priority="medium",
                title="Stabilize Spending Patterns",
                description="Your spending varies significantly month-to-month. Creating consistent spending habits will improve predictability.",
                potential_impact=0.2,
                action_items=[
                    "Set monthly budgets for variable categories",
                    "Use spending tracking apps",
                    "Review spending weekly"
                ]
            ))
        
        elif factor.category == FactorCategory.INCOME_VOLATILITY:
            recommendations.append(Recommendation(
                type=RecommendationType.INCREASE_INCOME,
                priority="medium",
                title="Diversify Income Sources",
                description="Your income varies significantly. Consider ways to create more stable income streams.",
                potential_impact=0.3,
                action_items=[
                    "Explore side income opportunities",
                    "Negotiate salary or seek stable employment",
                    "Build skills for higher-paying roles"
                ]
            ))
        
        elif factor.category == FactorCategory.RECURRING_EXPENSES:
            recommendations.append(Recommendation(
                type=RecommendationType.REVIEW_SUBSCRIPTIONS,
                priority="medium",
                title="Optimize Fixed Expenses",
                description="High recurring expenses limit your financial flexibility. Review and optimize fixed costs.",
                potential_impact=0.15,
                action_items=[
                    "Audit all subscriptions and memberships",
                    "Negotiate better rates for utilities and services",
                    "Consider downsizing fixed commitments"
                ]
            ))
        
        elif factor.category == FactorCategory.DEBT_RATIO:
            recommendations.append(Recommendation(
                type=RecommendationType.DEBT_MANAGEMENT,
                priority="urgent",
                title="Address Negative Cash Flow",
                description="You're spending more than you earn. Immediate action is needed to prevent financial crisis.",
                potential_impact=0.5,
                action_items=[
                    "Stop all non-essential spending immediately",
                    "Consider debt consolidation options",
                    "Seek additional income sources urgently"
                ]
            ))
        
        return recommendations
    
    def _get_emergency_recommendations(self, metrics: Dict[str, float]) -> List[Recommendation]:
        """Get emergency recommendations for high-risk situations"""
        recommendations = []
        
        if metrics['savings_rate'] < -0.1:
            recommendations.append(Recommendation(
                type=RecommendationType.DEBT_MANAGEMENT,
                priority="urgent",
                title="Emergency Financial Plan",
                description="Your financial situation requires immediate intervention to prevent crisis.",
                potential_impact=0.6,
                action_items=[
                    "Contact financial advisor or counselor",
                    "Explore emergency assistance programs",
                    "Consider temporary lifestyle changes"
                ]
            ))
        
        return recommendations
    
    def _deduplicate_recommendations(self, recommendations: List[Recommendation]) -> List[Recommendation]:
        """Remove duplicate recommendations"""
        seen_types = set()
        unique_recommendations = []
        
        for rec in recommendations:
            if rec.type not in seen_types:
                unique_recommendations.append(rec)
                seen_types.add(rec.type)
        
        return unique_recommendations
    
    def _priority_score(self, priority: str) -> int:
        """Convert priority to numeric score for sorting"""
        priority_scores = {
            "urgent": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        return priority_scores.get(priority, 0)
    
    def get_stress_threshold_alerts(self, stress_score: float, risk_level: RiskLevel) -> List[Dict[str, Any]]:
        """Generate threshold-based alerts"""
        alerts = []
        
        if risk_level == RiskLevel.CRITICAL:
            alerts.append({
                'type': 'critical_stress',
                'severity': 'critical',
                'message': f'Critical financial stress detected (score: {stress_score:.1f}). Immediate action required.',
                'action_required': True
            })
        
        elif risk_level == RiskLevel.HIGH:
            alerts.append({
                'type': 'high_stress',
                'severity': 'warning',
                'message': f'High financial stress detected (score: {stress_score:.1f}). Review recommendations.',
                'action_required': True
            })
        
        elif risk_level == RiskLevel.MEDIUM:
            alerts.append({
                'type': 'moderate_stress',
                'severity': 'info',
                'message': f'Moderate financial stress (score: {stress_score:.1f}). Consider optimization opportunities.',
                'action_required': False
            })
        
        return alerts