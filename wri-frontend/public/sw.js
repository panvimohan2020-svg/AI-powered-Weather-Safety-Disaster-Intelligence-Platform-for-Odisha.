// Web Push Notifications & Background Disaster Alert Worker
// Odisha Disaster Alert - Real-Time Emergency Warning Network

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { 
        title: '🚨 ODISHA DISASTER EMERGENCY ALERT', 
        body: event.data.text() 
      };
    }
  }

  const title = data.title || '🚨 ODISHA DISASTER EMERGENCY ALERT';
  const options = {
    body: data.body || 'Immediate protective action advisory issued for your district.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: data.url || '/#alerts',
      alertId: data.alertId || null,
      district: data.district || null,
      severity: data.severity || 'RED'
    },
    requireInteraction: true,
    tag: data.tag || 'odisha-emergency-alert'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

