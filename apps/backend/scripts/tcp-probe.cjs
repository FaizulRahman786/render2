const net = require('net');

function probe(host, port, label) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, family: 6, timeout: 10000 }, () => {
      console.log(label, 'CONNECTED');
      s.destroy();
      resolve();
    });
    s.on('error', (e) => {
      console.log(label, 'ERR', e.code);
      resolve();
    });
    s.on('timeout', () => {
      console.log(label, 'TIMEOUT');
      s.destroy();
      resolve();
    });
  });
}

(async () => {
  await probe('2406:da1a:314:7101:90bb:4e2a:ab3f:6080', 5432, 'ipv6-literal-5432');
  await probe('2406:da1a:314:7101:90bb:4e2a:ab3f:6080', 6543, 'ipv6-literal-6543');
  await probe('db.sjegvuudtzmkxmxkjggu.supabase.co', 5432, 'hostname-5432');
  await probe('db.sjegvuudtzmkxmxkjggu.supabase.co', 6543, 'hostname-6543');
})();