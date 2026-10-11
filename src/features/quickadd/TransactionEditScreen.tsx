import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Chip, Row, Spacer, Txt } from '@/components/ui';
import { Keypad } from '@/components/Keypad';
import { useAppStore } from '@/store/useAppStore';
import { listCategories } from '@/db/repositories/categories';
import {
  getTransaction,
  softDelete,
  updateTransaction,
} from '@/db/repositories/transactions';
import { keypadToCents, money } from '@/utils/money';
import { format, parseISO } from '@/utils/date';
import type { Category, TransactionRow } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

/**
 * Editar una transaccion ya registrada: monto, cuenta, categoria y nota.
 *
 * Las transacciones ligadas a una deuda, una inversion o un gasto fijo no
 * se editan aqui: tocarlas a mano descuadraria el saldo de esa deuda o
 * vehiculo. En ese caso se ofrece eliminar y volver a registrar.
 */
export function TransactionEditScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { transactionId } =
    useRoute<RouteProp<RootStackParamList, 'TransactionEdit'>>().params;
  const { accounts, refresh } = useAppStore();

  const [tx, setTx] = useState<TransactionRow | null>(null);
  const [pesos, setPesos] = useState(0);
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTransaction(transactionId).then((row) => {
      if (!row) return;
      setTx(row);
      setPesos(Math.round(row.amount / 100));
      setNote(row.note ?? '');
      setCategoryId(row.category_id);
      setAccountId(row.account_id);
      listCategories(row.type === 'income' ? 'income' : 'expense').then(setCategories);
    });
  }, [transactionId]);

  const amount = keypadToCents(pesos);
  const linked = tx
    ? tx.debt_id !== null || tx.investment_id !== null || tx.fixed_expense_id !== null
    : false;

  async function save() {
    if (!tx || amount <= 0 || !accountId) return;
    setSaving(true);
    try {
      await updateTransaction(tx.id, {
        amount,
        account_id: accountId,
        category_id: categoryId,
        note: note.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await refresh();
      nav.goBack();
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    Alert.alert(
      'Eliminar transaccion',
      '¿Estas seguro que deseas eliminar esta transaccion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await softDelete(transactionId);
            await refresh();
            nav.goBack();
          },
        },
      ],
    );
  }

  if (!tx) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const amountLabel = money(amount);
  const fontSize = amountLabel.length > 15 ? 28 : amountLabel.length > 12 ? 34 : 44;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <View style={{ paddingHorizontal: t.space(5) }}>
        <Row justify="space-between">
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Txt variant="body" muted>
              Cancelar
            </Txt>
          </Pressable>
          <Pressable onPress={remove} hitSlop={12}>
            <Txt variant="body" color={t.danger} weight="700">
              Eliminar
            </Txt>
          </Pressable>
        </Row>
      </View>

      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: t.space(5) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Spacer h={5} />
        <Txt variant="tiny" faint align="center">
          EDITANDO · {format(parseISO(tx.occurred_at), 'dd/MM/yyyy')}
        </Txt>
        <Spacer h={1} />
        <Txt
          variant="h1"
          align="center"
          numberOfLines={1}
          color={tx.type === 'income' ? t.primary : t.text}
          style={{ fontSize }}
        >
          {amountLabel}
        </Txt>

        {linked ? (
          <>
            <Spacer h={4} />
            <Card tone="warn">
              <Row gap={2}>
                <Badge label="vinculada" tone="warn" />
              </Row>
              <Spacer h={2} />
              <Txt variant="small" muted>
                Esta transaccion esta ligada a{' '}
                {tx.debt_id
                  ? `la deuda "${tx.debt_name ?? ''}"`
                  : tx.investment_id
                    ? 'un vehiculo de ahorro'
                    : 'un gasto fijo'}
                . Editar el monto aqui descuadraria ese saldo. Si te
                equivocaste, eliminala y vuelve a registrarla desde su
                pantalla.
              </Txt>
            </Card>
          </>
        ) : null}

        <Spacer h={5} />
        <Txt variant="tiny" faint weight="700">
          CUENTA
        </Txt>
        <Spacer h={2} />
        <Row gap={2} style={{ flexWrap: 'wrap' }}>
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              color={a.color}
              active={a.id === accountId}
              onPress={() => setAccountId(a.id)}
            />
          ))}
        </Row>

        {!linked && categories.length ? (
          <>
            <Spacer h={4} />
            <Txt variant="tiny" faint weight="700">
              CATEGORIA
            </Txt>
            <Spacer h={2} />
            <Row gap={2} style={{ flexWrap: 'wrap' }}>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  emoji={c.emoji}
                  color={c.color}
                  active={c.id === categoryId}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </Row>
          </>
        ) : null}

        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          NOTA
        </Txt>
        <Spacer h={2} />
        <Card tone="alt" style={{ paddingVertical: t.space(2) }}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Sin nota"
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 14, paddingVertical: 4 }}
          />
        </Card>
        <Spacer h={2} />
      </ScrollView>

      <View
        style={{
          paddingHorizontal: t.space(5),
          paddingBottom: insets.bottom + t.space(4),
        }}
      >
        {!linked ? <Keypad value={pesos} onChange={setPesos} /> : null}
        <Spacer h={3} />
        <Button
          label="Guardar cambios"
          onPress={save}
          disabled={amount <= 0 || !accountId}
          loading={saving}
          size="lg"
        />
      </View>
    </View>
  );
}
