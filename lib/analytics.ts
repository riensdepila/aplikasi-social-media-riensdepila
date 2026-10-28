export type AnalyticsEventName =
  | 'post_view'
  | 'like'
  | 'unlike'
  | 'follow'
  | 'unfollow'
  | 'save'
  | 'unsave'
  | 'comment_submit'
  | 'post_create';

export type AnalyticsProperties = Record<string, unknown>;

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties: AnalyticsProperties;
  timestamp: string;
}

const STORAGE_KEY = 'sociality_analytics';
const MAX_STORED_EVENTS = 500;

/** Records a lightweight UX event locally and notifies any in-page listeners. */
export function trackEvent(
  name: AnalyticsEventName,
  properties: AnalyticsProperties = {}
): void {
  if (typeof window === 'undefined') return;

  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    const events = Array.isArray(parsed) ? parsed : [];
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...events, event].slice(-MAX_STORED_EVENTS))
    );
  } catch {
    // Analytics must not interrupt the user's action if storage is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent<AnalyticsEvent>('sociality:analytics', { detail: event })
  );
}
