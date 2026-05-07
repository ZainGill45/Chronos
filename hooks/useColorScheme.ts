import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' | null {
  const scheme = useRNColorScheme();
  if (scheme === 'dark') return 'dark';
  if (scheme === 'light') return 'light';
  return null;
}
