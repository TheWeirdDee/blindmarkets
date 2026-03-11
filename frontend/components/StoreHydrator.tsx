'use client';

import { useEffect } from 'react';
import { useIntentStore } from '../state/useIntentStore';

export default function StoreHydrator() {
  useEffect(() => {
    useIntentStore.persist.rehydrate();
  }, []);

  return null;
}
