import fs from "fs/promises";
import { redeemCode } from "./Redeem.js";
import { loadProxies } from "./proxyManager.js";

loadProxies();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {

  let session;
  try {
    session = JSON.parse(await fs.readFile("./sessions.json", "utf8"));
    console.log("📂 Session loaded:", session);
  } catch (err) {
    console.error("❌ Gagal membaca sessions.json:", err);
    return;
  }

  while (true) {
    const res = await redeemCode(session);

    // Jika gagal fetch / gagal parse JSON
    if (!res) {
      console.log("⚠️ Tidak ada response dari server, retry...");
      await delay(3000);
      continue;
    }

    // ====== CUSTOM HANDLERS ======

    if (res.resultCode === 2108) {
      console.log("⚠️ Server responded with no stock.");
      await delay(3000);
      continue;
    }

    if (res.resultCode === 1) {
      console.log("✔️ Successfully get server Singapore");
      await delay(3000);
      continue;
    }

    // Response lain
    console.log("ℹ️ Response tidak dikenali:", res.resultCode);
    await delay(3000);

  }

})();
