"use client";

import { useEffect, useRef, useState } from "react";

interface VenueAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const inputCls =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
    __gmapsLoading?: boolean;
    __gmapsLoaded?: boolean;
    __gmapsCallbacks?: (() => void)[];
  }
}

function loadGoogleMapsScript(apiKey: string, callback: () => void) {
  if (typeof window === "undefined") return;

  if (window.__gmapsLoaded && window.google?.maps?.places) {
    callback();
    return;
  }

  if (!window.__gmapsCallbacks) {
    window.__gmapsCallbacks = [];
  }
  window.__gmapsCallbacks.push(callback);

  if (window.__gmapsLoading) return;
  window.__gmapsLoading = true;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    window.__gmapsLoaded = true;
    window.__gmapsLoading = false;
    const callbacks = window.__gmapsCallbacks ?? [];
    window.__gmapsCallbacks = [];
    callbacks.forEach((cb) => cb());
  };
  script.onerror = () => {
    window.__gmapsLoading = false;
  };
  document.head.appendChild(script);
}

export function VenueAutocomplete({
  value,
  onChange,
  placeholder,
  className,
}: VenueAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    loadGoogleMapsScript(apiKey, () => {
      setReady(true);
    });
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places?.Autocomplete) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const autocomplete = new (window.google.maps.places.Autocomplete as any)(
      inputRef.current,
      { types: ["establishment", "geocode"] }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place?.formatted_address) {
        onChange(place.formatted_address);
      } else if (place?.name) {
        onChange(place.name);
      }
    });

    autocompleteRef.current = autocomplete;
  }, [ready, onChange]);

  const combinedCls = [inputCls, className].filter(Boolean).join(" ");

  // No API key — render plain input
  if (!apiKey) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={combinedCls}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={combinedCls}
    />
  );
}
