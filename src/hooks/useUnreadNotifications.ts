import {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {getUnreadNotificationCount} from '../Server/Notifications/NotificationsApi';

/**
 * The bell badge: the signed-in user's unread notification count.
 *
 * It is re-read every time the screen using it comes back into focus, so
 * returning from the notifications list (where rows get marked read) updates
 * it. The badge is only a hint — a failed read keeps the last known count
 * instead of surfacing an error.
 */
export function useUnreadNotifications(): {
  count: number;
  refresh: () => Promise<void>;
} {
  const [count, setCount] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await getUnreadNotificationCount();
      if (mounted.current) setCount(next);
    } catch {
      /* a hint only — keep the last count */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return {count, refresh};
}

/** "3", or "99+" once the count stops fitting the badge. */
export const unreadBadgeLabel = (count: number): string =>
  count > 99 ? '99+' : String(count);
