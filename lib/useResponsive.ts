/**
 * useResponsive — Shared breakpoint hook for TableBook
 *
 * Breakpoints:
 *   Mobile  < 768px   → single column, bottom nav
 *   Tablet  768-1099  → icon sidebar + 2-col grids
 *   Desktop ≥ 1100px  → full sidebar + 3-col grids
 */
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const bp: Breakpoint =
    width >= 1100 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile';

  return {
    width,
    height,
    bp,
    isMobile:  bp === 'mobile',
    isTablet:  bp === 'tablet',
    isDesktop: bp === 'desktop',
    /** Number of grid columns to use */
    cols: bp === 'desktop' ? 3 : bp === 'tablet' ? 2 : 1,
    /** Whether a permanent sidebar is shown */
    hasSidebar: bp !== 'mobile',
    /** Sidebar width (0 on mobile) */
    sidebarWidth: bp === 'desktop' ? 260 : bp === 'tablet' ? 64 : 0,
  };
}
