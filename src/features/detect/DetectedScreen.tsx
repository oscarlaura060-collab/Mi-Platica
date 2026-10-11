import React, { useCallback, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { SwipeRow } from '@/components/SwipeRow';
import { useAppStore } from '@/store/useAppStore';
import {
  confirmDetected,
  ignoreAllPending,
  ignoreDetected,
  ingestNotifications,
  listDetected,
  type DetectedRow,
} from '@/db/repositories/detected';
import { listCategories } from '@/db/repositories/categories';
import { isEnabled, isSupported, openSettings } from '../../../modules/notification-reader';
import { money } from '@/utils/money';
import { format } from '@/utils/date';
import { es } from 'date-fns/locale';
import type { Category } from '@/db/types';
import type { RootNav } from '@/app/navigation/types';

/**
 * MOVIMIENTOS DETECTADOS
 * Lee las notificaciones del banco y propone los movimientos. El usuario
 * confirma: nada entra solo a sus finanzas.
 */
export function DetectedScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { accounts, refresh } = useAppStore();

  const [rows, setRows] = useState<DetectedRow[]>([]);
  const [permiso, setPermiso] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [elegido, setElegido] = useState<Record<number, number>>({});
  const [cuenta, setCuenta] = useState<Record<number, number>>({});
  const [elegidoTipo, setElegidoTipo] = useState<
    Record<number, 'expense' | 'income'>
  >({});

  const load = useCallback(async () => {
    setPermiso(isSupported && isEnabled());
    await ingestNotifications();
    const [list, categorias] = await Promise.all([
      listDetected('pending'),
      listCategories('expense'),
    ]);
    setRows(list);
    setCats(categorias);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function confirmar(r: DetectedRow) {
    const accountId = cuenta[r.id] ?? accounts[0]?.id;
    if (!accountId) {
      return Alert.alert('Sin cuentas', 'Crea una cuenta primero.');
    }
    const tipo = elegidoTipo[r.id] ?? (r.kind === 'income' ? 'income' : 'expense');
    await confirmDetected({
      id: r.id,
      accountId,
      categoryId: tipo === 'expense' ? (elegido[r.id] ?? null) : null,
      kind: tipo,
    });
    await Promise.all([load(), refresh()]);
  }

  // ------------------------------------------------------------------
  if (!isSupported) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
        <Screen>
          <Txt variant="h2">Deteccion automatica</Txt>
          <Spacer h={4} />
          <Card tone="warn">
            <Txt variant="small" muted>
              Esta funcion solo existe en Android. iOS no deja que una app
              lea las notificaciones de otras.
            </Txt>
          </Card>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Txt variant="h2">Movimientos detectados</Txt>
        <Spacer h={1} />
        <Txt variant="small" muted>
          Leidos de las notificaciones de tu banco.
        </Txt>

        {/* PERMISO */}
        {!permiso ? (
          <>
            <Spacer h={4} />
            <Card tone="info">
              <Txt variant="h3">Falta activar el permiso</Txt>
              <Spacer h={2} />
              <Txt variant="small" muted>
                Android exige que TU actives el acceso a notificaciones a
                mano; ninguna app puede hacerlo sola. Al tocar el boton se
                abre la pantalla del sistema: busca Mi Platica y activalo.
              </Txt>
              <Spacer h={3} />
              <Button
                label="Abrir ajustes de Android"
                onPress={() => {
                  try {
                    openSettings();
                  } catch {
                    Linking.openSettings();
                  }
                }}
              />
              <Spacer h={3} />
              <Txt variant="tiny" faint>
                Lo que se lee se queda en el telefono: se guarda en la misma
                base local que el resto de tus datos y no sale a ningun
                servidor. Solo se miran las notificaciones de apps de bancos
                y billeteras; las de WhatsApp, correo y demas se descartan
                sin tocarlas.
              </Txt>
            </Card>
          </>
        ) : null}

        {permiso ? (
          <>
            <Spacer h={4} />
            <Row gap={2}>
              <Badge label="permiso activo" tone="ok" />
              <Badge label={`${rows.length} por revisar`} tone="info" />
            </Row>
          </>
        ) : null}

        {/* LISTA */}
        <Spacer h={5} />
        <SectionTitle
          title="Por confirmar"
          action={rows.length ? 'Ignorar todo' : undefined}
          onAction={() =>
            Alert.alert('Ignorar todo', `¿Descartar los ${rows.length} detectados?`, [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Ignorar',
                style: 'destructive',
                onPress: async () => {
                  await ignoreAllPending();
                  await load();
                },
              },
            ])
          }
        />

        {rows.length ? (
          rows.map((r) => {
            const tipo =
              elegidoTipo[r.id] ?? (r.kind === 'income' ? 'income' : 'expense');
            const esIngreso = tipo === 'income';
            const dudoso = r.kind === 'unknown';
            const accountId = cuenta[r.id] ?? accounts[0]?.id;
            return (
              <View key={r.id} style={{ marginBottom: t.space(3) }}>
                <SwipeRow
                  deleteLabel="Ignorar"
                  onDelete={async () => {
                    await ignoreDetected(r.id);
                    await load();
                  }}
                >
                  <Card tone={esIngreso ? 'primary' : 'default'}>
                    <Row justify="space-between" align="flex-start" gap={2}>
                      <View style={{ flex: 1 }}>
                        <Txt variant="body" numberOfLines={1}>
                          {r.merchant ?? (esIngreso ? 'Ingreso' : 'Compra')}
                        </Txt>
                        <Spacer h={1} />
                        <Row gap={2} style={{ flexWrap: 'wrap' }}>
                          <Txt variant="tiny" faint>
                            {r.source} ·{' '}
                            {format(new Date(r.posted_at), "d LLL HH:mm", { locale: es })}
                          </Txt>
                          {dudoso ? (
                            <Badge label="no se si entro o salio" tone="warn" />
                          ) : r.confidence < 60 ? (
                            <Badge label="revisa el monto" tone="warn" />
                          ) : null}
                        </Row>
                      </View>
                      <Txt
                        variant="h3"
                        numberOfLines={1}
                        color={esIngreso ? t.primary : t.text}
                      >
                        {esIngreso ? '+' : '-'} {money(r.amount)}
                      </Txt>
                    </Row>

                    {r.raw_body ? (
                      <>
                        <Spacer h={2} />
                        <Txt variant="tiny" faint numberOfLines={2}>
                          "{r.raw_body}"
                        </Txt>
                      </>
                    ) : null}

                    {/* Tipo: siempre editable, porque el parser puede
                        equivocarse y el usuario sabe que fue. */}
                    <Spacer h={3} />
                    <Txt variant="tiny" faint weight="700">
                      ¿QUE FUE?
                    </Txt>
                    <Spacer h={1.5} />
                    <Row gap={2}>
                      <Chip
                        label="Gasto"
                        color={t.danger}
                        active={!esIngreso}
                        onPress={() =>
                          setElegidoTipo((p) => ({ ...p, [r.id]: 'expense' }))
                        }
                      />
                      <Chip
                        label="Ingreso"
                        color={t.primary}
                        active={esIngreso}
                        onPress={() =>
                          setElegidoTipo((p) => ({ ...p, [r.id]: 'income' }))
                        }
                      />
                    </Row>

                    {/* Cuenta */}
                    <Spacer h={3} />
                    <Txt variant="tiny" faint weight="700">
                      CUENTA
                    </Txt>
                    <Spacer h={1.5} />
                    <Row gap={2} style={{ flexWrap: 'wrap' }}>
                      {accounts.map((a) => (
                        <Chip
                          key={a.id}
                          label={a.name}
                          color={a.color}
                          active={a.id === accountId}
                          onPress={() => setCuenta((p) => ({ ...p, [r.id]: a.id }))}
                        />
                      ))}
                    </Row>

                    {/* Categoria solo para gastos */}
                    {!esIngreso && cats.length ? (
                      <>
                        <Spacer h={3} />
                        <Txt variant="tiny" faint weight="700">
                          CATEGORIA
                        </Txt>
                        <Spacer h={1.5} />
                        <Row gap={2} style={{ flexWrap: 'wrap' }}>
                          {cats.slice(0, 8).map((c) => (
                            <Chip
                              key={c.id}
                              label={c.name}
                              emoji={c.emoji}
                              color={c.color}
                              active={elegido[r.id] === c.id}
                              onPress={() =>
                                setElegido((p) => ({ ...p, [r.id]: c.id }))
                              }
                            />
                          ))}
                        </Row>
                      </>
                    ) : null}

                    <Spacer h={3} />
                    <Button
                      label="Confirmar y registrar"
                      size="sm"
                      onPress={() => confirmar(r)}
                    />
                  </Card>
                </SwipeRow>
              </View>
            );
          })
        ) : (
          <EmptyState
            title={permiso ? 'Nada por revisar' : 'Sin movimientos detectados'}
            subtitle={
              permiso
                ? 'Cuando llegue una notificacion de tu banco o de Google Wallet, aparecera aqui para que la confirmes.'
                : 'Activa el permiso arriba para empezar a detectarlos.'
            }
          />
        )}

        <Spacer h={5} />
        <Card tone="alt">
          <Txt variant="tiny" faint weight="700">
            POR QUE NO SE REGISTRA SOLO
          </Txt>
          <Spacer h={2} />
          <Txt variant="small" muted>
            Los bancos cambian el texto de sus notificaciones sin avisar. Si
            la app registrara sola, un cambio de formato llenaria tus
            finanzas de datos errados sin que te enteres. Por eso propone y
            tu confirmas: dos toques, pero nunca un numero inventado.
          </Txt>
        </Card>
      </Screen>
    </View>
  );
}
