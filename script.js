import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getDatabase, ref, set, push, remove, onValue }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

/* =========================
   KONFIGURASI FIREBASE
   ========================= */
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
try { getAnalytics(app); } catch (_) {}
const db = getDatabase(app);

/* =========================
   AMBIL ELEMEN DOM
   ========================= */
const inputNama = document.getElementById("inputNama");
const inputJumlah = document.getElementById("inputJumlah");
const inputTanggal = document.getElementById("inputTanggal");
const btnSimpan = document.getElementById("btnSimpan");
const btnResetForm = document.getElementById("btnResetForm");

const searchBar = document.getElementById("searchBar");
const tabelStokBody = document.querySelector("#tabelStok tbody");
const tabelRiwayatBody = document.querySelector("#tabelRiwayat tbody");
const btnExportStok = document.getElementById("btnExportStok");
const btnExportRiwayat = document.getElementById("btnExportRiwayat");

const loginOverlay = document.getElementById("loginOverlay");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const btnLogin = document.getElementById("btnLogin");
const statusLogin = document.getElementById("statusLogin");

/* =========================
   LOGIN ADMIN TANPA CACHE
   ========================= */
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "password123";
let isAdmin = false; // selalu false saat load

function updateGuard() {
  btnSimpan.disabled = !isAdmin;
  btnResetForm.disabled = !isAdmin;
  statusLogin.textContent = isAdmin ? "Mode: Admin" : "Mode: Read-Only";

  // Update tombol Edit/Hapus pada stok dan riwayat
  document.querySelectorAll("[data-edit]").forEach(btn => btn.disabled = !isAdmin);
  document.querySelectorAll("[data-hapus]").forEach(btn => btn.disabled = !isAdmin);
}

function showOverlay() {
  loginOverlay.classList.remove("hidden");
  loginOverlay.style.display = "grid";
  loginUser.focus(); // fokus ke username
}
function hideOverlay() {
  loginOverlay.classList.add("hidden");
  loginOverlay.style.display = "none";
}

(function initLogin() {
  // Overlay login selalu muncul saat load
  showOverlay();
  updateGuard();

  btnLogin.addEventListener("click", () => {
    const u = (loginUser.value || "").trim();
    const p = (loginPass.value || "").trim();
    if (u === DEFAULT_USERNAME && p === DEFAULT_PASSWORD) {
      isAdmin = true;
      updateGuard();
      hideOverlay();
    } else {
      alert("Username/Password salah.");
    }
  });
})();

/* =========================
   STATE
   ========================= */
let stokBarang = {};
let riwayat = [];

/* =========================
   UTIL
   ========================= */
function todayYMD() {
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"']/g, m => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[m]));
}
function guardAction() {
  if (!isAdmin) { alert("Aksi ini memerlukan login admin."); return false; }
  return true;
}

/* =========================
   SIMPAN (+/-)
   ========================= */
btnSimpan.addEventListener("click", () => {
  if (!guardAction()) return;

  const nama = inputNama.value.trim();
  const jumlah = Number(inputJumlah.value);
  const tanggal = inputTanggal.value || todayYMD();

  if (!nama) return alert("Nama barang wajib diisi.");
  if (isNaN(jumlah)) return alert("Jumlah harus angka.");
  if (!tanggal) return alert("Tanggal wajib diisi.");

  const sisaBaru = (stokBarang[nama] || 0) + jumlah;
  if (jumlah < 0 && sisaBaru < 0) return alert(`Stok tidak cukup. Stok saat ini: ${stokBarang[nama] || 0}`);

  set(ref(db, `stok/${nama}`), sisaBaru)
    .then(() => push(ref(db, "riwayat"), { tanggal, nama, perubahan: jumlah, sisa: sisaBaru }))
    .then(() => { inputNama.value = ""; inputJumlah.value = ""; inputTanggal.value = ""; })
    .catch(err => console.error("❌ Gagal menyimpan:", err));
});

btnResetForm.addEventListener("click", () => {
  inputNama.value = "";
  inputJumlah.value = "";
  inputTanggal.value = "";
});

/* =========================
   RENDER STOK & RIWAYAT
   ========================= */
function renderStok() {
  tabelStokBody.innerHTML = "";
  const names = Object.keys(stokBarang || {}).sort();
  if (!names.length) {
    tabelStokBody.innerHTML = `<tr><td colspan="4">Tidak ada stok</td></tr>`;
    return;
  }

  names.forEach((nama, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(nama)}</td>
      <td>${stokBarang[nama]}</td>
      <td>
        <button class="smallBtn warning" data-edit="${escapeHtml(nama)}" ${!isAdmin ? "disabled" : ""}>Edit</button>
        <button class="smallBtn danger" data-hapus="${escapeHtml(nama)}" ${!isAdmin ? "disabled" : ""}>Hapus</button>
      </td>
    `;
    tabelStokBody.appendChild(tr);
  });

  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.onclick = () => {
      if (!guardAction()) return;
      const nama = btn.getAttribute("data-edit");
      const current = stokBarang[nama] || 0;
      const val = prompt(`Ubah stok "${nama}" (saat ini: ${current})`, current);
      if (val === null) return;
      const newTotal = Number(val);
      if (isNaN(newTotal) || newTotal < 0) return alert("Jumlah baru harus angka >= 0.");
      const delta = newTotal - current;

      set(ref(db, `stok/${nama}`), newTotal)
        .then(() => push(ref(db, "riwayat"), { tanggal: todayYMD(), nama, perubahan: delta, sisa: newTotal }))
        .catch(err => console.error("❌ Gagal mengubah stok:", err));
    };
  });

  document.querySelectorAll("[data-hapus]").forEach(btn => {
    btn.onclick = () => {
      if (!guardAction()) return;
      const nama = btn.getAttribute("data-hapus");
      if (!confirm(`Hapus barang "${nama}" beserta riwayatnya?`)) return;
      remove(ref(db, `stok/${nama}`)).catch(err => console.error("❌ Gagal hapus stok:", err));
      onValue(ref(db, "riwayat"), snapshot => {
        snapshot.forEach(child => {
          if ((child.val()?.nama) === nama) remove(ref(db, `riwayat/${child.key}`)).catch(()=>{});
        });
      }, { onlyOnce: true });
    };
  });
}

function renderRiwayat() {
  let data = [...riwayat];
  const key = (searchBar.value || "").trim().toLowerCase();
  if (key) data = data.filter(it =>
    (it.nama || "").toLowerCase().includes(key) || (it.tanggal || "").toLowerCase().includes(key)
  );

  tabelRiwayatBody.innerHTML = "";
  if (!data.length) {
    tabelRiwayatBody.innerHTML = `<tr><td colspan="6">Tidak ada riwayat</td></tr>`;
    return;
  }

  data.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(it.tanggal)}</td>
      <td>${escapeHtml(it.nama)}</td>
      <td>${it.perubahan > 0 ? "+"+it.perubahan : it.perubahan}</td>
      <td>${it.sisa}</td>
      <td><button class="smallBtn danger" data-id="${it.id}" ${!isAdmin ? "disabled" : ""}>Hapus</button></td>
    `;
    tabelRiwayatBody.appendChild(tr);
  });

  document.querySelectorAll("#tabelRiwayat [data-id]").forEach(btn => {
    btn.onclick = () => {
      if (!guardAction()) return;
      const id = btn.getAttribute("data-id");
      const entry = riwayat.find(r => r.id === id);
      if (!entry) return;
      if (!confirm(`Hapus riwayat "${entry.nama}" pada ${entry.tanggal}?`)) return;
      remove(ref(db, `riwayat/${id}`)).catch(err => console.error("❌ Gagal hapus riwayat:", err));
    };
  });
}

searchBar.addEventListener("input", renderRiwayat);

/* =========================
   LISTENER REALTIME
   ========================= */
onValue(ref(db, "stok"), snapshot => {
  stokBarang = snapshot.val() || {};
  renderStok();
  updateGuard();
});

onValue(ref(db, "riwayat"), snapshot => {
  const arr = [];
  snapshot.forEach(child => arr.push({ id: child.key, ...child.val() }));
  arr.sort((a,b) => a.tanggal === b.tanggal ? (a.id < b.id ? 1 : -1) : (a.tanggal < b.tanggal ? 1 : -1));
  riwayat = arr;
  renderRiwayat();
  updateGuard();
});

/* =========================
   EXPORT EXCEL
   ========================= */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

btnExportStok.addEventListener("click", () => {
  if (typeof XLSX === "undefined") return alert("Library XLSX belum dimuat.");
  const rows = Object.keys(stokBarang || {}).sort().map((nama, idx) => ({ No: idx+1, "Nama Barang": nama, Jumlah: stokBarang[nama] }));
  if (!rows.length) return alert("Tidak ada data stok untuk diexport.");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stok");
  XLSX.writeFile(wb, `stok_${today()}.xlsx`);
});

btnExportRiwayat.addEventListener("click", () => {
  if (typeof XLSX === "undefined") return alert("Library XLSX belum dimuat.");
  if (!riwayat.length) return alert("Tidak ada data riwayat untuk diexport.");
  const rows = riwayat.map((it, idx) => ({ No: idx+1, Tanggal: it.tanggal, "Nama Barang": it.nama, Perubahan: it.perubahan, Sisa: it.sisa }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Riwayat");
  XLSX.writeFile(wb, `riwayat_${today()}.xlsx`);
});
