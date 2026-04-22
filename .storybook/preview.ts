import type { Preview } from '@storybook/react';
import '../src/ui/styles/tokens.css';
import '../src/ui/styles/mobile-first.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'lifetycoon',
      values: [
        { name: 'lifetycoon', value: '#faf7f2' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '390px', height: '844px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
      },
      defaultViewport: 'mobile',
    },
  },
};

export default preview;
