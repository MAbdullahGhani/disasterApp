import { useState, useEffect, useCallback } from "react";

// --- Type Definition ---
type CitySuggestion = {
  id?: number;
  name: string;
  country?: string;
  [key: string]: any;
};

// --- Custom Hook for Debounced City Search ---
const useDebouncedSearch = (query: string) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);

  // Use useCallback to prevent this function from being recreated on every render
  const fetchCitySuggestions = useCallback(async (searchQuery: string) => {
    // Don't search for very short or empty strings
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    console.log("Fetching city suggestions for:", searchQuery);
    setLoading(true);

    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchQuery
        )}&count=5&language=en&format=json`
      );
      const data = await res.json();
      
      if (data.results) {
        setSuggestions(data.results);
      } else {
        setSuggestions([]); // Clear suggestions if API returns no results
      }
    } catch (error) {
      console.error("City suggestion error:", error);
      // It's good practice to clear suggestions on error as well
      setSuggestions([]);
    } finally {
      // Use finally to ensure loading is always set to false
      setLoading(false);
    }
  }, []); // The empty dependency array is fine here as state setters are stable

  // This useEffect handles the debouncing logic
  useEffect(() => {
    // Set up a timer. The API call will run after 500ms of inactivity.
    const timerId = setTimeout(() => {
      fetchCitySuggestions(query);
    }, 500);

    // This is the cleanup function. It runs when `query` changes,
    // cancelling the previous timer before starting a new one.
    return () => {
      clearTimeout(timerId);
    };
  }, [query, fetchCitySuggestions]); // Re-run effect when query or the function changes

  // This is the correct return statement for the custom hook
  return { suggestions, loading };
};

export default useDebouncedSearch;