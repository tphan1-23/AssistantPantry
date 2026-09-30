// Warm "fall brown" palette used for primary buttons/accents across the app,
// regardless of light/dark mode (a solid brown button reads fine on both).
export const BRAND_COLOR = '#8B5E3C';
export const BRAND_COLOR_MUTED = '#C9986B';

const tintColorLight = BRAND_COLOR;
const tintColorDark = '#E3B98C';

export default {
  light: {
    text: '#3A2418',
    background: '#FAF3EA',
    tint: tintColorLight,
    tabIconDefault: '#B8A48D',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F1E4D4',
    background: '#241A13',
    tint: tintColorDark,
    tabIconDefault: '#8A7360',
    tabIconSelected: tintColorDark,
  },
};
