import React from 'react';
import { View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Button, Card, Spacer, Txt } from './ui';

/**
 * Error recuperable. Siempre ofrece una salida: nunca se deja al usuario
 * mirando un mensaje sin poder hacer nada.
 */
export function ErrorState({
  title = 'No pudimos cargar esto',
  message = 'Puede ser algo pasajero.',
  onRetry,
  retryLabel = 'Intentar de nuevo',
  onDark,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDark?: boolean;
}) {
  const t = useTheme();

  return (
    <Card tone="danger" style={{ alignItems: 'center', paddingVertical: t.space(6) }}>
      <TriangleAlert size={28} color={t.danger} strokeWidth={2} />
      <Spacer h={2.5} />
      <Txt variant="h3" align="center">
        {title}
      </Txt>
      <Spacer h={1.5} />
      <Txt variant="small" muted align="center">
        {message}
      </Txt>
      {onRetry ? (
        <>
          <Spacer h={4} />
          <Button label={retryLabel} tone="neutral" size="sm" onPress={onRetry} />
        </>
      ) : null}
    </Card>
  );
}
