const os = require('os');

function getLanAddresses(port = process.env.PORT || 3000) {
  const urls = [];
  const ifaces = os.networkInterfaces();

  Object.values(ifaces).forEach((entries) => {
    (entries || []).forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        urls.push(`http://${iface.address}:${port}`);
      }
    });
  });

  return [...new Set(urls)];
}

module.exports = { getLanAddresses };
