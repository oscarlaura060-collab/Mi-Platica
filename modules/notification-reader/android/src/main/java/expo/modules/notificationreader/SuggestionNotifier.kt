package expo.modules.notificationreader

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONObject

/**
 * Emite la sugerencia "¿Quieres registrar este gasto?" cuando el banco
 * manda una notificacion de movimiento.
 *
 * Decisiones importantes:
 *  - La sugerencia NUNCA registra nada. Tocarla abre la app en la
 *    pantalla de revision; solo el usuario confirma.
 *  - El boton "Descartar" si actua sin abrir la app, porque descartar no
 *    tiene consecuencias sobre las finanzas.
 *  - El parseo del monto aqui es a proposito mas simple que el de
 *    JavaScript: solo sirve para redactar el aviso. El dato que vale es
 *    el que la app vuelve a interpretar al abrirse.
 */
object SuggestionNotifier {

  const val CHANNEL_ID = "movimientos_detectados"
  const val ACTION_DISMISS = "expo.modules.notificationreader.DISMISS"
  const val EXTRA_KEY = "notif_key"

  /** Montos en formato colombiano: $ 1.234.567 o $1,234,567.89 */
  private val MONEY = Regex("""\$\s?([\d][\d.,]*)""")

  private val INGRESO = Regex(
    "(recibiste|te consign|consignaci|abono|recibido|te enviaron|transferencia recibida|dep[oó]sito|deposito|nomina|n[oó]mina)",
    RegexOption.IGNORE_CASE,
  )
  private val GASTO = Regex(
    "(compra|pago|pagaste|cobro|d[eé]bito|debito|retiro|retiraste|avance|cargo|enviaste|transferiste)",
    RegexOption.IGNORE_CASE,
  )
  private val RECHAZO = Regex(
    "(rechaz|declinad|fallid|no fue posible|insuficient|cancelad|intento)",
    RegexOption.IGNORE_CASE,
  )

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Movimientos detectados",
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = "Sugerencias para registrar lo que detectamos de tu banco"
      setShowBadge(true)
    }
    manager.createNotificationChannel(channel)
  }

  /** Separa los miles para que el aviso se lea como en la app. */
  private fun formatMoney(raw: String): String {
    val digits = raw.replace(Regex("""[^\d]"""), "").trimStart('0')
    if (digits.isEmpty()) return raw
    // Si trae decimales pegados al final se ignoran: en COP no se usan.
    val entero = if (digits.length > 2 && raw.contains(Regex(""",\d{2}$|\.\d{2}$"""))) {
      digits.dropLast(2)
    } else {
      digits
    }
    return "$" + entero.reversed().chunked(3).joinToString(".").reversed()
  }

  /**
   * Decide si la notificacion merece una sugerencia y la emite.
   * Devuelve true si se mostro algo.
   */
  fun suggest(context: Context, item: JSONObject, sourceName: String): Boolean {
    val title = item.optString("title")
    val body = item.optString("body")
    val text = "$title $body"

    // Una operacion rechazada no movio plata.
    if (RECHAZO.containsMatchIn(text)) return false

    val match = MONEY.find(text) ?: return false
    val monto = formatMoney(match.groupValues[1])

    val esIngreso = INGRESO.containsMatchIn(text)
    val esGasto = GASTO.containsMatchIn(text)
    if (!esIngreso && !esGasto) return false

    val key = item.optString("key")
    val pregunta =
      if (esIngreso) "¿Quieres registrar este ingreso?"
      else "¿Quieres registrar este gasto?"

    ensureChannel(context)

    // Tocar la notificacion abre la app en la pantalla de revision.
    val abrir = Intent(Intent.ACTION_VIEW, Uri.parse("miplatica://detected")).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      setPackage(context.packageName)
    }
    val abrirPending = PendingIntent.getActivity(
      context,
      key.hashCode(),
      abrir,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    // Descartar no abre nada: solo marca y cierra el aviso.
    val descartar = Intent(context, SuggestionActionReceiver::class.java).apply {
      action = ACTION_DISMISS
      putExtra(EXTRA_KEY, key)
    }
    val descartarPending = PendingIntent.getBroadcast(
      context,
      key.hashCode() + 1,
      descartar,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val icono = context.resources.getIdentifier(
      "notification_icon", "drawable", context.packageName,
    ).takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info

    val detalle = buildString {
      append(monto)
      if (sourceName.isNotBlank()) append(" · ").append(sourceName)
    }

    val notif = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(icono)
      .setColor(0xFF1CBBCE.toInt())
      .setContentTitle(pregunta)
      .setContentText(detalle)
      .setStyle(NotificationCompat.BigTextStyle().bigText("$detalle\n\nToca para revisarlo y confirmarlo."))
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true)
      .setContentIntent(abrirPending)
      .addAction(icono, if (esIngreso) "Registrar ingreso" else "Registrar gasto", abrirPending)
      .addAction(icono, "Descartar", descartarPending)
      .build()

    val manager = context.getSystemService(NotificationManager::class.java) ?: return false
    manager.notify(key.hashCode(), notif)
    return true
  }
}
