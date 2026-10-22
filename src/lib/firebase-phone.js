// SMS ile telefon doğrulaması (Firebase Phone Auth). Bu dosya yalnızca doğrulama ekranında,
// gerektiğinde yüklenir; sitenin geri kalanına Firebase eklenmez. Analytics kullanılmaz.
// Firebase'deki oturum yalnızca kod doğrulaması içindir; Google'ın verdiği kimlik belgesi (ID token)
// sunucuya gönderilir, ardından Firebase oturumu kapatılır.
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDc8aRnvYA337MGiQ-4G64yebo1qE2qgco",
  authDomain: "aquagram-tr.firebaseapp.com",
  projectId: "aquagram-tr",
  appId: "1:1043687526516:web:330f1d9366a66ee2aa0121"
};

let auth = null;
function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(initializeApp(firebaseConfig, "aquagram-phone"));
    auth.languageCode = "tr";
  }
  return auth;
}

const ERRORS = [
  [/invalid-phone-number/, "Numara geçersiz görünüyor."],
  [/too-many-requests|quota-exceeded/, "Çok fazla deneme yapıldı. Biraz sonra tekrar dene."],
  [/captcha|recaptcha/, "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar dene."],
  [/invalid-verification-code/, "Kod hatalı. Tekrar dene."],
  [/code-expired|session-expired/, "Kodun süresi doldu. Yeni kod iste."],
  [/operation-not-allowed|region|unauthorized-domain/, "SMS doğrulaması şu an kullanılamıyor. Lütfen bize bildir."],
  [/network-request-failed/, "Bağlantı kurulamadı. İnternet bağlantını kontrol et."]
];
export function phoneError(error) {
  const code = (error && (error.code || error.message)) || "";
  const hit = ERRORS.find(([re]) => re.test(code));
  return hit ? hit[1] : "SMS gönderilemedi. Biraz sonra tekrar dene.";
}

let verifier = null;
// containerId: görünmez reCAPTCHA'nın bağlanacağı boş bir öğe
export async function sendSmsCode(e164, containerId) {
  const fbAuth = getFirebaseAuth();
  if (verifier) {
    try { verifier.clear(); } catch (error) { /* yoksay */ }
    verifier = null;
  }
  verifier = new RecaptchaVerifier(fbAuth, containerId, { size: "invisible" });
  return signInWithPhoneNumber(fbAuth, e164, verifier);
}

// Kodu doğrular, Google'ın kimlik belgesini döndürür ve Firebase oturumunu kapatır
export async function confirmSmsCode(confirmation, code) {
  const credential = await confirmation.confirm(code);
  const token = await credential.user.getIdToken();
  await signOut(getFirebaseAuth()).catch(() => {});
  return token;
}
