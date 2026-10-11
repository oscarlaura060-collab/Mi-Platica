package expo.modules.notificationreader

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Atiende el boton "Descartar" de la sugerencia.
 *
 * Descartar es la UNICA accion que se resuelve sin abrir la app: no
 * cambia ningun saldo, solo saca esa notificacion de la cola para que no
 * vuelva a aparecer. Registrar, en cambio, siempre pasa por la pantalla
 * de revision.
 */
class SuggestionActionReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context?, intent: Intent?) {
    val ctx = context ?: return
    if (intent?.action != SuggestionNotifier.ACTION_DISMISS) return

    val key = intent.getStringExtra(SuggestionNotifier.EXTRA_KEY) ?: return
    FinZenNotificationListener.dismissFromQueue(ctx, key)

    ctx.getSystemService(NotificationManager::class.java)?.cancel(key.hashCode())
  }
}
