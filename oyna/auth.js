// MergeYard web kimlik katmanı (16 Eyl 2026).
//
// Neden Godot'un içinde değil de burada: Firebase'in yönlendirmeli girişi (signInWithRedirect)
// Safari'de üçüncü taraf depolama engeli yüzünden ÇALIŞMIYOR ve oyun GitHub Pages'te barındığı
// için o engel bizde kesin devrede. Çalışan yol `signInWithPopup` ve pop-up yalnız **gerçek bir
// kullanıcı dokunuşunun içinde** açılırsa engellenmiyor. Godot canvas'ından tetiklenen bir çağrı
// o "kullanıcı etkinleştirmesi"ni kaybedebildiği için giriş düğmesi gerçek bir HTML <button>.
//
// Akış: oyun AÇILIR AÇILMAZ anonim giriş yapılır (0 dokunuş, kimse giriş ekranı görmez).
// İsteyen "İlerlemeyi kalıcı yap" düğmesiyle Google hesabını bağlar; uid aynı kalır, kayıt korunur.
// Çocuk gizliliği: giriş **isteğe bağlıdır**; hesap bağlanmadıkça ad/e-posta toplanmaz.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged, onIdTokenChanged,
  GoogleAuthProvider, linkWithPopup, signInWithPopup,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const CONFIG = {
  apiKey: "AIzaSyAGUL3mxAczc39CuyVtU1qdAHrCsaZc0tc",
  authDomain: "mergeyard-1ce7.firebaseapp.com",
  projectId: "mergeyard-1ce7",
};

// Godot bu nesneyi JavaScriptBridge ile okur. Alanlar sade tutulur (string/bool), çünkü köprü
// karmaşık nesneleri taşımaz.
const MY = {
  ready: false,      // anonim giriş tamamlandı mı
  uid: "",
  token: "",         // Firestore REST çağrıları için ID token (saatte bir yenilenir)
  anon: true,        // hesap bağlanmadıysa true
  name: "",          // yalnız hesap bağlandıysa dolar
  error: "",
};
window.MY = MY;

const app = initializeApp(CONFIG);
const auth = getAuth(app);

onIdTokenChanged(auth, async (user) => {
  if (!user) return;
  MY.uid = user.uid;
  MY.anon = user.isAnonymous;
  MY.name = user.isAnonymous ? "" : (user.displayName || "");
  try {
    MY.token = await user.getIdToken();
  } catch (e) {
    MY.error = String(e && e.code ? e.code : e);
  }
  MY.ready = true;
  updateButton();
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((e) => {
      MY.error = String(e && e.code ? e.code : e);
      MY.ready = true;   // giriş olmasa da oyun oynanır; kayıt yerelde kalır
      updateButton();
    });
  }
});

// --- "İlerlemeyi kalıcı yap" düğmesi -------------------------------------------------------
// Ekranın sağ altında küçük durur; oyunun çizimini kapatmaz. Basılınca Google hesabı anonim
// hesaba BAĞLANIR (linkWithPopup): uid değişmez, o ana kadarki ilerleme korunur.

const btn = document.createElement("button");
btn.id = "my-account";
btn.type = "button";
document.addEventListener("DOMContentLoaded", () => document.body.appendChild(btn));

const style = document.createElement("style");
style.textContent = `
/* Düğme GİRİŞ EKRANINDA, ortada ve büyük durur (kullanıcı, 16 Eyl 2026: "köşede hiç belli
   olmuyor"). Oyun başlayınca gizlenir: oynarken ekranı kapatmasın. */
#my-account{position:fixed;left:50%;transform:translateX(-50%);bottom:6%;z-index:30;border:0;
  border-radius:26px;padding:12px 20px;max-width:86vw;display:flex;align-items:center;gap:10px;
  font:600 16px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  color:#3c4043;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.35);cursor:pointer;}
#my-account svg{width:20px;height:20px;flex:0 0 20px;}
#my-account[hidden]{display:none !important;}
#my-account.bagli{background:#e8f5e2;color:#2f6b23;}`;
document.head.appendChild(style);

// Google'ın resmî dört renkli "G" işareti (marka kılavuzuna uygun: renkler ve biçim değiştirilmez).
const G_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true">' +
  '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
  '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
  '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
  '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
  '</svg>';

// Godot, giriş ekranı açıldığında/kapandığında bunu çağırır (JavaScriptBridge).
let onIntro = true;
window.MY_showAccount = (v) => { onIntro = !!v; updateButton(); };

function updateButton() {
  if (!MY.ready || !onIntro) {
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  if (MY.anon) {
    // Gerçek Google işareti (resmî dört renkli G). Kullanıcı (16 Eyl 2026): "kişi gerçekten
    // Google amblemi görsün, yalandan bir box'a tıklayıp Google ekranına gitmesin — gittiğini
    // anlasın." Metin de ne olacağını söylüyor: kaydetmek için Google hesabı açılacak.
    btn.innerHTML = G_SVG + "<span>Google ile kaydet</span>";
    btn.className = "";
  } else {
    btn.innerHTML = G_SVG + `<span>${MY.name ? MY.name : "kaydedildi"}</span>`;
    btn.className = "bagli";
  }
}

// DİKKAT: popup, click işleyicisinin İÇİNDE ve await'siz açılmalı; yoksa tarayıcı engeller.
btn.addEventListener("click", () => {
  if (!MY.anon || !auth.currentUser) return;
  const provider = new GoogleAuthProvider();
  linkWithPopup(auth.currentUser, provider).catch((err) => {
    const code = String(err && err.code ? err.code : err);
    MY.error = code;
    // Bu Google hesabı daha önce başka bir anonim kimliğe bağlandıysa: o hesaba giriş yap.
    // Kayıt bulutta uid'ye bağlı olduğu için oyuncu kendi ilerlemesini geri alır.
    if (code.includes("credential-already-in-use") || code.includes("email-already-in-use")) {
      signInWithPopup(auth, provider).catch((e2) => {
        MY.error = String(e2 && e2.code ? e2.code : e2);
      });
    }
  });
});
