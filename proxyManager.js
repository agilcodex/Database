import fs from "fs";

// Load proxies in format: IP:PORT:USER:PASS
let proxies = [];
let index = 0;

export function loadProxies() {
  const raw = fs.readFileSync("proxyList.txt", "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  proxies = raw.map(line => {
    const [ip, port, user, pass] = line.split(":");
    return `http://${user}:${pass}@${ip}:${port}`;
  });

  console.log(`Loaded ${proxies.length} proxies`);
}

export function getNextProxy() {
  if (proxies.length === 0) return null;

  const proxy = proxies[index];
  index = (index + 1) % proxies.length;

  return proxy;
}
