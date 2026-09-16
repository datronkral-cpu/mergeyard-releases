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
  border-radius:26px;padding:14px 22px;max-width:86vw;
  font:600 16px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  color:#2b3444;background:rgba(255,250,240,.95);box-shadow:0 4px 18px rgba(0,0,0,.35);}
#my-account[hidden]{display:none !important;}
#my-account.bagli{background:rgba(123,182,98,.92);color:#fffaf0;}`;
document.head.appendChild(style);

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
    btn.textContent = "İlerlemeyi kalıcı yap";
    btn.className = "";
  } else {
    btn.textContent = MY.name ? `✓ ${MY.name}` : "✓ bağlandı";
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
