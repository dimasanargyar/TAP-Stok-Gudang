import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getDatabase, ref, set, push, remove, onValue }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// =========================
// KONFIGURASI FIREBASE
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyAXwrQEVJpDXSsWSF-QEcEtwzl08khw_YI",
  authDomain: "stok-barang-d9ea6.firebaseapp.com",
  databaseURL: "https://stok-barang-d9ea6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "stok-barang-d9ea6",
  storageBucket: "stok-barang-d9ea6.firebasestorage.app",
  messagingSenderId: "761724837703",
  appId: "1:761724837703:web:d67a7a537fd81972317662",
  measurementId: "G-VBDWX1E7H3"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// =========================
// ELEMENT DOM
// =========================
const inputNama = document.getElementById("inputNama");
const inputJumlah = document.getElementById("inputJumlah");
const inputTanggal = document.getElementById("inputTanggal");
const btnSimpan = document.getElementById("btnSimpan");
const btnResetForm = document.getElementById("btnResetForm");
const searchBar = document.getElementById("searchBar");
const tabelStokBody = document.querySelector("#tabelStok tbody");
const tabelRiwayatBody = document.querySelector("#tabelRiwayat tbody");

let stokBarang = {};
let riwayat = [];

// =========================
// SIMPAN DATA
// =========================
btnSimpan.addEventListener("click", () => {
  const nama = inputNama.value.trim();
  const jumlah = Number(inputJumlah.value);
  const tanggal = inputTanggal.value;

  if (!nama) return alert("Nama barang wajib diisi.");
  if (!tanggal) return alert("Tanggal wajib diisi.");
  if (isNaN(jumlah)) return alert("Jumlah harus angka.");

  const sisaBaru = (stokBarang[nama] || 0) + jumlah;
  if (jumlah < 0 && sisaBaru < 0) {
    return alert(`Stok tidak cukup. Stok saat ini: ${stokBarang[nama] || 0}`);
  }

  // Simpan stok (overwrite jumlah terbaru)
  set(ref(db, `stok/${nama}`), sisaBaru)
    .then(() => {
      // Simpan riwayat
      push(ref(db, "riwayat"), {
        tanggal,
        nama,
        perubahan: jumlah,
        sisa: sisaBaru
      });
      resetFormInputs();
    })
    .catch(err => console.error("Gagal menyimpan stok:", err));
});

// =========================
// RESET FORM
// =========================
btnResetForm.addEventListener("click", resetFormInputs);
function resetFormInputs() {
  inputNama.value = "";
  inputJumlah.value = "";
  inputTanggal.value = "";
}

// =========================
// RENDER STOK
// =========================
function renderStok() {
  tabelStokBody.innerHTML = "";
  Object.keys(stokBarang).sort().forEach(nama => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(nama)}</td>
      <td>${stokBarang[nama]}</td>
      <td><button class="smallBtn" data-hapus-barang="${escapeHtml(nama)}">Hapus</button></td>
    `;
    tabelStokBody.appendChild(tr);
  });

  // Event hapus stok
  document.querySelectorAll("[data-hapus-barang]").forEach(btn => {
    btn.addEventListener("click", () => {
      const namaBarang = btn.getAttribute("data-hapus-barang");
      remove(ref(db, `stok/${namaBarang}`));

      // Hapus riwayat barang tersebut
      onValue(ref(db, "riwayat"), snapshot => {
        snapshot.forEach(child => {
          if (child.val().nama === namaBarang) {
            remove(ref(db, `riwayat/${child.key}`));
          }
        });
      }, { onlyOnce: true });
    });
  });
}

// =========================
// RENDER RIWAYAT
// =========================
function renderRiwayat() {
  let data = [...riwayat];
  const key = searchBar.value.trim().toLowerCase();
  if (key) {
    data = data.filter(it => it.nama.toLowerCase().includes(key) || it.tanggal.includes(key));
  }

  tabelRiwayatBody.innerHTML = "";
  data.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${escapeHtml(it.tanggal)}</td>
      <td>${escapeHtml(it.nama)}</td>
      <td>${it.perubahan > 0 ? "+"+it.perubahan : it.perubahan}</td>
      <td>${it.sisa}</td>
      <td><button class="smallBtn" data-id="${it.id}">Hapus</button></td>
    `;
    tabelRiwayatBody.appendChild(tr);
  });

  // Event hapus riwayat
  document.querySelectorAll("#tabelRiwayat .smallBtn").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const entry = data[i];
      remove(ref(db, `riwayat/${entry.id}`));
    });
  });
}

// =========================
// LISTENER REALTIME
// =========================
onValue(ref(db, "stok"), snapshot => {
  stokBarang = snapshot.val() || {};
  renderStok();
});

onValue(ref(db, "riwayat"), snapshot => {
  const arr = [];
  snapshot.forEach(child => {
    arr.push({ id: child.key, ...child.val() });
  });
  arr.sort((a,b) => (a.tanggal < b.tanggal ? 1 : -1));
  riwayat = arr;
  renderRiwayat();
});

searchBar.addEventListener("input", renderRiwayat);

// =========================
// ESCAPE HTML
// =========================
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  })[m]);
}
