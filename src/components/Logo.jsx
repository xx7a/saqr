import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_LOGO_URL = 'https://media.base44.com/images/public/6aa933d7dfc0b83e285003ae/9b05ca066_image.png';

let cachedLogoUrl = null;
let fetchPromise = null;

async function fetchLogoUrl() {
  if (cachedLogoUrl !== null) return cachedLogoUrl;
  if (fetchPromise) return fetchPromise;
  fetchPromise = base44.entities.SiteSettings.list().then((data) => {
    cachedLogoUrl = (data && data.length > 0 && data[0].logo_url) ? data[0].logo_url : DEFAULT_LOGO_URL;
    return cachedLogoUrl;
  }).catch(() => {
    cachedLogoUrl = DEFAULT_LOGO_URL;
    return cachedLogoUrl;
  });
  return fetchPromise;
}

export function refreshLogoCache() {
  cachedLogoUrl = null;
  fetchPromise = null;
}

export default function Logo({ size = 40, rounded = 'rounded-xl', className = '' }) {
  const [src, setSrc] = useState(cachedLogoUrl || DEFAULT_LOGO_URL);

  useEffect(() => {
    if (cachedLogoUrl) {
      setSrc(cachedLogoUrl);
    } else {
      fetchLogoUrl().then(setSrc);
    }
  }, []);

  return (
    <img
      src={src}
      alt="صقر - SAQR"
      className={`object-cover shrink-0 ${rounded} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}