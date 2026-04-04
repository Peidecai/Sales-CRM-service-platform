/**
 * Type helpers for Plus Android/iOS bridge APIs.
 *
 * plus.android.importClass() returns PlusAndroidClassObject which lacks
 * construct signatures and method definitions — the actual shape depends
 * on the imported Java class. These interfaces provide the subset we use.
 */

/* eslint-disable @typescript-eslint/no-empty-object-type */

/** Android Intent class bridge */
interface AndroidIntentClass {
  new (action: string, uri: AndroidUriInstance): AndroidIntentInstance
  ACTION_CALL: string
}

interface AndroidIntentInstance {
  putExtra(name: string, value: unknown): void
}

/** Android Uri class bridge */
interface AndroidUriClass {
  parse(uriString: string): AndroidUriInstance
}

interface AndroidUriInstance {}

/** Android SubscriptionManager class bridge */
interface AndroidSubscriptionManagerClass {
  from(context: unknown): AndroidSubscriptionManagerInstance | null
}

interface AndroidSubscriptionManagerInstance {
  getActiveSubscriptionInfoList(): AndroidListInstance | null
}

/** Android Context class bridge */
interface AndroidContextClass {
  TELEPHONY_SERVICE: string
}

/** Android list-like object */
interface AndroidListInstance {
  size(): number
  get(index: number): Record<string, unknown>
}

/** Android Activity bridge */
interface AndroidActivityInstance {
  startActivity(intent: AndroidIntentInstance): void
  getSystemService(name: string): unknown
}
