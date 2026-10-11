import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type TabsParamList = {
  Home: undefined;
  Movements: undefined;
  Savings: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  QuickAdd: { type?: 'expense' | 'income'; accountId?: number } | undefined;
  AllocateIncome: { amount: number; accountId: number };
  ExpenseCoach: {
    amount: number;
    accountId: number;
    accountName: string;
    categoryId: number | null;
    categoryName: string;
  };
  TransactionEdit: { transactionId: number };
  Accounts: undefined;
  Profile: undefined;
  AccountForm: { accountId?: number };
  AccountDetail: { accountId: number };
  CreditCard: { cardId: number };
  Detected: undefined;
  Debts: undefined;
  Dashboard: undefined;
  Movements: undefined;
  DebtForm: { debtId?: number };
  DebtDetail: { debtId: number };
  DebtPay: { debtId: number; suggested?: number };
  FixedExpenses: undefined;
  FixedExpenseForm: { fixedExpenseId?: number };
  FixedIncomes: undefined;
  FixedIncomeForm: { fixedIncomeId?: number };
  GoalForm: { goalId?: number };
  GoalDetail: { goalId: number };
  Investments: undefined;
  InvestmentForm: { investmentId?: number };
  InvestmentDetail: { investmentId: number };
  Coach: undefined;
  Settings: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
