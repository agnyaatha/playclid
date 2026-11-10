/**
 * Per-device viewer preferences (view mode, camera, aids, skill, speed). Stored as one JSON object in localStorage,
 * exposed in the shape React's useSyncExternalStore wants. Falls back to memory when storage is unavailable.
 */
export class PrefsStore {
  private values: Record<string, unknown> = {};
  private raw = "{}";
  private loaded = false;
  private listeners = new Set<() => void>();

  constructor(private key = "sim-pool:prefs") {}

  private load() {
    this.loaded = true;
    try {
      const text = localStorage.getItem(this.key);
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          this.values = parsed;
          this.raw = text;
        }
      }
    } catch {
      /* unreadable or unavailable: keep defaults */
    }
  }

  /** The serialised preferences. The same string is returned until something changes. */
  getSnapshot = (): string => {
    if (!this.loaded) this.load();
    return this.raw;
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === this.key || e.key === null) {
        this.load();
        listener();
      }
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      this.listeners.delete(listener);
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  };

  get<T>(name: string, fallback: T): T {
    if (!this.loaded) this.load();
    return name in this.values ? (this.values[name] as T) : fallback;
  }

  set(name: string, value: unknown) {
    if (!this.loaded) this.load();
    this.values = { ...this.values, [name]: value };
    this.raw = JSON.stringify(this.values);
    try {
      localStorage.setItem(this.key, this.raw);
    } catch {
      /* storage unavailable: the preference lasts for this session only */
    }
    this.listeners.forEach((l) => l());
  }
}

export const prefsStore = new PrefsStore();
