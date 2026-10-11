import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { monthlyIncomeTotal } from '@/db/repositories/fixedIncomes';
import { monthlyFixedTotal } from '@/db/repositories/fixedExpenses';
import { listDebts } from '@/db/repositories/debts';
import { monthlyCardInstallments } from '@/db/repositories/creditCards';
import { avgDailyDiscretionaryExpense } from '@/db/repositories/stats';
import { getNumberSetting } from '@/db/repositories/settings';
import { totalBalance } from '@/db/repositories/accounts';
import type { Capacity } from '@/domain/savings/plan';

const VACIO: Capacity = {
  monthlyIncome: 0,
  monthlyFixed: 0,
  monthlyDebt: 0,
  basicNeeds: 0,
  avgDailyExpense: 0,
  balance: 0,
};

/**
 * Reune lo que hace falta para saber cuanto puede ahorrar el usuario sin
 * quedarse sin plata para lo basico.
 */
export function useCapacity(): Capacity {
  const [cap, setCap] = useState<Capacity>(VACIO);

  const load = useCallback(async () => {
    const [ingresos, fijos, deudas, cuotasTarjeta, promedio, basicos, saldo] =
      await Promise.all([
        monthlyIncomeTotal(),
        monthlyFixedTotal(),
        listDebts('active'),
        monthlyCardInstallments(),
        avgDailyDiscretionaryExpense(30),
        getNumberSetting('basic_needs_reserve', 0),
        totalBalance(),
      ]);

    setCap({
      monthlyIncome: ingresos,
      monthlyFixed: fijos,
      monthlyDebt:
        deudas.reduce((a, d) => a + (d.installment_amount ?? 0), 0) + cuotasTarjeta,
      basicNeeds: basicos,
      avgDailyExpense: promedio,
      balance: saldo,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return cap;
}
