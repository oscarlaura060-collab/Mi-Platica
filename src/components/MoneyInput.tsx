import React from 'react';
import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Txt } from './ui';
import { centsToInput, formatThousands, parseMoneyInput } from '@/utils/money';

/**
 * Campo de dinero en pesos colombianos.
 *
 * Muestra los puntos de miles mientras se escribe (250.000) pero hacia
 * afuera trabaja SIEMPRE en centavos enteros: el formato es solo pintura,
 * nunca toca el valor que se guarda ni el que se calcula.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  size = 'md',
  autoFocus,
  style,
  prefix = true,
  helper,
  disabled,
}: {
  /** Valor en centavos. */
  value: number;
  onChange: (cents: number) => void;
  placeholder?: string;
  size?: 'md' | 'lg' | 'xl';
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  prefix?: boolean;
  helper?: string;
  disabled?: boolean;
}) {
  const t = useTheme();

  // El texto es estado local para que borrar no "pelee" con el formateo;
  // se resincroniza solo si el valor cambia desde fuera.
  const [text, setText] = React.useState(() => centsToInput(value));

  React.useEffect(() => {
    if (parseMoneyInput(text) !== value) setText(centsToInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const fontSize = size === 'xl' ? 38 : size === 'lg' ? 24 : 18;

  function handle(next: string) {
    const formatted = formatThousands(next);
    setText(formatted);
    onChange(parseMoneyInput(formatted));
  }

  return (
    <View>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: t.mode === 'dark' ? t.cardAlt : t.bgElevated,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: t.space(3.5),
            paddingVertical: size === 'xl' ? t.space(2) : t.space(2.5),
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {prefix ? (
          <Txt
            variant="body"
            faint
            weight="700"
            style={{ fontSize: fontSize * 0.62 }}
          >
            $
          </Txt>
        ) : null}
        <TextInput
          value={text}
          onChangeText={handle}
          keyboardType="number-pad"
          inputMode="numeric"
          autoFocus={autoFocus}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={t.textFaint}
          selectionColor={t.primary}
          style={{
            flex: 1,
            color: t.text,
            fontSize,
            fontWeight: '700',
            paddingVertical: 2,
            // En Android el TextInput trae padding propio que descuadra
            // la fila; se anula para que el "$" quede a la misma altura.
            paddingHorizontal: 0,
            textAlignVertical: 'center',
          }}
        />
      </View>
      {helper ? (
        <>
          <View style={{ height: t.space(1.5) }} />
          <Txt variant="tiny" faint>
            {helper}
          </Txt>
        </>
      ) : null}
    </View>
  );
}
