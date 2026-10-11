package expo.modules.notificationreader

import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Puente entre el servicio lector de notificaciones y el JavaScript.
 *
 * Solo expone lectura de la cola local y el atajo a los Ajustes del
 * sistema: el permiso lo concede el usuario, nunca la app.
 */
class NotificationReaderModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context no disponible" }

  override fun definition() = ModuleDefinition {
    Name("NotificationReader")

    /** ¿El usuario ya nos dio acceso a las notificaciones? */
    Function("isEnabled") {
      val enabled = Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
      ) ?: ""
      enabled.contains(context.packageName)
    }

    /** Abre la pantalla del sistema donde se concede el permiso. */
    Function("openSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /** Devuelve la cola capturada como JSON (string, para no copiar objetos). */
    Function("getPending") {
      FinZenNotificationListener.readQueue(context).toString()
    }

    /** La app llama esto cuando ya proceso la cola. */
    Function("clearPending") {
      FinZenNotificationListener.clearQueue(context)
    }
  }
}
