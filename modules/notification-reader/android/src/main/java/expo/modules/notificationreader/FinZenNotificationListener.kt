package expo.modules.notificationreader

import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

/**
 * Lee las notificaciones de las apps de banco / pagos y las guarda en una
 * cola local para que la app las procese cuando se abra.
 *
 * Decisiones deliberadas:
 *  - Solo se guardan notificaciones de paquetes de la lista blanca. Las de
 *    WhatsApp, correo o cualquier otra app se descartan sin tocarlas.
 *  - No se envia nada a ningun lado: la cola es un SharedPreferences
 *    privado de la app, igual de local que la base de datos.
 *  - La cola tiene tope para que no crezca sin control si el usuario no
 *    abre la app en semanas.
 */
class FinZenNotificationListener : NotificationListenerService() {

  companion object {
    const val PREFS = "miplatica_notification_queue"
    const val KEY_QUEUE = "queue"
    private const val MAX_ITEMS = 300

    /**
     * Apps cuyas notificaciones nos interesan.
     *
     * Se busca por FRAGMENTO del nombre de paquete, no por igualdad: los
     * bancos renombran y versionan sus apps (com.bancolombia.app,
     * com.todo1.mobile, com.bancolombia.personas...) y una lista exacta
     * se queda desactualizada en silencio, que es el peor fallo posible:
     * el usuario activa el permiso y no entiende por que no pasa nada.
     */
    private val WATCHED_FRAGMENTS = listOf(
      "bancolombia", "todo1",
      "nequi",
      "daviplata", "davivienda",
      "bbva",
      "bancodebogota", "bancobogota",
      "lulobank",
      "nu.production", "nubank",
      "walletnfcrel", "android.apps.wallet",  // Google Wallet
      "scotiabank", "colpatria",
      "itau",
      "avvillas", "bancoavvillas",
      "bancodeoccidente", "occidente",
      "bancocajasocial", "cajasocial",
      "falabella",
      "movii",
      "rappi.pay", "rappipay",
      "daviviendamovil",
      "popular",
      "bancamia",
      "finandina",
      "pibank",
      "ualacolombia", "uala",
      "dale.app", "com.dale",
      "tpaga",
      "powwi",
      "iris.app"
    )

    /**
     * Google Play Services manda de todo; solo nos interesa cuando el
     * texto habla de un pago. Se trata aparte para no ahogar la cola.
     */
    private const val GMS = "com.google.android.gms"

    /** ¿Tiene pinta de ser plata? ($ seguido de cifras). */
    private val MONEY = Regex("""\$\s?\d""")

    fun isWatched(pkg: String): Boolean {
      val lower = pkg.lowercase()
      return WATCHED_FRAGMENTS.any { lower.contains(it) }
    }

    fun readQueue(context: Context): JSONArray {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val raw = prefs.getString(KEY_QUEUE, "[]") ?: "[]"
      return try {
        JSONArray(raw)
      } catch (e: Exception) {
        JSONArray()
      }
    }

    fun clearQueue(context: Context) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_QUEUE, "[]")
        .apply()
    }

    /**
     * Saca una notificacion de la cola porque el usuario la descarto
     * desde el aviso, sin abrir la app.
     */
    fun dismissFromQueue(context: Context, key: String) {
      val queue = readQueue(context)
      val out = JSONArray()
      for (i in 0 until queue.length()) {
        val item = queue.optJSONObject(i) ?: continue
        if (item.optString("key") != key) out.put(item)
      }
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_QUEUE, out.toString())
        .apply()
    }

    /** Nombre legible del banco a partir del paquete. */
    fun sourceName(pkg: String): String {
      val lower = pkg.lowercase()
      val mapa = listOf(
        "daviplata" to "Daviplata",
        "davivienda" to "Davivienda",
        "bancolombia" to "Bancolombia",
        "todo1" to "Bancolombia",
        "nequi" to "Nequi",
        "bbva" to "BBVA",
        "bancodebogota" to "Banco de Bogota",
        "lulobank" to "Lulo Bank",
        "nu.production" to "Nu",
        "walletnfcrel" to "Google Wallet",
        "android.apps.wallet" to "Google Wallet",
        "android.gms" to "Google Pay",
        "colpatria" to "Colpatria",
        "scotiabank" to "Scotiabank",
        "avvillas" to "AV Villas",
        "rappi" to "RappiPay",
        "movii" to "Movii",
      )
      for ((frag, nombre) in mapa) if (lower.contains(frag)) return nombre
      return ""
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val notification = sbn ?: return
    val pkg = notification.packageName ?: return

    val deBanco = isWatched(pkg)
    val esGms = pkg == GMS
    if (!deBanco && !esGms) return

    val extras = notification.notification?.extras ?: return
    val title = extras.getCharSequence("android.title")?.toString().orEmpty()
    val text = extras.getCharSequence("android.text")?.toString().orEmpty()
    val big = extras.getCharSequence("android.bigText")?.toString().orEmpty()
    val body = if (big.isNotBlank()) big else text

    // Sin texto no hay nada que interpretar.
    if (title.isBlank() && body.isBlank()) return

    // De Google Play Services solo guardamos lo que menciona dinero.
    if (esGms && !MONEY.containsMatchIn("$title $body")) return

    val item = JSONObject().apply {
      put("key", notification.key ?: "${pkg}_${notification.postTime}")
      put("package", pkg)
      put("title", title)
      put("body", body)
      put("postedAt", notification.postTime)
    }

    val queue = readQueue(this)

    // Evita duplicados: Android reposta la misma notificacion al
    // actualizarla (por ejemplo al cambiar el texto).
    for (i in 0 until queue.length()) {
      if (queue.optJSONObject(i)?.optString("key") == item.optString("key")) return
    }

    queue.put(item)

    // Descarta las mas viejas si la cola se desborda.
    val trimmed = if (queue.length() > MAX_ITEMS) {
      JSONArray().also { out ->
        for (i in (queue.length() - MAX_ITEMS) until queue.length()) {
          out.put(queue.get(i))
        }
      }
    } else {
      queue
    }

    getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_QUEUE, trimmed.toString())
      .apply()

    // Avisa al usuario con una sugerencia que puede confirmar o descartar.
    // Si algo falla aqui no se pierde nada: la notificacion ya quedo en la
    // cola y aparecera igual al abrir la app.
    try {
      SuggestionNotifier.suggest(this, item, sourceName(pkg))
    } catch (e: Exception) {
      // Silencioso a proposito: un fallo mostrando el aviso no debe
      // tumbar el servicio que lee las notificaciones.
    }
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    // No interesa: lo que importa es que llego, no que el usuario la cerro.
  }
}
