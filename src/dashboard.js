import { executeTursoQuery } from './firebase.js';
lucide.createIcons();
const defaultDoctors = {
  "NEUROLOGY": [
    { name: "Dr. Arjun Nair", qual: "MBBS, MD, DM (Neurology)", time: "12:00 PM – 2:00 PM" },
    { name: "Dr. Divya Sharma", qual: "MBBS, MD (Neurology)", time: "3:00 PM – 4:00 PM" }
  ],
  "ENT": [
    { name: "Dr. Meera Menon", qual: "MBBS, MS (ENT)", time: "10:00 AM – 12:00 PM" },
    { name: "Dr. Rohit Kumar", qual: "MBBS, DLO", time: "2:00 PM – 4:00 PM" }
  ],
  "UROLOGY": [
    { name: "Dr. Rahul Kumar", qual: "MBBS, MS, MCh (Urology)", time: "9:00 AM – 11:00 AM" },
    { name: "Dr. Neha Reddy", qual: "MBBS, MS", time: "1:00 PM – 3:00 PM" }
  ],
  "PEDIATRICS": [
    { name: "Dr. Priya Nair", qual: "MBBS, MD (Pediatrics)", time: "9:30 AM – 11:30 AM" },
    { name: "Dr. Sanjay Rao", qual: "MBBS, DCH", time: "2:00 PM – 5:00 PM" }
  ],
  "GYNAECOLOGY": [
    { name: "Dr. Kavya Iyer", qual: "MBBS, MD, DGO", time: "10:00 AM – 1:00 PM" },
    { name: "Dr. Anjali Das", qual: "MBBS, MS (OBG)", time: "3:00 PM – 5:00 PM" }
  ],
  "GENERAL MEDICINE": [
    { name: "Dr. Vivek Menon", qual: "MBBS, MD (Internal Medicine)", time: "9:00 AM – 12:00 PM" },
    { name: "Dr. Akash Pillai", qual: "MBBS, MD", time: "4:00 PM – 6:00 PM" },
    { name: "Dr. Cristy Joseph", qual: "MBBS, DNB", time: "7:00 PM – 9:00 PM" }
  ],
  "ORTHO": [
    { name: "Dr. Rohit Das", qual: "MBBS, MS (Ortho)", time: "11:00 AM – 2:00 PM" },
    { name: "Dr. Kiran Nair", qual: "MBBS, D.Ortho", time: "3:00 PM – 5:00 PM" }
  ]
};
async function initDb() {
  try {
    await executeTursoQuery("CREATE TABLE IF NOT EXISTS doctors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, qual TEXT NOT NULL, department TEXT NOT NULL, time TEXT NOT NULL, maxSlots INTEGER DEFAULT 15, onLeave INTEGER DEFAULT 0)");
    await executeTursoQuery(`CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      userId TEXT, 
      patientName TEXT NOT NULL, 
      patientAge TEXT, 
      patientGender TEXT, 
      patientPhone TEXT, 
      patientAddress TEXT, 
      patientPincode TEXT, 
      department TEXT NOT NULL, 
      doctorName TEXT NOT NULL, 
      doctorTime TEXT NOT NULL, 
      date TEXT NOT NULL, 
      token TEXT NOT NULL, 
      status TEXT NOT NULL,
      userName TEXT,
      userEmail TEXT
    )`);
    
    // Check if doctors table is empty and seed it
    const existingDoctors = await executeTursoQuery("SELECT COUNT(*) as count FROM doctors");
    if (existingDoctors.rows[0].count === 0) {
      console.log("Seeding default doctors...");
      for (const dept in defaultDoctors) {
        for (const doc of defaultDoctors[dept]) {
          await executeTursoQuery("INSERT INTO doctors (name, qual, department, time, maxSlots, onLeave) VALUES (?, ?, ?, ?, 15, 0)", 
            [doc.name, doc.qual, dept, doc.time]);
        }
      }
    }
  } catch (err) {
    console.error("Failed to init DB tables", err);
  }
}
initDb();
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('login-username').value;
  const pass = document.getElementById('login-password').value;
  if (user === 'admin' && pass === 'esa123') {
    sessionStorage.setItem('adminLoggedIn', 'true');
    showDashboard();
  } else {
    document.getElementById('login-error').textContent = 'Invalid username or password';
  }
});
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.reload();
});
function checkLogin() {
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    showDashboard();
  }
}
function showDashboard() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');
  refreshAllData();

  // Setup periodic refresh for real-time app connection
  if (!window.dashboardSyncInterval) {
    window.dashboardSyncInterval = setInterval(refreshAllData, 3000); // 3s fast sync
  }
}
document.querySelectorAll('.nav-item[data-target]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    e.currentTarget.classList.add('active');
    const targetId = e.currentTarget.getAttribute('data-target');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.getElementById('page-title').textContent = e.currentTarget.textContent.trim();
  });
});
async function getDoctors() {
  try {
    const dbData = await executeTursoQuery("SELECT * FROM doctors");
    const docs = {};
    if (dbData.rows) {
      dbData.rows.forEach(row => {
        const dept = row.department;
        if (!docs[dept]) docs[dept] = [];
        docs[dept].push({
          id: row.id,
          name: row.name,
          qual: row.qual,
          time: row.time,
          maxSlots: row.maxSlots || 15,
          onLeave: row.onLeave || 0
        });
      });
    }
    return docs;
  } catch (err) {
    console.error("Failed to get doctors", err);
  }
  return {};
}
async function getAppointments() {
  try {
    const dbData = await executeTursoQuery("SELECT * FROM appointments ORDER BY id DESC");
    if (dbData.rows) {
      return dbData.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        patientName: row.patientName,
        patientAge: row.patientAge,
        patientGender: row.patientGender,
        patientPhone: row.patientPhone,
        patientAddress: row.patientAddress,
        patientPincode: row.patientPincode,
        department: row.department,
        doctorName: row.doctorName,
        doctorTime: row.doctorTime,
        date: row.date,
        token: row.token,
        status: row.status,
        userName: row.userName,
        userEmail: row.userEmail
      }));
    }
  } catch (err) {
    console.error("Failed to get appointments", err);
  }
  return [];
}
function isTimePassed(timeSlot) {
  try {
    const times = timeSlot.split(/[–—-]/);
    if (times.length < 2) return false;
    const endTimeStr = times[1].trim(); 
    const timeMatch = endTimeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (!timeMatch) return false;
    let hours = parseInt(timeMatch[1]);
    let minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    let modifier = timeMatch[3].toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const now = new Date();
    const end = new Date();
    end.setHours(hours, minutes, 0, 0);
    return now > end;
  } catch (e) {
    return false;
  }
}

async function validateAndExpireAppointments() {
  const appointmentsRef = await executeTursoQuery("SELECT * FROM appointments WHERE status = 'Active'");
  if (!appointmentsRef.rows) return;
  
  const today = new Date();
  const todayStr = today.toLocaleDateString();
  
  for (const apt of appointmentsRef.rows) {
    let shouldExpire = false;
    const aptDate = new Date(apt.date);
    const currDate = new Date(todayStr);
    
    if (aptDate < currDate) {
      shouldExpire = true;
    } else if (apt.date === todayStr) {
      if (isTimePassed(apt.doctorTime || '')) {
        shouldExpire = true;
      }
    }
    
    if (shouldExpire) {
      await executeTursoQuery("UPDATE appointments SET status = 'Cancelled' WHERE id = ?", [apt.id]);
    }
  }
}

async function refreshAllData() {
  await validateAndExpireAppointments();
  await loadOverview();
  await loadDoctorsTable();
  await loadAppointmentsTable();
  await loadRecordsTable();
}
async function loadOverview() {
  const docs = await getDoctors();
  let totalDocs = 0;
  for (const dept in docs) {
    totalDocs += docs[dept].length;
  }
  const apts = await getAppointments();
  const todayStr = new Date().toLocaleDateString();
  const todayApts = apts.filter(a => a.date === todayStr).length;
  document.getElementById('stat-doctors').textContent = totalDocs;
  document.getElementById('stat-appointments').textContent = apts.length;
  document.getElementById('stat-today').textContent = todayApts;
}
async function loadDoctorsTable() {
  const tbody = document.getElementById('doctors-table-body');
  tbody.innerHTML = '';
  const docs = await getDoctors();
  for (const dept in docs) {
    docs[dept].forEach((doc) => {
      const tr = document.createElement('tr');
      const isLeave = Number(doc.onLeave) === 1;
      tr.innerHTML = `
        <td data-label="Doctor"><strong>${doc.name}</strong><br><small style="color:#64748b">${doc.qual || 'Specialist'}</small></td>
        <td data-label="Dept"><span style="background:#eff6ff; color:#2563eb; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.85rem;">${dept}</span></td>
        <td data-label="Time">${doc.time} <br> <small>Slots: ${Number(doc.maxSlots) || 15}</small></td>
        <td>
          <button class="btn-sm btn-outline" onclick="openEditDoctorModal(${doc.id})">Edit</button>
          <button class="btn-sm ${isLeave ? 'btn-danger' : 'btn-success'}" onclick="toggleDoctorLeave(${doc.id}, ${doc.onLeave || 0})">
            ${isLeave ? 'End Leave' : 'Set Leave'}
          </button>
          <button class="btn-sm btn-danger" onclick="deleteDoctor(${doc.id})"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  lucide.createIcons();
}
document.getElementById('add-doctor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('doc-name').value;
  const qual = document.getElementById('doc-qual').value;
  const dept = document.getElementById('doc-dept').value;
  const time = document.getElementById('doc-time').value;
  const maxSlots = document.getElementById('doc-slots').value || 15;
  try {
    await executeTursoQuery("INSERT INTO doctors (name, qual, department, time, maxSlots, onLeave) VALUES (?, ?, ?, ?, ?, 0)", [name, qual, dept, time, maxSlots]);
    await refreshAllData();
    e.target.reset();
  } catch (err) {
    console.error("Failed to add doctor", err);
  }
});
window.deleteDoctor = async function(id) {
  if(confirm('Are you sure you want to delete this doctor?')) {
    try {
      await executeTursoQuery("DELETE FROM doctors WHERE id = ?", [id]);
      const oldScroll = window.scrollY;
      await refreshAllData();
      window.scrollTo(0, oldScroll);
    } catch (err) {
      console.error("Failed to delete doctor", err);
    }
  }
};
window.toggleDoctorLeave = async function(id, currentStatus) {
  try {
    const newStatus = Number(currentStatus) === 1 ? 0 : 1;
    await executeTursoQuery("UPDATE doctors SET onLeave = ? WHERE id = ?", [newStatus, id]);
    const oldScroll = window.scrollY;
    await refreshAllData();
    window.scrollTo(0, oldScroll);
  } catch (err) {
    console.error("Failed to toggle leave", err);
  }
};
window.openEditDoctorModal = async function(id) {
  const docs = await getDoctors();
  let docToEdit = null;
  let docDept = null;
  for (const dept in docs) {
    const found = docs[dept].find(d => d.id == id);
    if (found) {
      docToEdit = found;
      docDept = dept;
      break;
    }
  }
  if (!docToEdit) return;
  document.getElementById('edit-doc-index').value = id;
  document.getElementById('edit-doc-name').value = docToEdit.name;
  document.getElementById('edit-doc-qual').value = docToEdit.qual || '';
  document.getElementById('edit-doc-dept').value = docDept;
  document.getElementById('edit-doc-time').value = docToEdit.time;
  document.getElementById('edit-doc-slots').value = docToEdit.maxSlots || 15;
  document.getElementById('edit-doctor-modal').classList.add('active');
};
window.closeEditDoctorModal = function() {
  document.getElementById('edit-doctor-modal').classList.remove('active');
};
document.getElementById('edit-doctor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-doc-index').value;
  const newName = document.getElementById('edit-doc-name').value;
  const newQual = document.getElementById('edit-doc-qual').value;
  const newDept = document.getElementById('edit-doc-dept').value;
  const newTime = document.getElementById('edit-doc-time').value;
  const newSlots = document.getElementById('edit-doc-slots').value || 15;
  try {
    await executeTursoQuery("UPDATE doctors SET name = ?, qual = ?, department = ?, time = ?, maxSlots = ? WHERE id = ?", [newName, newQual, newDept, newTime, newSlots, id]);
    await refreshAllData();
    closeEditDoctorModal();
  } catch (err) {
    console.error("Failed to edit doctor", err);
  }
});
async function loadAppointmentsTable(searchTerm = '') {
  const tbody = document.getElementById('appointments-table-body');
  tbody.innerHTML = '';
  let apts = await getAppointments();
  if (searchTerm) {
    apts = apts.filter(a => {
      const pName = a.patient ? a.patient.name : a.patientName;
      return pName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }
  const todayStr = new Date().toLocaleDateString();
  apts.forEach((apt, index) => {
    const tr = document.createElement('tr');
    if (apt.date === todayStr) {
      tr.classList.add('highlight-today');
    }
    const pName = apt.patient ? apt.patient.name : apt.patientName;
    const docName = apt.doctor && typeof apt.doctor === 'object' ? apt.doctor.name : apt.doctorName || apt.doctor;
    const status = apt.status || 'Active';
    const userDisplay = apt.userEmail || apt.userName || 'Guest Walk-in';
    let statusIcon = '<i data-lucide="check-circle" class="status-icon-active"></i>';
    if (status === 'Cancelled') {
      statusIcon = '<i data-lucide="x-circle" class="status-icon-cancelled"></i>';
    } else if (status === 'Completed') {
      statusIcon = '<i data-lucide="check-circle-2" class="status-icon-completed"></i>';
    }
    tr.innerHTML = `
      <td data-label="Date">${apt.date}</td>
      <td data-label="Token"><strong>${apt.token}</strong></td>
      <td data-label="Patient">${pName}</td>
      <td data-label="Dept">${apt.department}</td>
      <td data-label="Doctor">${docName}</td>
      <td data-label="By"><span style="font-size: 0.85rem; color: #64748b;">${userDisplay}</span></td>
      <td data-label="Status">
        <div class="status-cell">
          ${statusIcon}
          <span>${status}</span>
        </div>
      </td>
      <td>
        <button class="btn-sm btn-outline" onclick="viewAppointmentDetails(${apt.id})">
          <i data-lucide="eye" style="width:14px; height:14px;"></i> View
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}
window.viewAppointmentDetails = async function(id) {
  let apts = await getAppointments();
  const apt = apts.find(a => a.id == id);
  if (!apt) {
    console.error("Appointment not found for ID:", id);
    return;
  }
  const pName = apt.patient ? apt.patient.name : apt.patientName || 'N/A';
  const pAge = apt.patient ? apt.patient.age : apt.patientAge || 'N/A';
  const pGender = apt.patient ? apt.patient.gender : apt.patientGender || 'N/A';
  const pPhone = apt.patient ? apt.patient.phone : apt.patientPhone || 'N/A';
  const pAddress = apt.patient ? apt.patient.address : apt.patientAddress || 'N/A';
  const pPincode = apt.patient ? apt.patient.pincode : apt.patientPincode || 'N/A';
  const docName = apt.doctor && typeof apt.doctor === 'object' ? apt.doctor.name : apt.doctorName || apt.doctor;
  const docTime = apt.doctor && typeof apt.doctor === 'object' ? apt.doctor.time : apt.doctorTime || apt.time;
  const userName = apt.userName || 'N/A';
  const userEmail = apt.userEmail || 'N/A';
  const status = apt.status || 'Active';
  let statusIcon = '<i data-lucide="check-circle" class="status-icon-active"></i>';
  if (status === 'Cancelled') {
    statusIcon = '<i data-lucide="x-circle" class="status-icon-cancelled"></i>';
  } else if (status === 'Completed') {
    statusIcon = '<i data-lucide="check-circle-2" class="status-icon-completed"></i>';
  }
  const content = document.getElementById('appointment-details-content');
  content.innerHTML = `
    <div class="ticket" style="border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden;">
      <div class="ticket-header" style="background: var(--primary); color: white; padding: 1.5rem; text-align: center;">
        <h3 style="margin: 0; font-size: 1.25rem;">ESA HOSPITAL</h3>
        <p style="margin: 0.25rem 0 0; opacity: 0.9; font-size: 0.8rem;">Digital Appointment Record</p>
      </div>
      <div class="ticket-body" style="padding: 1.5rem; background: white;">
        
        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid var(--border-color);">
          <h4 style="color: var(--primary); font-size: 0.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem;">PATIENT INFORMATION</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: bold;">Name</span>
              <span style="font-weight: 600; font-size: 0.95rem;">${pName}</span>
            </div>
            <div>
              <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: bold;">Age / Gender</span>
              <span style="font-weight: 600; font-size: 0.95rem;">${pAge} / ${pGender}</span>
            </div>
            <div style="grid-column: 1 / -1;">
              <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: bold;">Address</span>
              <span style="font-size: 0.85rem;">${pAddress}, ${pPincode}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: var(--primary); font-size: 0.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem;">CONSULTATION DETAILS</h4>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: #64748b; font-weight: bold; font-size: 0.8rem;">Department</span>
            <span style="font-weight: 500; font-size: 0.9rem;">${apt.department}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: #64748b; font-weight: bold; font-size: 0.8rem;">Consultant</span>
            <span style="font-weight: 500; font-size: 0.9rem;">${docName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: #64748b; font-weight: bold; font-size: 0.8rem;">Date & Time</span>
            <span style="font-weight: 500; font-size: 0.9rem;">${apt.date} | ${docTime}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: bold; font-size: 0.8rem;">Registered By</span>
            <span style="font-weight: 500; font-size: 0.9rem;">${userEmail}</span>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 1.25rem; border-radius: 12px; text-align: center;">
          <span style="color: #64748b; font-weight: bold; font-size: 0.75rem; letter-spacing: 0.05em;">TOKEN NUMBER</span>
          <div style="font-size: 2.25rem; font-weight: 800; color: var(--primary); margin: 0.25rem 0;">${apt.token}</div>
          <div style="display: flex; justify-content: center; margin-top: 0.75rem;">
            <svg id="barcode-${id}"></svg>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('view-appointment-modal').classList.add('active');
  if (window.JsBarcode) {
    JsBarcode(`#barcode-${id}`, apt.token, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: false
    });
  }
  if (window.lucide) lucide.createIcons();
};
window.closeViewAppointmentModal = function() {
  document.getElementById('view-appointment-modal').classList.remove('active');
};
document.getElementById('search-appointments').addEventListener('input', (e) => {
  loadAppointmentsTable(e.target.value);
});
async function loadRecordsTable() {
  const tbody = document.getElementById('records-table-body');
  tbody.innerHTML = '';
  const apts = await getAppointments();
  apts.forEach((apt) => {
    const pName = apt.patient ? apt.patient.name : apt.patientName;
    const docName = apt.doctor && typeof apt.doctor === 'object' ? apt.doctor.name : apt.doctorName || apt.doctor;
    const userDisplay = apt.userEmail || apt.userName || 'Guest Walk-in';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Date">${apt.date}</td>
      <td data-label="Token"><strong>${apt.token}</strong></td>
      <td data-label="Patient">${pName}</td>
      <td data-label="Doctor">${docName}</td>
      <td data-label="By"><span style="font-size: 0.85rem; color: #64748b;">${userDisplay}</span></td>
      <td>
        <button class="btn-sm btn-outline" onclick="downloadAdminPDF(${apt.id})">
          <i data-lucide="download" style="width:14px; height:14px;"></i> Download PDF
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}
window.downloadAdminPDF = async function(id) {
  const apts = await getAppointments();
  const apt = apts.find(a => a.id == id);
  if(!apt) {
    console.error("Appointment not found for ID:", id);
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("ESA HOSPITAL - ADMINISTRATIVE REPORT", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Appointment Full Details", 105, 28, { align: "center" });

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 32, pageWidth - 20, 32);

  let yPos = 45;
  const col1 = 20;
  const col2 = 60;
  const col3 = 105;
  const col4 = 145;

  const addField = (label, value, y, useCol1, useCol2) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(label, useCol1, y);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const textLines = doc.splitTextToSize(String(value || 'N/A'), 80);
    doc.text(textLines, useCol2, y);
    return textLines.length * 5; // Return height adjustment
  };

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("System Information", col1, yPos);
  yPos += 10;
  addField("Record ID:", apt.id, yPos, col1, col2);
  addField("Current Status:", apt.status || 'Active', yPos, col3, col4);
  yPos += 8;
  addField("Registered By:", apt.userName || 'N/A', yPos, col1, col2);
  addField("Email:", apt.userEmail || 'N/A', yPos, col3, col4);
  
  yPos += 15;
  doc.setLineWidth(0.2);
  doc.line(col1, yPos, pageWidth - col1, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", col1, yPos);
  yPos += 10;
  addField("Patient Name:", apt.patient ? apt.patient.name : apt.patientName, yPos, col1, col2);
  addField("Age & Gender:", `${apt.patient ? apt.patient.age : apt.patientAge} / ${apt.patient ? apt.patient.gender : apt.patientGender}`, yPos, col3, col4);
  yPos += 8;
  addField("Contact Phone:", apt.patient ? apt.patient.phone : apt.patientPhone, yPos, col1, col2);
  let addrHeight = addField("Address:", apt.patient ? apt.patient.address : apt.patientAddress, yPos, col3, col4);
  yPos += addrHeight > 8 ? addrHeight : 8;
  addField("Pincode:", apt.patient ? apt.patient.pincode : apt.patientPincode, yPos, col3, col4);

  yPos += 15;
  doc.line(col1, yPos, pageWidth - col1, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Consultation Details", col1, yPos);
  yPos += 10;
  
  addField("Department:", apt.department, yPos, col1, col2);
  const docName = apt.doctor && typeof apt.doctor === 'object' ? apt.doctor.name : apt.doctorName || apt.doctor;
  addField("Consulting Doctor:", docName, yPos, col3, col4);
  yPos += 8;
  addField("Appointment Date:", apt.date, yPos, col1, col2);
  const dTime = apt.doctor && typeof apt.doctor === 'object' ? apt.doctor.time : apt.doctorTime || '';
  addField("Doctor Time Slot:", dTime, yPos, col3, col4);

  yPos += 15;
  doc.line(col1, yPos, pageWidth - col1, yPos);
  yPos += 15;

  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text(`Token: ${apt.token}`, 105, yPos, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 280, { align: "center" });

  const mrn = (apt.id || '98701').toString().padStart(6, '0');
  doc.save(`ESA_Full_Details_${mrn}.pdf`);
};
checkLogin();
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('active');
});
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      document.querySelector('.sidebar').classList.remove('active');
    }
  });
});
document.addEventListener('click', (e) => {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
      sidebar.classList.remove('active');
    }
  }
});
