import { describe, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../../src/renderer/src/App';
import { ToastProvider } from '../../src/renderer/src/components/ToastNotification';

describe('App Render Test', () => {
  it('should render App without throwing', () => {
    // Mock window.gtdApi
    (global as any).window = {
      gtdApi: {
        getAllTasks: async () => [],
        getTrashTasks: async () => [],
        getProjects: async () => [],
        getActiveSession: async () => null,
      },
      matchMedia: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    };
    (global as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
    };

    const html = renderToString(
      React.createElement(ToastProvider, null, React.createElement(App))
    );
    console.log('RENDER SUCCESS, length:', html.length);
  });
});
