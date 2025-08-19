import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getDatabase, ref, set, push, remove, onValue }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

/* =======================================================
   KONFIGURASI FIREBASE  (TIDAK DIUBAH SESUAI PERMINTAAN)
======================================================= */
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

/* =======================================================
   KONFIGURASI LOGIN (BISA DIUBAH)
======================================================= */
const CREDENTIALS = {
  username: "admin",      // ← ubah ini
  password: "admin123"    // ← ubah ini
};

let currentRole = null; // 'admin' | 'guest'

/* =======================================================
   ELEMENT DOM
======================================================= */
// Login
const loginCard = document.getElementById("loginCard");
const appRoot = document.getElementById("app");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");
const btnGuest = document.getElementById("btnGuest");

// Form & tabel
const inputNama = document.getElementById("inputNama");
const inputJumlah = document.getElementById("inputJumlah");
const inputTanggal = document.getElementById("inputTanggal");
const btnSimpan = document.getElementById("btnSimpan");
const btnResetForm = document.getElementById("btnResetForm");
const searchBar = document.getElementById("searchBar");
const tabelStokBody = document.querySelector("#tabelStok tbody");
const tabelRiwayatBody = document.querySelector("#tabelRiwayat tbody");

// Export
const btnExportStok = document.getElementById("btnExportStok");
const btnExportRiwayat = document.getElementById("btnExportRiwayat");
const bulanExport = document.getElementById("bulanExport");

/* =======================================================
   STATE
======================================================= */
let stokBarang = {};
let riwayat = [];

/* =======================================================
   LOGIN HANDLER
======================================================= */
btnLogin.addEventListener("click", () => {
  const u = (loginUsername.value || "").trim();
  const p = (loginPassword.value || "").trim();
  if (u === CREDENTIALS.username && p === CREDENTIALS.password) {
    currentRole = "admin";
    afterLogin();
  } else {
    alert("Username atau password salah.");
  }
});

btnGuest.addEventListener("click", () => {
  currentRole = "guest";
  afterLogin();
});

function afterLogin() {
  loginCard.style.display = "none";
  appRoot.style.display = "block";
  applyRoleUI();
}

function applyRoleUI() {
  const isGuest = currentRole === "guest";

  inputNama.disabled = isGuest;
  inputJumlah.disabled = isGuest;
  inputTanggal.disabled = isGuest;
  btnSimpan.disabled = isGuest;
  btnResetForm.disabled = isGuest;

  btnExportStok.style.display = isGuest ? "none" : "inline-flex";
  btnExportRiwayat.style.display = isGuest ? "none" : "inline-flex";
  bulanExport.disabled = isGuest;

  renderStok();
  renderRiwayat();
}

/* =======================================================
   SIMPAN DATA
======================================================= */
btnSimpan.addEventListener("click", () => {
  if (currentRole === "guest") {
    alert("Mode Tamu: tidak diizinkan mengubah data.");
    return;
  }

  const nama = inputNama.value.trim();
  const jumlah = Number(inputJumlah.value);
  const tanggal = inputTanggal.value;

  if (!nama) return alert("Nama barang wajib diisi.");
  if (!tanggal) return alert("Tanggal wajib diisi.");
  if (Number.isNaN(jumlah)) return alert("Jumlah harus angka.");
  if (jumlah === 0) return alert("Jumlah tidak boleh 0.");

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
      alert("✅ Data berhasil disimpan.");
      resetFormInputs();
    })
    .catch(err => console.error("❌ Gagal menyimpan data:", err));
});

/* =======================================================
   RESET FORM
======================================================= */
btnResetForm.addEventListener("click", resetFormInputs);
function resetFormInputs() {
  inputNama.value = "";
  inputJumlah.value = "";
  inputTanggal.value = "";
}

/* =======================================================
   RENDER STOK + EDIT FITUR
======================================================= */
function renderStok() {
  tabelStokBody.innerHTML = "";
  if (!stokBarang || Object.keys(stokBarang).length === 0) {
    tabelStokBody.innerHTML = `<tr><td colspan="3">Tidak ada stok</td></tr>`;
    return;
  }

  const isGuest = currentRole === "guest";

  Object.keys(stokBarang).sort().forEach(nama => {
    const tr = document.createElement("tr");
    const sisa = stokBarang[nama];
    tr.innerHTML = `
      <td>${escapeHtml(nama)}</td>
      <td>${sisa}</td>
      <td>
        ${isGuest ? "" : `
          <button class="smallBtn" data-edit-barang="${escapeHtml(nama)}">Edit</button>
          <button class="smallBtn" data-hapus-barang="${escapeHtml(nama)}">Hapus</button>
        `}
      </td>
    `;
    tabelStokBody.appendChild(tr);
  });

  if (!currentRole || currentRole === "guest") return;

  // Tombol Hapus
  document.querySelectorAll("[data-hapus-barang]").forEach(btn => {
    btn.addEventListener("click", () => {
      const namaBarang = btn.getAttribute("data-hapus-barang");
      if (confirm(`Yakin ingin menghapus barang "${namaBarang}"?`)) {
        remove(ref(db, `stok/${namaBarang}`));
        onValue(ref(db, "riwayat"), snapshot => {
          snapshot.forEach(child => {
            if (child.val().nama === namaBarang) {
              remove(ref(db, `riwayat/${child.key}`));
            }
          });
        }, { onlyOnce: true });
      }
    });
  });

  // Tombol Edit
  document.querySelectorAll("[data-edit-barang]").forEach(btn => {
    btn.addEventListener("click", () => {
      const namaLama = btn.getAttribute("data-edit-barang");
      const stokLama = stokBarang[namaLama];

      const namaBaru = prompt("Edit Nama Barang:", namaLama);
      if (!namaBaru) return;

      const jumlahBaru = Number(prompt("Edit Jumlah Stok:", stokLama));
      if (Number.isNaN(jumlahBaru) || jumlahBaru < 0) {
        alert("Jumlah stok tidak valid.");
        return;
      }

      // Update stok
      set(ref(db, `stok/${namaBaru}`), jumlahBaru)
        .then(() => {
          if (namaBaru !== namaLama) {
            remove(ref(db, `stok/${namaLama}`));
          }

          // Update riwayat
          onValue(ref(db, "riwayat"), snapshot => {
            snapshot.forEach(child => {
              const val = child.val();
              if (val.nama === namaLama) {
                set(ref(db, `riwayat/${child.key}`), {
                  ...val,
                  nama: namaBaru,
                  sisa: jumlahBaru,
                  perubahan: jumlahBaru - stokLama
                });
              }
            });
          }, { onlyOnce: true });

          alert("✅ Data berhasil diperbarui.");
        })
        .catch(err => console.error("❌ Gagal edit data:", err));
    });
  });
}

/* =======================================================
   RENDER RIWAYAT
======================================================= */
function renderRiwayat() {
  let data = [...riwayat];
  const key = (searchBar.value || "").trim().toLowerCase();
  if (key) {
    data = data.filter(it => it.nama.toLowerCase().includes(key) || (it.tanggal || "").includes(key));
  }

  tabelRiwayatBody.innerHTML = "";
  if (data.length === 0) {
    tabelRiwayatBody.innerHTML = `<tr><td colspan="6">Tidak ada riwayat</td></tr>`;
    return;
  }

  const isGuest = currentRole === "guest";

  data.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(it.tanggal)}</td>
      <td>${escapeHtml(it.nama)}</td>
      <td>${it.perubahan > 0 ? "+" + it.perubahan : it.perubahan}</td>
      <td>${it.sisa}</td>
      <td>${isGuest ? "" : `<button class="smallBtn" data-id="${it.id}">Hapus</button>`}</td>
    `;
    tabelRiwayatBody.appendChild(tr);
  });

  if (!currentRole || currentRole === "guest") return;

  document.querySelectorAll("#tabelRiwayat .smallBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (id && confirm(`Yakin ingin menghapus riwayat ini?`)) {
        remove(ref(db, `riwayat/${id}`));
      }
    });
  });
}

/* =======================================================
   LISTENER REALTIME
======================================================= */
onValue(ref(db, "stok"), snapshot => {
  stokBarang = snapshot.val() || {};
  renderStok();
});

onValue(ref(db, "riwayat"), snapshot => {
  const arr = [];
  snapshot.forEach(child => {
    arr.push({ id: child.key, ...child.val() });
  });
  arr.sort((a, b) => {
    if (a.tanggal === b.tanggal) return a.id < b.id ? 1 : -1;
    return (a.tanggal < b.tanggal ? 1 : -1);
  });
  riwayat = arr;
  renderRiwayat();
});

searchBar.addEventListener("input", renderRiwayat);

/* =======================================================
   EXPORT CSV
======================================================= */
btnExportStok.addEventListener("click", () => {
  if (currentRole === "guest") {
    alert("Mode Tamu: tidak diizinkan mengekspor data.");
    return;
  }
  const rows = [["Nama Barang", "Jumlah"]];
  Object.keys(stokBarang).sort().forEach(nama => {
    rows.push([nama, String(stokBarang[nama])]);
  });
  const csv = toCSV(rows);
  const filename = `stok_${todayCompact()}.csv`;
  downloadCSV(csv, filename);
});

btnExportRiwayat.addEventListener("click", () => {
  if (currentRole === "guest") {
    alert("Mode Tamu: tidak diizinkan mengekspor data.");
    return;
  }
  const bulan = (bulanExport.value || "").trim();
  if (!bulan) {
    alert("Pilih bulan terlebih dahulu.");
    return;
  }
  const rows = [["Tanggal", "Nama Barang", "Perubahan", "Sisa"]];
  riwayat
    .filter(it => (it.tanggal || "").startsWith(bulan))
    .forEach(it => {
      rows.push([it.tanggal, it.nama, String(it.perubahan), String(it.sisa)]);
    });

  const csv = toCSV(rows);
  const filename = `riwayat_${bulan}.csv`;
  downloadCSV(csv, filename);
});

function toCSV(rows) {
  return rows.map(r =>
    r.map(x => {
      const s = (x ?? "").toString();
      if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(",")
  ).join("\n");
}

function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function todayCompact() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}

/* =======================================================
   UTIL
======================================================= */
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  })[m]);
}
