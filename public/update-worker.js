// Runs inside the generated worker. Never replace another open app window:
// it may contain a draft or an unresolved mutation, including an older client.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'APPLY_APP_UPDATE' || !event.ports[0]) return;
  const reply = (status) => event.ports[0].postMessage({ status });
  event.waitUntil(
    (async () => {
      try {
        const windows = (
          await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        ).filter((client) => client.url.startsWith(self.registration.scope));
        if (!event.source || windows.length !== 1 || windows[0].id !== event.source.id) {
          reply('other-windows');
          return;
        }
        reply('activating');
        await self.skipWaiting();
      } catch {
        reply('error');
      }
    })(),
  );
});
