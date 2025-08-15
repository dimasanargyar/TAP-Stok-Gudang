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



  console.log("📤 Mengirim data ke Firebase...");

  set(ref(db, `stok/${nama}`), sisaBaru)

    .then(() => {

      console.log(`✅ Stok untuk "${nama}" tersimpan: ${sisaBaru}`);

      return push(ref(db, "riwayat"), {

        tanggal,

        nama,

        perubahan: jumlah,

        sisa: sisaBaru

      });

    })

    .then(() => {

      console.log("✅ Riwayat tersimpan");

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

// RENDER STOK

// =========================

function renderStok() {

  tabelStokBody.innerHTML = "";

  if (!stokBarang || Object.keys(stokBarang).length === 0) {

    tabelStokBody.innerHTML = `<tr><td colspan="3">Tidak ada stok</td></tr>`;

    return;

  }



  Object.keys(stokBarang).sort().forEach(nama => {

    const tr = document.createElement("tr");

    tr.innerHTML = `

      <td>${escapeHtml(nama)}</td>

      <td>${stokBarang[nama]}</td>

      <td><button class="smallBtn" data-hapus-barang="${escapeHtml(nama)}">Hapus</button></td>

    `;

    tabelStokBody.appendChild(tr);

  });



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

  if (data.length === 0) {

    tabelRiwayatBody.innerHTML = `<tr><td colspan="6">Tidak ada riwayat</td></tr>`;

    return;

  }



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



  document.querySelectorAll("#tabelRiwayat .smallBtn").forEach((btn, i) => {

    btn.addEventListener("click", () => {

      const entry = data[i];

      if (confirm(`Yakin ingin menghapus riwayat untuk "${entry.nama}"?`)) {

        remove(ref(db, `riwayat/${entry.id}`));

      }

    });

  });

}



// =========================

// LISTENER REALTIME

// =========================

onValue(ref(db, "stok"), snapshot => {

  stokBarang = snapshot.val() || {};

  console.log("📦 Data stok dari Firebase:", stokBarang);

  renderStok();

});



onValue(ref(db, "riwayat"), snapshot => {

  const arr = [];

  snapshot.forEach(child => {

    arr.push({ id: child.key, ...child.val() });

  });

  arr.sort((a,b) => (a.tanggal < b.tanggal ? 1 : -1));

  riwayat = arr;

  console.log("📝 Data riwayat dari Firebase:", riwayat);

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
