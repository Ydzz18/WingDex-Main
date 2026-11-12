import { useEffect, useState } from 'react';
import { searchEbirdSpecies, type EbirdSpecies } from '../services/ebird';

export function useEbirdSpeciesSearch(query: string) {
  const [results, setResults] = useState<EbirdSpecies[]>([]);
  const [resultQuery, setResultQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorQuery, setErrorQuery] = useState('');
  const [loadingQuery, setLoadingQuery] = useState('');
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (normalizedQuery.length < 2) return;

    let active = true;
    const timer = setTimeout(() => {
      setLoadingQuery(normalizedQuery);
      searchEbirdSpecies(normalizedQuery)
        .then((matches) => {
          if (active) {
            setResults(matches);
            setResultQuery(normalizedQuery);
            setError(null);
            setErrorQuery('');
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setResults([]);
            setError(cause instanceof Error ? cause.message : 'Could not search the eBird database.');
            setErrorQuery(normalizedQuery);
          }
        })
        .finally(() => {
          if (active) setLoadingQuery('');
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalizedQuery]);

  return {
    matches: resultQuery === normalizedQuery ? results : [],
    loading: normalizedQuery.length >= 2 && loadingQuery === normalizedQuery,
    error: errorQuery === normalizedQuery ? error : null,
  };
}
