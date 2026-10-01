// The app is locked to light mode for now, regardless of the system's
// appearance setting - see components/Themed.tsx and constants/Colors.ts
// for the (still-present) dark palette if that ever changes.
export const useColorScheme = () => 'light' as const;
