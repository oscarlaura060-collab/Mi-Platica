import React, { useEffect, useRef } from 'react';

import {
  NavigationContainer,
  type NavigationContainerRef,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@/theme';
import { HomeScreen } from '@/features/home/HomeScreen';
import { DebtsScreen } from '@/features/debts/DebtsScreen';
import { DebtFormScreen } from '@/features/debts/DebtFormScreen';
import { DebtDetailScreen } from '@/features/debts/DebtDetailScreen';
import { DebtPayScreen } from '@/features/debts/DebtPayScreen';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { QuickAddScreen } from '@/features/quickadd/QuickAddScreen';
import { IncomeCoachFlow } from '@/features/coach/income/IncomeCoachFlow';
import { ExpenseCoachScreen } from '@/features/coach/expense/ExpenseCoachScreen';
import { TransactionEditScreen } from '@/features/quickadd/TransactionEditScreen';
import { AccountsScreen } from '@/features/accounts/AccountsScreen';
import { AccountFormScreen } from '@/features/accounts/AccountFormScreen';
import { AccountDetailScreen } from '@/features/accounts/AccountDetailScreen';
import { CreditCardScreen } from '@/features/cards/CreditCardScreen';
import { DetectedScreen } from '@/features/detect/DetectedScreen';
import { FixedExpensesScreen } from '@/features/fixed/FixedExpensesScreen';
import { FixedExpenseFormScreen } from '@/features/fixed/FixedExpenseFormScreen';
import { FixedIncomesScreen } from '@/features/fixed/FixedIncomesScreen';
import { FixedIncomeFormScreen } from '@/features/fixed/FixedIncomeFormScreen';
import { SavingsScreen } from '@/features/savings/SavingsScreen';
import { GoalFormScreen } from '@/features/savings/GoalFormScreen';
import { GoalDetailScreen } from '@/features/savings/GoalDetailScreen';
import { InvestmentsScreen } from '@/features/invest/InvestmentsScreen';
import { InvestmentFormScreen } from '@/features/invest/InvestmentFormScreen';
import { InvestmentDetailScreen } from '@/features/invest/InvestmentDetailScreen';
import { CoachScreen } from '@/features/coach/CoachScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { MovementsScreen } from '@/features/movements/MovementsScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { BottomBar } from './BottomBar';
import type { RootStackParamList, TabsParamList } from './types';

const Tab = createBottomTabNavigator<TabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Iconos de la barra inferior. Para "Inicio" se usa el simbolo de la
 * marca; el resto son glifos simples para no meter una libreria de
 * iconos solo por cuatro pestañas.
 */
/**
 * Pestañas del diseño aprobado: Inicio, Deudas, Ahorro y Análisis.
 *
 * Movimientos y Perfil siguen existiendo como pantallas secundarias y se
 * abren desde Inicio, Cuentas, Ajustes o acciones contextuales.
 *
 * La barra se dibuja a mano (BottomBar) porque el boton central no es
 * una pestaña: abre el menu de registro rapido.
 */
function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen
        name="Movements"
        component={MovementsScreen}
        options={{ title: 'Movimientos' }}
      />
      <Tab.Screen name="Savings" component={SavingsScreen} options={{ title: 'Ahorro' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const t = useTheme();
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Al tocar una notificacion, ir a la pantalla que corresponde.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as {
        route?: string;
        debtId?: number;
        goalId?: number;
      };
      if (!data?.route || !navRef.current) return;
      if (data.route === 'DebtDetail' && data.debtId) {
        navRef.current.navigate('DebtDetail', { debtId: data.debtId });
      } else if (data.route === 'QuickAdd') {
        navRef.current.navigate('QuickAdd', { type: 'expense' });
      } else if (data.route === 'Dashboard') {
        navRef.current.navigate('Dashboard');
      } else if (data.route === 'FixedExpenses') {
        navRef.current.navigate('FixedExpenses');
      } else if (data.route === 'Detected') {
        navRef.current.navigate('Detected');
      } else if (data.route === 'Savings') {
        navRef.current.navigate('Tabs', { screen: 'Savings' });
      } else if (data.route === 'GoalDetail' && data.goalId) {
        navRef.current.navigate('GoalDetail', { goalId: data.goalId });
      }
    });
    return () => sub.remove();
  }, []);

  const navTheme: NavTheme = {
    dark: t.mode === 'dark',
    colors: {
      primary: t.primary,
      background: t.bg,
      card: t.bgElevated,
      text: t.text,
      border: t.border,
      notification: t.danger,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  };

  /**
   * Deep links. El aviso "¿Quieres registrar este gasto?" abre
   * miplatica://detected, que lleva a la pantalla de revision. Nunca
   * registra nada solo: el usuario confirma ahi.
   */
  const linking = {
    prefixes: ['miplatica://'],
    config: {
      screens: {
        Detected: 'detected',
        Accounts: 'cuentas',
        QuickAdd: 'registrar',
        Settings: 'settings',
        Debts: 'deudas',
        Dashboard: 'analisis',
        Tabs: {
          screens: {
            Home: 'home',
            Movements: 'movimientos',
            Savings: 'savings',
            Profile: 'perfil',
          },
        },
        Profile: 'perfil',
      },
    },
  };

  return (
    <NavigationContainer ref={navRef} theme={navTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: t.reduceMotion ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} />

        <Stack.Screen
          name="QuickAdd"
          component={QuickAddScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="AllocateIncome"
          component={IncomeCoachFlow}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="TransactionEdit"
          component={TransactionEditScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        <Stack.Screen
          name="ExpenseCoach"
          component={ExpenseCoachScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        <Stack.Screen name="Accounts" component={AccountsScreen} />
        <Stack.Screen
          name="AccountForm"
          component={AccountFormScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="AccountDetail" component={AccountDetailScreen} />
        <Stack.Screen name="CreditCard" component={CreditCardScreen} />
        <Stack.Screen name="Detected" component={DetectedScreen} />
        <Stack.Screen name="Debts" component={DebtsScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />

        <Stack.Screen
          name="DebtForm"
          component={DebtFormScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="DebtDetail" component={DebtDetailScreen} />
        <Stack.Screen
          name="DebtPay"
          component={DebtPayScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        <Stack.Screen name="FixedExpenses" component={FixedExpensesScreen} />
        <Stack.Screen
          name="FixedExpenseForm"
          component={FixedExpenseFormScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="FixedIncomes" component={FixedIncomesScreen} />
        <Stack.Screen
          name="FixedIncomeForm"
          component={FixedIncomeFormScreen}
          options={{ presentation: 'modal' }}
        />

        <Stack.Screen
          name="GoalForm"
          component={GoalFormScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="GoalDetail" component={GoalDetailScreen} />

        <Stack.Screen name="Investments" component={InvestmentsScreen} />
        <Stack.Screen
          name="InvestmentForm"
          component={InvestmentFormScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="InvestmentDetail" component={InvestmentDetailScreen} />

        <Stack.Screen name="Coach" component={CoachScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
