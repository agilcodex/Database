// login.js
import axios from "axios";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// ===============================
// CONFIG
// ===============================
const configPath = path.join("./config.json");
const configRaw = await fs.readFile(configPath, "utf8");
const config = JSON.parse(configRaw);

const email = config.email;
const password = config.password;

const BASE = "https://twplay.redfinger.com";
const versionName = "2.48.22";
const versionCode = "24822";
const lang = "en";
const client = "web";
const channelCode = "webgp";
const serverNode = "sgp1";

// ===============================
// HELPERS
// ===============================
function uuid(len = 40) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function genToken(uid, password, signKey) {
  return md5(md5(uid + "##" + password) + signKey);
}

function encPwd(password, rsaKey) {
  const json = JSON.stringify({ userPwd: password, timestamp: Date.now().toString() });
  const pem = `-----BEGIN PUBLIC KEY-----\n${rsaKey}\n-----END PUBLIC KEY-----`;
  return crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(json)
  ).toString("base64");
}

// ===============================
// BUILD QUERY STRING
// ===============================
async function createQuery(path, bodyString) {
  const timestamp = Date.now().toString();
  const fullQuery =
    `lang=${lang}&client=${client}&uuid=${uuid()}&versionName=${versionName}` +
    `&versionCode=${versionCode}&languageType=${lang}&sessionId=&userId=&channelCode=${channelCode}&serverNode=${serverNode}&timestamp=${timestamp}`;
  const sign = md5(fullQuery + bodyString);
  return `${path}?${fullQuery}&sign=${sign}`;
}

// ===============================
// SEND REQUEST
// ===============================
async function sendRequest(url, headersExtra = {}, postData = null) {
  const res = await axios({
    url: BASE + url,
    method: postData ? "POST" : "GET",
    data: postData ?? null,
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...headersExtra },
    timeout: 15000,
  });
  return res.data;
}

// ===============================
// LOGIN FLOW
// ===============================
async function getKey(email) {
  const body = `userName=${email}`;
  const q = await createQuery("/osfingerlogin/user/getKey.html", body);
  return await sendRequest(q, {}, body);
}

async function login(email, password) {
  console.log("📡 GET KEY...");
  const keyRes = await getKey(email);

  if (!keyRes.resultInfo?.rsaPubKey || !keyRes.resultInfo.signKey || !keyRes.resultInfo.userId) {
    console.log("❌ getKey gagal:", keyRes);
    return null;
  }

  const uid = keyRes.resultInfo.userId;
  const rsaKey = keyRes.resultInfo.rsaPubKey;
  const signKey = keyRes.resultInfo.signKey;

  console.log("✔ RSA key OK");

  const token = genToken(uid, password, signKey);
  const cu = encPwd(password, rsaKey);
  const rsaPubKeyMd5 = md5(rsaKey);

  const postData = new URLSearchParams({
    userName: email,
    token,
    deviceLockCode: "",
    externalCode: "",
    newUserPwd: cu,
    rsaPubKeyMd5
  }).toString();

  const q = await createQuery("/osfingerlogin/user/v2/getUser.html", postData);
  console.log("📡 LOGIN...");
  const loginRes = await sendRequest(q, { aid: "200013" }, postData);
  return loginRes;
}

// ===============================
// SAVE SESSION
// ===============================
async function saveSession(session) {
  await fs.writeFile(path.join("./sessions.json"), JSON.stringify(session, null, 2), "utf8");
  console.log("✔ Session saved to sessions.json");
}

// ===============================
// RUN
// ===============================
(async () => {
  const res = await login(email, password);
  if (!res?.resultInfo?.session) {
    console.log("❌ Login gagal, session tidak dibuat");
    return;
  }

  const session = {
    uuid: res.resultInfo.uuid,
    sessionId: res.resultInfo.session,
    userId: res.resultInfo.userId,
    email
  };

  await saveSession(session);
})();
