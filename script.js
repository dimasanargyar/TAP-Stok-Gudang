import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getDatabase, ref, set, push, remove, onValue }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// =========================
// KONFIGURASI FIREBASE (TIDAK DIUBAH)
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
let analytics;
try { analytics = getAnalytics(app); } catch(e) {
  // analytics dapat error bila bukan https/localhost, aman di-skip
}
const db = getDatabase(app);

// =========================
// LOGIN ADMIN (front-end)
// =========================
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "password123";

const loginOverlay = document.getElementById("loginOverlay");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const btnLogin = document.getElementById("btnLogin");
const btnBypass = document.getElementById("btnBypass");
const statusLogin = document.getElementById("statusLogin");

let isAdmin = false;

function updateGuard() {
  // aktif/nonaktifkan aksi tulis
  btnSimpan.disabled = !isAdmin;
  // tombol di tabel akan disetel saat render
  statusLogin.textContent = isAdmin ? "Mode: Admin" : "Mode: Read-Only";
}

function openLoginIfNeeded() {
  const cached = localStorage.getItem("stok_is_admin") === "true";
  if (cached) {
    isAdmin = true;
    updateGuard();
    loginOverlay.classList.add("hidden");
  } else {
    loginOverlay.classList.remove("hidden");
  }
}

btnLogin.addEventListener("click", () => {
  const u = (loginUser.value || "").trim();
  const p = (loginPass.value || "").trim();
  if (u === DEFAULT_USERNAME && p === DEFAULT_PASSWORD) {
    isAdmin = true;
    localStorage.setItem("stok_is_admin", "true");
    updateGuard();
    loginOverlay.classList.add("hidden");
  } else {
    alert("Username/Password salah.");
  }
});

btnBypass.addEventListener("click", () => {
  // Lihat tanpa hak edit
  isAdmin = false;
  localStorage.removeItem("stok_is_admin");
  updateGuard();
  loginOverlay.classList.add("hidden");
});

openLoginIfNeeded();

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
const btnExportStok = document.getElementById("btnExportStok");
const btnExportRiwayat = document.getElementById("btnExportRiwayat");

let stokBarang = {};
let riwayat = [];

// =========================
/* UTIL */
// =========================
function todayYMD() {
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  })[m]);
}

function guardAction() {
  if (!isAdmin) {
    alert("Aksi ini memerlukan login admin.");
    return false;
  }
  return true;
}

// =========================
// SIMPAN DATA (Tambah +/-)
// =========================
btnSimpan.addEventListener("click", () => {
  if (!guardAction()) return;

  const nama = inputNama.value.trim();
  const jumlah = Number(inputJumlah.value);
  const tanggal = inputTanggal.value || todayYMD();

  if (!nama) return alert("Nama barang wajib diisi.");
  if (isNaN(jumlah)) return alert("Jumlah harus angka.");
  if (!tanggal) return alert("Tanggal wajib diisi.");

  const sisaBaru = (stokBarang[nama] || 0) + jumlah;
  if (jumlah < 0 && sisaBaru < 0) {
    return alert(`Stok tidak cukup. Stok saat ini: ${stokBarang[nama] || 0}`);
  }

  set(ref(db, `stok/${nama}`), sisaBaru)
    .then(() => {
      return push(ref(db, "riwayat"), {
        tanggal,
        nama,
        perubahan: jumlah,
        sisa: sisaBaru
      });
    })
    .then(() => {
      resetFormInputs();
    })
    .catch(err => console.error("❌ Gagal menyimpan data:", err));
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
// RENDER STOK (dengan No + Edit + Hapus)
// =========================
function renderStok() {
  tabelStokBody.innerHTML = "";
  const names = Object.keys(stokBarang || {}).sort();
  if (names.length === 0) {
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
        <button class="smallBtn danger" data-hapus-barang="${escapeHtml(nama)}" ${!isAdmin ? "disabled" : ""}>Hapus</button>
      </td>
    `;
    tabelStokBody.appendChild(tr);
  });

  // Aksi Edit
  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!guardAction()) return;
      const namaBarang = btn.getAttribute("data-edit");
      const current = stokBarang[namaBarang] || 0;
      const inputNew = prompt(`Ubah jumlah stok untuk "${namaBarang}" (saat ini: ${current}). Masukkan jumlah baru:`, current);
      if (inputNew === null) return; // cancel
      const newTotal = Number(inputNew);
      if (isNaN(newTotal) || newTotal < 0) {
        return alert("Jumlah baru harus angka >= 0.");
      }
      const delta = newTotal - current;
      const tanggal = todayYMD();

      set(ref(db, `stok/${namaBarang}`), newTotal)
        .then(() => {
          return push(ref(db, "riwayat"), {
            tanggal,
            nama: namaBarang,
            perubahan: delta,
            sisa: newTotal
          });
        })
        .catch(err => console.error("❌ Gagal mengubah stok:", err));
    });
  });

  // Aksi Hapus Barang + riwayat terkait
  document.querySelectorAll("[data-hapus-barang]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!guardAction()) return;
      const namaBarang = btn.getAttribute("data-hapus-barang");
      if (confirm(`Yakin ingin menghapus barang "${namaBarang}"?`)) {
        // Hapus stok barang
        remove(ref(db, `stok/${namaBarang}`))
          .catch(err => console.error("❌ Gagal hapus stok:", err));
        // Hapus seluruh riwayat terkait barang tsb (hanya yang cocok namanya)
        onValue(ref(db, "riwayat"), snapshot => {
          snapshot.forEach(child => {
            if ((child.val()?.nama) === namaBarang) {
              remove(ref(db, `riwayat/${child.key}`)).catch(()=>{});
            }
          });
        }, { onlyOnce: true });
      }
    });
  });
}

// =========================
// RENDER RIWAYAT
// =========================
function renderRiwayat() {
  let data = [...riwayat];
  const key = (searchBar.value || "").trim().toLowerCase();
  if (key) {
    data = data.filter(it =>
      (it.nama || "").toLowerCase().includes(key) ||
      (it.tanggal || "").toLowerCase().includes(key)
    );
  }

  tabelRiwayatBody.innerHTML = "";
  if (data.length === 0) {
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

  // Hapus riwayat satuan
  document.querySelectorAll("#tabelRiwayat [data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!guardAction()) return;
      const id = btn.getAttribute("data-id");
      const entry = riwayat.find(r => r.id === id);
      if (!entry) return;
      if (confirm(`Yakin ingin menghapus riwayat untuk "${entry.nama}" pada ${entry.tanggal}?`)) {
        remove(ref(db, `riwayat/${id}`))
          .catch(err => console.error("❌ Gagal hapus riwayat:", err));
      }
    });
  });
}

searchBar.addEventListener("input", renderRiwayat);

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
  // urutkan terbaru ke lama (tanggal desc, fallback ke key)
  arr.sort((a,b) => {
    if (a.tanggal === b.tanggal) return (a.id < b.id ? 1 : -1);
    return (a.tanggal < b.tanggal ? 1 : -1);
  });
  riwayat = arr;
  renderRiwayat();
});

// =========================
/* EXPORT EXCEL */
// =========================
btnExportStok.addEventListener("click", () => {
  const rows = Object.keys(stokBarang || {}).sort().map((nama, idx) => ({
    No: idx + 1,
    "Nama Barang": nama,
    Jumlah: stokBarang[nama]
  }));
  if (rows.length === 0) {
    alert("Tidak ada data stok untuk diexport.");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stok");
  XLSX.writeFile(wb, `stok_${todayYMD()}.xlsx`);
});

btnExportRiwayat.addEventListener("click", () => {
  const data = [...riwayat];
  if (data.length === 0) {
    alert("Tidak ada data riwayat untuk diexport.");
    return;
  }
  const rows = data.map((it, idx) => ({
    No: idx + 1,
    Tanggal: it.tanggal,
    "Nama Barang": it.nama,
    Perubahan: it.perubahan,
    Sisa: it.sisa
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Riwayat");
  XLSX.writeFile(wb, `riwayat_${todayYMD()}.xlsx`);
});

// Set state tombol saat awal
updateGuard();
