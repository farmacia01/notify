self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: "Cakto",
      body: "Nova venda aprovada",
    };
  }

  const options = {
    body: data.body || "Nova venda aprovada",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    image: data.image || "/logo-cakto.png",
    vibrate: [200, 100, 200],
    tag: "cakto-sale",
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || "/dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Cakto",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen =
    event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
