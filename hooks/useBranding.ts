import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { logoSrc as defaultLogo } from '../assets/logo';

export const useBranding = () => {
  const [logoUrl, setLogoUrl] = useState(defaultLogo);
  const [appName, setAppName] = useState('LurnX');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const brandingRef = ref(db, 'settings/branding');
    const unsubscribe = onValue(brandingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.appName) setAppName(data.appName);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { logoUrl, appName, loading };
};