/**
 * Reemplaza los campos de dinero sueltos por <MoneyInput> en las
 * pantallas que todavia usaban TextInput crudo.
 *
 * Se hace con un script y no a mano porque cada pantalla guarda el monto
 * como texto ('250000') y hay que cambiarla a centavos enteros: es el
 * mismo cambio repetido seis veces y conviene que sea identico en todas.
 *
 *   node scripts/apply-money-input.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const cambios = [];
const aplicar = (ruta, pasos) => {
  let s = readFileSync(ruta, 'utf8');
  const antes = s;
  for (const [de, a] of pasos) {
    if (!s.includes(de)) {
      console.log(`  AVISO no encontrado en ${ruta}:\n    ${de.slice(0, 70)}...`);
      continue;
    }
    s = s.replace(de, a);
  }
  if (s !== antes) {
    writeFileSync(ruta, s);
    cambios.push(ruta);
  }
};

const addImport = (despuesDe) => [
  despuesDe,
  `${despuesDe}\nimport { MoneyInput } from '@/components/MoneyInput';`,
];

// ------------------------------------------------------------------
// 1. TARJETA DE CREDITO — monto a pagar
// ------------------------------------------------------------------
aplicar('src/features/cards/CreditCardScreen.tsx', [
  addImport(`import { SwipeRow } from '@/components/SwipeRow';`),
  [`const [amount, setAmount] = useState('');`, `const [amount, setAmount] = useState(0);`],
  [
    `        <Card tone="alt">
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="Monto a pagar"
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 22, fontWeight: '700' }}
          />
        </Card>`,
    `        <MoneyInput
          value={amount}
          onChange={setAmount}
          size="lg"
          placeholder="Monto a pagar"
        />`,
  ],
  [`  const amountC = toCents(amount || '0');`, `  const amountC = amount;`],
  [`            setAmount('');`, `            setAmount(0);`],
]);

// ------------------------------------------------------------------
// 2. COACH — monto de la pregunta "¿puedo gastar...?"
// ------------------------------------------------------------------
aplicar('src/features/coach/CoachScreen.tsx', [
  addImport(`import { useAppStore } from '@/store/useAppStore';`),
  [`const [amount, setAmount] = useState('');`, `const [amount, setAmount] = useState(0);`],
  [
    `            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              autoFocus
              placeholder="Escribe el monto"
              placeholderTextColor={t.textFaint}
              style={{ color: t.text, fontSize: 24, fontWeight: '700' }}
            />`,
    `            <MoneyInput
              value={amount}
              onChange={setAmount}
              size="lg"
              autoFocus
              placeholder="Escribe el monto"
            />`,
  ],
  [`    setAmount('');`, `    setAmount(0);`],
  [`              setAmount('');`, `              setAmount(0);`],
  [`  const montoC = toCents(amount || '0');`, `  const montoC = amount;`],
]);

// ------------------------------------------------------------------
// 3. DEUDAS — monto financiado y cuota pactada
// ------------------------------------------------------------------
aplicar('src/features/debts/DebtFormScreen.tsx', [
  addImport(`import { Button, Card, Chip, Row, Screen, Spacer, Txt } from '@/components/ui';`),
  [`  const [principal, setPrincipal] = useState('');`, `  const [principal, setPrincipal] = useState(0);`],
  [`  const [customCuota, setCustomCuota] = useState('');`, `  const [customCuota, setCustomCuota] = useState(0);`],
  [`      setPrincipal(String(d.principal / 100));`, `      setPrincipal(d.principal);`],
  [
    `      setCustomCuota(d.installment_amount ? String(d.installment_amount / 100) : '');`,
    `      setCustomCuota(d.installment_amount ?? 0);`,
  ],
  [`  const principalC = toCents(principal || '0');`, `  const principalC = principal;`],
  [
    `    const cuota = customCuota
      ? toCents(customCuota)
      : installmentAmount(principalC, rateBp, n);`,
    `    const cuota =
      customCuota > 0 ? customCuota : installmentAmount(principalC, rateBp, n);`,
  ],
  [
    `        <Field label="MONTO DE LA DEUDA">
          <TextInput
            value={principal}
            onChangeText={setPrincipal}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 22, fontWeight: '700' }}
          />
        </Field>`,
    `        <Txt variant="tiny" faint weight="700">
          MONTO DE LA DEUDA
        </Txt>
        <Spacer h={1.5} />
        <MoneyInput value={principal} onChange={setPrincipal} size="lg" />`,
  ],
  [
    `        <Field label="CUOTA PACTADA (SI YA LA SABES)">
          <TextInput
            value={customCuota}
            onChangeText={setCustomCuota}
            keyboardType="number-pad"
            placeholder={String(Math.round(calc.cuota / 100))}
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 18 }}
          />
        </Field>`,
    `        <Txt variant="tiny" faint weight="700">
          CUOTA PACTADA (SI YA LA SABES)
        </Txt>
        <Spacer h={1.5} />
        <MoneyInput
          value={customCuota}
          onChange={setCustomCuota}
          helper={\`Si la dejas en cero, se calcula sola: \${money(calc.cuota)}.\`}
        />`,
  ],
]);

// ------------------------------------------------------------------
// 4. INVERSIONES — mover plata (aportar / retirar / rendimiento)
// ------------------------------------------------------------------
aplicar('src/features/invest/InvestmentDetailScreen.tsx', [
  addImport(`import { MoneyInput as _unused } from '@/components/MoneyInput';`),
  [`const [amount, setAmount] = useState('');`, `const [amount, setAmount] = useState(0);`],
  [
    `        <Card tone="alt">
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="Monto"
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 22, fontWeight: '700' }}
          />
        </Card>`,
    `        <MoneyInput value={amount} onChange={setAmount} size="lg" placeholder="Monto" />`,
  ],
  [`  const amountC = toCents(amount || '0');`, `  const amountC = amount;`],
  [`    setAmount('');`, `    setAmount(0);`],
]);

// ------------------------------------------------------------------
// 5. INVERSIONES — saldo actual y aporte mensual
// ------------------------------------------------------------------
aplicar('src/features/invest/InvestmentFormScreen.tsx', [
  addImport(`import { Button, Card, Chip, Row, Screen, Spacer, Txt } from '@/components/ui';`),
  [`  const [initial, setInitial] = useState('');`, `  const [initial, setInitial] = useState(0);`],
  [`  const [monthly, setMonthly] = useState('');`, `  const [monthly, setMonthly] = useState(0);`],
  [`      setInitial(String(i.initial_amount / 100));`, `      setInitial(i.initial_amount);`],
  [`      setMonthly(String(i.monthly_target / 100));`, `      setMonthly(i.monthly_target);`],
  [`  const initialC = toCents(initial || '0');`, `  const initialC = initial;`],
  [`  const monthlyC = toCents(monthly || '0');`, `  const monthlyC = monthly;`],
  [
    `            <Field label="SALDO ACTUAL">
              <TextInput
                value={initial}
                onChangeText={setInitial}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={t.textFaint}
                style={{ color: t.text, fontSize: 18 }}
              />
            </Field>`,
    `            <Txt variant="tiny" faint weight="700">
              SALDO ACTUAL
            </Txt>
            <Spacer h={1.5} />
            <MoneyInput value={initial} onChange={setInitial} />`,
  ],
  [
    `            <Field label="APORTE MENSUAL">
              <TextInput
                value={monthly}
                onChangeText={setMonthly}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={t.textFaint}
                style={{ color: t.text, fontSize: 18 }}
              />
            </Field>`,
    `            <Txt variant="tiny" faint weight="700">
              APORTE MENSUAL
            </Txt>
            <Spacer h={1.5} />
            <MoneyInput value={monthly} onChange={setMonthly} />`,
  ],
]);

// ------------------------------------------------------------------
// 6. REPARTO DE INGRESO — monto por destino
// ------------------------------------------------------------------
aplicar('src/features/quickadd/AllocateIncomeScreen.tsx', [
  addImport(`import { useAppStore } from '@/store/useAppStore';`),
  [
    `                            <View
                              style={{
                                flex: 1,
                                backgroundColor: t.cardAlt,
                                borderRadius: t.radius.sm,
                                borderWidth: 1,
                                borderColor: activo ? t.primary : t.border,
                                paddingHorizontal: 10,
                              }}
                            >
                              <TextInput
                                value={montos[d.key] ?? ''}
                                onChangeText={(x) => set(d.key, x)}
                                keyboardType="number-pad"
                                placeholder="0"
                                placeholderTextColor={t.textFaint}
                                style={{
                                  color: t.text,
                                  fontSize: 18,
                                  fontWeight: '700',
                                  paddingVertical: 8,
                                }}
                              />
                            </View>`,
    `                            <View style={{ flex: 1 }}>
                              <MoneyInput
                                value={valor(d.key)}
                                onChange={(c) => setCents(d.key, c)}
                                style={
                                  activo ? { borderColor: t.primary } : undefined
                                }
                              />
                            </View>`,
  ],
]);

console.log(`\nArchivos modificados: ${cambios.length}`);
cambios.forEach((c) => console.log(`  ${c}`));
