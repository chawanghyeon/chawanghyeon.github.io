import { useState, useEffect } from 'react';

/**
 * Custom hook to handle client-side only rendering
 * This prevents hydration mismatches by ensuring the component
 * only renders on the client after hydration is complete
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
