import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getDatabase, ref, set, push, remove, onValue, update }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* =======================================================
   FIREBASE CONFIG (JANGAN DIUBAH)
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
const auth = getAuth(app);

/* =======================================================
   DOM ELEMENTS
======================================================= */
const loginCard = document.getElementById("loginCard");
const appRoot = document.getElementById("app");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");
const btnGuest = document.getElementById("btnGuest");
const togglePassword = document.getElementById("togglePassword");
const btnLogout = document.createElement("button"); 
btnLogout.id = "btnLogout";
btnLogout.textContent = "Logout";
btnLogout.className = "smallBtn secondary";

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
let editMode = null; 
let currentRole = null; // 'admin' | 'guest'

/* =======================================================
   LOGIN
======================================================= */
btnLogin.addEventListener("click", () => {
  const email = (loginUsername.value || "").trim();
  const password = (loginPassword.value || "").trim();

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      currentRole = "admin";
      afterLogin();
    })
    .catch(error => {
      alert("Login gagal: " + error.message);
    });
});

btnGuest.addEventListener("click", () => {
  currentRole = "guest";
  afterLogin();
});

/* 👁 Toggle password */
if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const type = loginPassword.getAttribute("type") === "password" ? "text" : "password";
    loginPassword.setAttribute("type", type);
    togglePassword.textContent = type === "password" ? "🔴" : "🟢";
  });
}

function afterLogin() {
  loginCard.style.display = "none";
  appRoot.style.display = "block";

  // tambahkan tombol logout di header
  if (!document.getElementById("btnLogout")) {
    appRoot.prepend(btnLogout);
  }

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

  renderStok();
  renderRiwayat();
}

/* =======================================================
   LOGOUT
======================================================= */
btnLogout.addEventListener("click", () => {
  signOut(auth).then(() => {
    currentRole = null;
    appRoot.style.display = "none";
    loginCard.style.display = "block";
  });
});

/* =======================================================
   SIMPAN DATA
======================================================= */
btnSimpan.addEventListener("click", () => {
  if (currentRole === "guest") return;
  const nama = inputNama.value.trim();
  const jumlah = parseInt(inputJumlah.value);
  const satuan = inputSatuan.value.trim();
  const tanggal = inputTanggal.value;

  if (!nama || !jumlah || !satuan || !tanggal) {
    alert("Lengkapi semua field!");
    return;
  }

  const newRef = push(ref(db, "stok"));
  set(newRef, {
    nama,
    jumlah,
    satuan,
    tanggal
  });

  const logRef = push(ref(db, "riwayat"));
  set(logRef, {
    aksi: "Tambah",
    nama,
    jumlah,
    satuan,
    tanggal,
    waktu: new Date().toISOString()
  });

  resetForm();
});

/* =======================================================
   RENDER DATA STOK
======================================================= */
onValue(ref(db, "stok"), snapshot => {
  stokBarang = snapshot.val() || {};
  renderStok();
});

function renderStok() {
  tabelStokBody.innerHTML = "";
  Object.entries(stokBarang).forEach(([id, item]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nama}</td>
      <td>${item.jumlah}</td>
      <td>${item.satuan}</td>
      <td>${item.tanggal}</td>
      <td>
        ${currentRole === "admin" ? `
        <button class="smallBtn edit" data-id="${id}">Edit</button>
        <button class="smallBtn danger" data-id="${id}">Hapus</button>
        ` : ""}
      </td>
    `;
    tabelStokBody.appendChild(tr);
  });

  if (currentRole === "admin") {
    document.querySelectorAll(".edit").forEach(btn =>
      btn.addEventListener("click", () => openEditModal(btn.dataset.id))
    );
    document.querySelectorAll(".danger").forEach(btn =>
      btn.addEventListener("click", () => deleteItem(btn.dataset.id))
    );
  }
}

/* =======================================================
   RENDER RIWAYAT
======================================================= */
onValue(ref(db, "riwayat"), snapshot => {
  riwayat = Object.values(snapshot.val() || {});
  renderRiwayat();
});

function renderRiwayat() {
  tabelRiwayatBody.innerHTML = "";
  riwayat.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.aksi}</td>
      <td>${item.nama}</td>
      <td>${item.jumlah}</td>
      <td>${item.satuan}</td>
      <td>${item.tanggal}</td>
      <td>${new Date(item.waktu).toLocaleString()}</td>
    `;
    tabelRiwayatBody.appendChild(tr);
  });
}

/* =======================================================
   EDIT DATA
======================================================= */
function openEditModal(id) {
  editMode = id;
  const item = stokBarang[id];
  editNama.value = item.nama;
  editJumlah.value = item.jumlah;
  editSatuan.value = item.satuan;
  editModal.style.display = "flex";
}

btnUpdateBarang.addEventListener("click", () => {
  if (!editMode) return;
  const updated = {
    nama: editNama.value,
    jumlah: parseInt(editJumlah.value),
    satuan: editSatuan.value,
    tanggal: stokBarang[editMode].tanggal
  };
  update(ref(db, "stok/" + editMode), updated);

  const logRef = push(ref(db, "riwayat"));
  set(logRef, {
    aksi: "Edit",
    ...updated,
    waktu: new Date().toISOString()
  });

  editModal.style.display = "none";
  editMode = null;
});

btnCancelEdit.addEventListener("click", () => {
  editMode = null;
  editModal.style.display = "none";
});

function deleteItem(id) {
  if (!confirm("Yakin hapus data?")) return;
  remove(ref(db, "stok/" + id));
}

/* =======================================================
   EXPORT EXCEL
======================================================= */
function exportToExcel(filename, rows) {
  let table = "<table><tr>";
  Object.keys(rows[0]).forEach(k => table += `<th>${k}</th>`);
  table += "</tr>";
  rows.forEach(r => {
    table += "<tr>";
    Object.values(r).forEach(v => table += `<td>${v}</td>`);
    table += "</tr>";
  });
  table += "</table>";

  const blob = new Blob([table], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".xls";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

btnExportStok.addEventListener("click", () => {
  if (!Object.values(stokBarang).length) return;
  exportToExcel("stok-barang", Object.values(stokBarang));
});

btnExportRiwayat.addEventListener("click", () => {
  if (!riwayat.length) return;
  const bulan = bulanExport.value;
  const filtered = bulan ? riwayat.filter(r => r.tanggal.startsWith(bulan)) : riwayat;
  exportToExcel("riwayat-barang", filtered);
});

/* =======================================================
   RESET FORM
======================================================= */
btnResetForm.addEventListener("click", resetForm);
function resetForm() {
  inputNama.value = "";
  inputJumlah.value = "";
  inputSatuan.value = "";
  inputTanggal.value = "";
}
