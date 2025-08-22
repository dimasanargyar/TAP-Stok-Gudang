import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getDatabase, ref, set, push, remove, onValue, update }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

/* =======================================================
   FIREBASE CONFIG
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
   LOGIN CONFIG
======================================================= */
const CREDENTIALS = {
  username: "admin",
  password: "gudangtap"
};

let currentRole = null; // 'admin' | 'guest'

/* =======================================================
   DOM ELEMENTS
======================================================= */
const loginCard = document.getElementById("loginCard");
const appRoot = document.getElementById("app");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");
const btnGuest = document.getElementById("btnGuest");

const inputNama = document.getElementById("inputNama");
const inputJumlah = document.getElementById("inputJumlah");
const inputSatuan = document.getElementById("inputSatuan");
const inputTanggal = document.getElementById("inputTanggal");
const btnSimpan = document.getElementById("btnSimpan");
const btnResetForm = document.getElementById("btnResetForm");
const searchBar = document.getElementById("searchBar");
const searchStok = document.getElementById("searchStok");
const tabelStokBody = document.querySelector("#tabelStok tbody");
const tabelRiwayatBody = document.querySelector("#tabelRiwayat tbody");

const btnExportStok = document.getElementById("btnExportStok");
const btnExportRiwayat = document.getElementById("btnExportRiwayat");
const bulanExport = document.getElementById("bulanExport");

const editNama = document.getElementById("editNama");
const editJumlah = document.getElementById("editJumlah");
const editSatuan = document.getElementById("editSatuan");
const btnUpdateBarang = document.getElementById("btnUpdateBarang");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const editModal = document.getElementById("editModal");

/* =======================================================
   STATE
======================================================= */
let stokBarang = {};
let riwayat = [];
let editMode = null; // { namaLama }

/* =======================================================
   LOGIN
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
  inputSatuan.disabled = isGuest;
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
   SIMPAN DATA & EDIT MODE
======================================================= */
btnSimpan.addEventListener("click", () => {
  if (currentRole === "guest") {
    alert("Mode Tamu: tidak diizinkan mengubah data.");
    return;
  }

  const nama = inputNama.value.trim();
  const jumlah = Number(inputJumlah.value);
  const satuan = inputSatuan.value.trim() || "-";
  const tanggal = inputTanggal.value;

  if (!nama) return alert("Nama barang wajib diisi.");
  if (!tanggal) return alert("Tanggal wajib diisi.");
  if (Number.isNaN(jumlah)) return alert("Jumlah harus angka.");
  if (jumlah === 0) return alert("Jumlah tidak boleh 0.");

  // === Jika sedang EDIT ===
  if (editMode) {
    const { namaLama } = editMode;

    remove(ref(db, `stok/${namaLama}`)).then(() => {
      set(ref(db, `stok/${nama}`), { jumlah, satuan }).then(() => {
        onValue(ref(db, "riwayat"), snapshot => {
          snapshot.forEach(child => {
            if (child.val().nama === namaLama) {
              update(ref(db, `riwayat/${child.key}`), {
                nama,
                sisa: jumlah,
                satuan
              });
            }
          });
        }, { onlyOnce: true });

        alert("✅ Data berhasil diedit.");
        resetFormInputs();
        editMode = null;
      });
    });
    return;
  }

  // === Tambah Baru ===
  const stokLama = stokBarang[nama]?.jumlah || 0;
  const sisaBaru = stokLama + jumlah;
  if (jumlah < 0 && sisaBaru < 0) {
    return alert(`Stok tidak cukup. Stok saat ini: ${stokLama}`);
  }

  set(ref(db, `stok/${nama}`), { jumlah: sisaBaru, satuan })
    .then(() => {
      return push(ref(db, "riwayat"), {
        tanggal,
        nama,
        perubahan: jumlah,
        sisa: sisaBaru,
        satuan
      });
    })
    .then(() => {
      alert("✅ Data berhasil disimpan.");
      resetFormInputs();
    })
    .catch(err => console.error("❌ Gagal menyimpan data:", err));
});

btnResetForm.addEventListener("click", () => {
  resetFormInputs();
  editMode = null;
});

function resetFormInputs() {
  inputNama.value = "";
  inputJumlah.value = "";
  inputSatuan.value = "";
  inputTanggal.value = "";
}

/* =======================================================
   RENDER STOK
======================================================= */
function renderStok() {
  tabelStokBody.innerHTML = "";

  const key = (searchStok.value || "").trim().toLowerCase();
  const filtered = Object.keys(stokBarang).filter(nama =>
    nama.toLowerCase().includes(key)
  );

  if (filtered.length === 0) {
    tabelStokBody.innerHTML = `<tr><td colspan="4">Tidak ada stok</td></tr>`;
    return;
  }

  const isGuest = currentRole === "guest";

  filtered.sort().forEach(nama => {
    const item = stokBarang[nama];
    const jumlah = item?.jumlah ?? item ?? 0;
    const satuan = item?.satuan ?? "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(nama)}</td>
      <td>${jumlah}</td>
      <td>${escapeHtml(satuan)}</td>
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

  document.querySelectorAll("[data-edit-barang]").forEach(btn => {
    btn.addEventListener("click", () => {
      const namaBarang = btn.getAttribute("data-edit-barang");
      const item = stokBarang[namaBarang];
      editNama.value = namaBarang;
      editJumlah.value = item?.jumlah ?? item ?? 0;
      editSatuan.value = item?.satuan ?? "-";
      editMode = { namaLama: namaBarang };
      editModal.style.display = "flex";
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
    tabelRiwayatBody.innerHTML = `<tr><td colspan="7">Tidak ada riwayat</td></tr>`;
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
      <td>${escapeHtml(it.satuan ?? "-")}</td>
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
searchStok.addEventListener("input", renderStok);

/* =======================================================
   EDIT MODAL
======================================================= */
btnUpdateBarang.addEventListener("click", () => {
  if (!editMode) return;
  inputNama.value = editNama.value;
  inputJumlah.value = editJumlah.value;
  inputSatuan.value = editSatuan.value;
  inputTanggal.value = todayISO();
  editModal.style.display = "none";
});

btnCancelEdit.addEventListener("click", () => {
  editMode = null;
  editModal.style.display = "none";
});

/* =======================================================
   EXPORT XLS
======================================================= */
btnExportStok.addEventListener("click", () => {
  if (currentRole === "guest") {
    alert("Mode Tamu: tidak diizinkan mengekspor data.");
    return;
  }
  const rows = [["Nama Barang", "Jumlah", "Satuan"]];
  Object.keys(stokBarang).sort().forEach(nama => {
    const item = stokBarang[nama];
    rows.push([nama, item?.jumlah ?? item ?? 0, item?.satuan ?? "-"]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Stok");
  XLSX.writeFile(wb, `stok_${todayCompact()}.xls`);
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
  const rows = [["Tanggal", "Nama Barang", "Perubahan", "Sisa", "Satuan"]];
  riwayat
    .filter(it => (it.tanggal || "").startsWith(bulan))
    .forEach(it => rows.push([it.tanggal, it.nama, it.perubahan, it.sisa, it.satuan ?? "-"]));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Riwayat");
  XLSX.writeFile(wb, `riwayat_${bulan}.xls`);
});

/* =======================================================
   UTIL
======================================================= */
function todayCompact() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}

function todayISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  })[m]);
}
