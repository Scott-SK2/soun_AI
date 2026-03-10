
// Service Worker registration for faster subsequent loads
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          if (import.meta.env.DEV) {
            console.log('SW registered: ', registration);
          }
        })
        .catch((registrationError) => {
          console.error('SW registration failed: ', registrationError);
        });
    });
  }
}

// Call this in your main.tsx
