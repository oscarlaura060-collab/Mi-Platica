import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '@/theme';
import { Button, Card, Spacer, Txt } from './ui';

export function ErrorState({
  title = 'No pudimos cargar esto',
  message = 'Puede ser algo pasajero.',
  onRetry,
  retryLabel = 'Intentar de nuevo',
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDark?: boolean;
}) {
  const t = useTheme();

  return (
    <Card tone="danger" className="flex flex-col items-center text-center py-6">
      <AlertTriangle className="w-7 h-7 mb-2" style={{ color: t.danger }} />
      <Txt variant="h3" align="center">
        {title}
      </Txt>
      <Spacer h={1.5} />
      <Txt variant="small" muted align="center">
        {message}
      </Txt>
      {onRetry ? (
        <div className="mt-4">
          <Button label={retryLabel} tone="neutral" size="sm" onPress={onRetry} />
        </div>
      ) : null}
    </Card>
  );
}
