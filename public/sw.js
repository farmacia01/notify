self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    data = {
      body: "Venda aprovada!\nSua comissão: R$ 27,41",
    };
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    tag: "evopay-sale-" + Date.now(),
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: {
      url: data.url || "/dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification("", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen =
    event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
