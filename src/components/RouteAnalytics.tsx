import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/engineAnalytics';

/**
 * Records a page_view on every route change and a page_exit (with dwell time)
 * when the user leaves the route, the tab is hidden, or the page unloads.
 */
export default function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    const flush = trackPageView(location.pathname + location.search);

    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);

    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [location.pathname, location.search]);

  return null;
}
