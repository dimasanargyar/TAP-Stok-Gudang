import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getDatabase, ref, set, push, remove, onValue, query, orderByChild, equalTo, get }
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
   ELEMEN DOM
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
const btnBypass = document.getElementById("btnBypass");
const statusLogin = document.getElementById("statusLogin");

/* =========================
   LOGIN ADMIN
   ========================= */
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "password123";
let isAdmin = false;

function updateGuard() {
  btnSimpan.disabled = !isAdmin;
  statusLogin.textContent = isAdmin ? "Mode: Admin" : "Mode: Read-Only";
}

function showOverlay() {
  loginOverlay.classList.remove("hidden");
  loginOverlay.style.opacity = 0;
  loginOverlay.style.display = "grid";
  setTimeout(() => { loginOverlay.style.opacity = 1; }, 10);
}

function hideOverlay() {
  loginOverlay.style.opacity = 0;
  setTimeout(() => loginOverlay.style.display = "none", 300);
}

(function initLogin() {
  const cached = localStorage.getItem("stok_is_admin") === "true";
  if (cached) {
    isAdmin = true;
    hideOverlay();
  } else {
    showOverlay();
  }

  btnLogin.addEventListener("click", () => {
    const u = (loginUser.value || "").trim();
    const p = (loginPass.value || "").trim();
    if (u === DEFAULT_USERNAME && p === DEFAULT_PASSWORD) {
      isAdmin = true;
      localStorage.setItem("stok_is_admin", "true");
      updateGuard();
      hideOverlay();
      showToast("Login berhasil!");
    } else {
      alert("Username/Password salah.");
    }
  });

  btnBypass.addEventListener("click", () => {
    isAdmin = false;
    localStorage.removeItem("stok_is_admin");
    updateGuard();
    hideOverlay();
    showToast("Mode Read-Only.");
  });

  updateGuard();
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
  return str.replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function guardAction() {
  if (!isAdmin) { alert("Aksi ini memerlukan login admin."); return false; }
  return true;
}

/* =========================
   TOAST NOTIFIKASI
   ========================= */
function showToast(msg) {
  let toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.background = "#1976d2";
  toast.style.color = "#fff";
  toast.style.padding = "10px 16px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  toast.style.zIndex = 99999;
  toast.style.opacity = 0;
  toast.style.transition = "opacity 0.3s";
  document.body.appendChild(toast);
  setTimeout(() => toast.style.opacity = 1, 10);
  setTimeout(() => { toast.style.opacity = 0; setTimeout(() => toast.remove(), 300); }, 2000);
}

/* =========================
   SIMPAN (+/-)
   ========================= */
btnSimpan.addEventListener("click", async () => {
  if (!guardAction()) return;

  const nama = inputNama.value.trim();
  const jumlah = Number(inputJumlah.value);
  const tanggal = inputTanggal.value || todayYMD();

  if (!nama) return alert("Nama barang wajib diisi.");
  if (isNaN(jumlah)) return alert("Jumlah harus angka.");
  if (!tanggal) return alert("Tanggal wajib diisi.");

  const sisaBaru = (stokBarang[nama] || 0) + jumlah;
  if (jumlah < 0 && sisaBaru < 0) return alert(`Stok tidak cukup. Stok saat ini: ${stokBarang[nama] || 0}`);

  try {
    await set(ref(db, `stok/${nama}`), sisaBaru);
    await push(ref(db, "riwayat"), { tanggal, nama, perubahan: jumlah, sisa: sisaBaru });
    inputNama.value = "";
    inputJumlah.value = "";
    inputTanggal.value = todayYMD();
    showToast("Data berhasil disimpan!");
  } catch(err) {
    console.error("❌ Gagal menyimpan:", err);
  }
});

btnResetForm.addEventListener("click", () => {
  inputNama.value = "";
  inputJumlah.value = "";
  inputTanggal.value = todayYMD();
});

/* =========================
   RENDER STOK
   ========================= */
function renderStok() {
  tabelStokBody.innerHTML = "";
  const names = Object.keys(stokBarang || {}).sort();
  if (!names.length) return tabelStokBody.innerHTML = `<tr><td colspan="4">Tidak ada stok</td></tr>`;

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
    btn.onclick = async () => {
      if (!guardAction()) return;
      const nama = btn.getAttribute("data-edit");
      const current = stokBarang[nama] || 0;
      const val = prompt(`Ubah stok "${nama}" (saat ini: ${current})`, current);
      if (val === null) return;
      const newTotal = Number(val);
      if (isNaN(newTotal) || newTotal < 0) return alert("Jumlah baru harus angka >= 0.");
      const delta = newTotal - current;

      try {
        await set(ref(db, `stok/${nama}`), newTotal);
        await push(ref(db, "riwayat"), { tanggal: todayYMD(), nama, perubahan: delta, sisa: newTotal });
        showToast("Stok berhasil diubah!");
      } catch(err) { console.error("❌ Gagal mengubah stok:", err); }
    };
  });

  document.querySelectorAll("[data-hapus]").forEach(btn => {
    btn.onclick = async () => {
      if (!guardAction()) return;
      const nama = btn.getAttribute("data-hapus");
      if (!confirm(`Hapus barang "${nama}" beserta riwayatnya?`)) return;

      try {
        await remove(ref(db, `stok/${nama}`));
        // Hapus riwayat terkait barang
        const q = query(ref(db, "riwayat"), orderByChild("nama"), equalTo(nama));
        const snapshot = await get(q);
        snapshot.forEach(child => remove(ref(db, `riwayat/${child.key}`)));
        showToast(`Barang "${nama}" dihapus!`);
      } catch(err) { console.error("❌ Gagal hapus stok:", err); }
    };
  });
}

/* =========================
   RENDER RIWAYAT
   ========================= */
function renderRiwayat() {
  let data = [...riwayat];
  const key = (searchBar.value || "").trim().toLowerCase();
  if (key) data = data.filter(it =>
    (it.nama || "").toLowerCase().includes(key) ||
    (it.tanggal || "").toLowerCase().includes(key)
  );

  tabelRiwayatBody.innerHTML = "";
  if (!data.length) return tabelRiwayatBody.innerHTML = `<tr><td colspan="6">Tidak ada riwayat</td></tr>`;

  data.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(it.tanggal)}</td>
      <td>${escapeHtml(it.nama)}</td>
      <td>${it.perubahan > 0 ? "+" + it.perubahan : it.perubahan}</td>
      <td>${it.sisa}</td>
      <td><button class="smallBtn danger" data-id="${it.id}" ${!isAdmin ? "disabled" : ""}>Hapus</button></td>
    `;
    tabelRiwayatBody.appendChild(tr);
  });

  document.querySelectorAll("#tabelRiwayat [data-id]").forEach(btn => {
    btn.onclick = async () => {
      if (!guardAction()) return;
      const id = btn.getAttribute("data-id");
      const entry = riwayat.find(r => r.id === id);
      if (!entry) return;
      if (!confirm(`Hapus riwayat "${entry.nama}" pada ${entry.tanggal}?`)) return;
      try {
        await remove(ref(db, `riwayat/${id}`));
        showToast("Riwayat berhasil dihapus!");
      } catch(err) { console.error("❌ Gagal hapus riwayat:", err); }
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
  arr.sort((a,b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id));
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
  const rows = Object.keys(stokBarang || {}).sort().map((nama, idx) => ({
    No: idx + 1, "Nama Barang": nama, Jumlah: stokBarang[nama]
  }));
  if (!rows.length) return alert("Tidak ada data stok untuk diexport.");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stok");
  XLSX.writeFile(wb, `stok_${today()}.xlsx`);
  showToast("Stok berhasil diexport!");
});

btnExportRiwayat.addEventListener("click", () => {
  if (typeof XLSX === "undefined") return alert("Library XLSX belum dimuat.");
  if (!riwayat.length) return alert("Tidak ada data riwayat untuk diexport.");
  const rows = riwayat.map((it, idx) => ({
    No: idx + 1, Tanggal: it.tanggal, "Nama Barang": it.nama, Perubahan: it.perubahan, Sisa: it.sisa
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Riwayat");
  XLSX.writeFile(wb, `riwayat_${today()}.xlsx`);
  showToast("Riwayat berhasil diexport!");
});
