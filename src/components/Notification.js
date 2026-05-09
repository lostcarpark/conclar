import { useEffect } from "react";
import { useStoreState, useStoreActions } from "easy-peasy";

/**
 * Lightweight toast.  Reads { message, key } from the store and renders a
 * dismissable bottom-right banner that auto-clears after a few seconds.
 * The `key` field forces the auto-dismiss timer to restart whenever a new
 * message is set even if its text is identical to the previous one.
 */
const NOTIFICATION_DURATION_MS = 4500;

const Notification = () => {
  const notification = useStoreState((state) => state.notification);
  const clearNotification = useStoreActions(
    (actions) => actions.clearNotification
  );

  useEffect(() => {
    if (!notification) return undefined;
    const t = setTimeout(() => {
      clearNotification();
    }, NOTIFICATION_DURATION_MS);
    return () => clearTimeout(t);
    // re-run on each new notification (key changes for repeats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification && notification.key]);

  if (!notification) return null;

  return (
    <div
      className="toast-notification"
      role="status"
      aria-live="polite"
      onClick={() => clearNotification()}
    >
      <span className="toast-notification__message">{notification.message}</span>
      <button
        type="button"
        className="toast-notification__dismiss"
        aria-label="Dismiss notification"
        onClick={(e) => {
          e.stopPropagation();
          clearNotification();
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Notification;
