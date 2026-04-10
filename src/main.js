import { auth, signInWithPopup, provider, signOut, onAuthStateChanged, executeTursoQuery, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase.js';
setTimeout(async () => {
  try {
    await executeTursoQuery("ALTER TABLE appointments ADD COLUMN userEmail TEXT");
  } catch(e) {}
  try {
    await executeTursoQuery("ALTER TABLE appointments ADD COLUMN userName TEXT");
  } catch(e) {}
}, 1000);
const departments = [
  { name: "NEUROLOGY", icon: "brain", desc: "Brain & Nervous System" },
  { name: "ENT", icon: "ear", desc: "Ear, Nose & Throat" },
  { name: "UROLOGY", icon: "activity", desc: "Urinary Tract System" },
  { name: "PEDIATRICS", icon: "baby", desc: "Child Healthcare" },
  { name: "GYNAECOLOGY", icon: "heart-pulse", desc: "Women's Health" },
  { name: "ORTHO", icon: "bone", desc: "Bones & Joints" },
  { name: "GENERAL MEDICINE", icon: "stethoscope", desc: "Primary Healthcare" }
];
let doctorsData = {};
const MAX_DAILY_SLOTS = 15;
async function fetchDoctors() {
  try {
    const dbData = await executeTursoQuery("SELECT * FROM doctors");
    doctorsData = {};
    dbData.rows.forEach(row => {
      const dept = row.department;
      if (!doctorsData[dept]) doctorsData[dept] = [];
      doctorsData[dept].push({
        id: row.id,
        name: row.name,
        qual: row.qual,
        time: row.time,
        maxSlots: row.maxSlots || 15,
        onLeave: row.onLeave || 0
      });
    });
  } catch (err) {
    console.error("Failed to fetch doctors", err);
  }
}
fetchDoctors();
window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'check-circle';
  if (type === 'error') icon = 'alert-circle';
  if (type === 'info') icon = 'info';
  toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
let currentBooking = {
  id: null,
  status: null,
  patient: null,
  department: null,
  doctor: null,
  token: null
};
window.currentUser = null;
let unsubscribeAppointments = null;
let userAppointments = [];
function toggleBodyScroll(lock) {
  if (lock) {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollBarWidth}px`);
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
    document.documentElement.style.removeProperty('--scrollbar-width');
  }
}
window.handleGoogleLogin = async function() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login Error:", error);
    showToast("Login failed. Please try again.", "error");
  }
};
document.getElementById('email-login-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast("Logged in successfully", "success");
  } catch (error) {
    showToast("Invalid email or password", "error");
  }
});
window.handleEmailRegister = async function() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  if (!email || !pass || pass.length < 6) {
    showToast("Please enter an email and password (min 6 chars)", "error");
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    showToast("Account created successfully", "success");
  } catch (error) {
    showToast("Failed to create account - " + error.message, "error");
  }
};
window.handleLogout = async function() {
  try {
    await signOut(auth);
    showToast("Logged out successfully", "info");
  } catch (error) {
    console.error("Logout Error:", error);
  }
};
onAuthStateChanged(auth, (user) => {
  window.currentUser = user;
  const userProfile = document.getElementById('user-profile');
  const userAvatar = document.getElementById('user-avatar');
  if (user) {
    userProfile.style.display = 'flex';
    userAvatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + user.displayName;
    setupAppointmentsListener(user.uid);
    if (document.getElementById('page-login').classList.contains('active')) {
      navigateTo('page-home');
    }
  } else {
    userProfile.style.display = 'none';
    if (unsubscribeAppointments) {
      unsubscribeAppointments();
    }
    userAppointments = [];
    navigateTo('page-login');
  }
});
async function setupAppointmentsListener(uid) {
  try {
    const resData = await executeTursoQuery("SELECT * FROM appointments WHERE userId = ? ORDER BY id DESC", [uid]);
    userAppointments = resData.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      patient: {
        name: row.patientName,
        age: row.patientAge,
        gender: row.patientGender,
        phone: row.patientPhone,
        address: row.patientAddress,
        pincode: row.patientPincode
      },
      department: row.department,
      doctor: {
        name: row.doctorName,
        time: row.doctorTime
      },
      date: row.date,
      token: row.token,
      status: row.status,
      userName: row.userName,
      userEmail: row.userEmail
    }));
    if (document.getElementById('page-my-appointments').classList.contains('active')) {
      renderAppointments('current');
    } else if (document.getElementById('page-previous-appointments').classList.contains('active')) {
      renderAppointments('previous');
    }
  } catch (error) {
    console.error("Error fetching appointments:", error);
  }
}
window.navigateTo = function(pageId) {
  if (!window.currentUser && pageId !== 'page-login') {
    pageId = 'page-login';
  }
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById(pageId).classList.add('active');
  window.scrollTo(0, 0); 
  if (pageId === 'page-departments') {
    renderDepartments();
  } else if (pageId === 'page-my-appointments') {
    renderAppointments('current');
  } else if (pageId === 'page-previous-appointments') {
    renderAppointments('previous');
  } else if (pageId === 'page-register') {
    const btnAutoFill = document.getElementById('btn-autofill');
    if (btnAutoFill) {
      if (userAppointments && userAppointments.length > 0) {
        btnAutoFill.style.display = 'inline-flex';
      } else {
        btnAutoFill.style.display = 'none';
      }
    }
  }
  if (window.lucide) {
    window.lucide.createIcons();
  }
};
window.populatePatientFormFromHistory = function() {
  if (userAppointments && userAppointments.length > 0) {
    const lastPatient = userAppointments[0].patient;
    document.getElementById('reg-name').value = lastPatient.name || '';
    document.getElementById('reg-age').value = lastPatient.age || '';
    document.getElementById('reg-gender').value = lastPatient.gender || '';
    document.getElementById('reg-phone').value = lastPatient.phone || '';
    document.getElementById('reg-address').value = lastPatient.address || '';
    document.getElementById('reg-pincode').value = lastPatient.pincode || '';
    showToast("Filled using your previous activity!", "info");
  }
};
document.getElementById('registration-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const phone = document.getElementById('reg-phone').value;
  if (phone.length !== 10) {
    showToast("Phone number must be exactly 10 digits.", "error");
    return;
  }
  currentBooking.patient = {
    name: document.getElementById('reg-name').value,
    age: Number(document.getElementById('reg-age').value),
    gender: document.getElementById('reg-gender').value,
    address: document.getElementById('reg-address').value,
    pincode: document.getElementById('reg-pincode').value,
    phone: phone
  };
  navigateTo('page-departments');
});
function renderDepartments() {
  const list = document.getElementById('department-list');
  list.innerHTML = '';
  departments.forEach(dept => {
    const card = document.createElement('div');
    card.className = 'dept-card';
    card.innerHTML = `
      <div class="dept-icon"><i data-lucide="${dept.icon}"></i></div>
      <div class="dept-card-content">
        <h4>${dept.name}</h4>
        <p>${dept.desc}</p>
      </div>
    `;
    card.onclick = () => selectDepartment(dept.name);
    list.appendChild(card);
  });
  if (window.lucide) window.lucide.createIcons();
}
function selectDepartment(dept) {
  currentBooking.department = dept;
  renderDoctors(dept);
  navigateTo('page-doctors');
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
window.renderDoctors = async function(dept, isSilent = false) {
  const list = document.getElementById('doctor-list');
  if (!isSilent) {
    document.getElementById('selected-dept-name').textContent = dept;
    list.innerHTML = `<div class="text-center" style="grid-column: 1/-1; padding: 2rem;"><i data-lucide="loader-2" class="spin"></i> Checking availability...</div>`;
    if (window.lucide) window.lucide.createIcons();
  }
  await fetchDoctors(); 
  const today = new Date().toLocaleDateString();
  const doctors = doctorsData[dept] || [];
  try {
    const res = await executeTursoQuery(
      "SELECT doctorName, COUNT(*) as count FROM appointments WHERE date = ? AND status != 'Cancelled' GROUP BY doctorName",
      [today]
    );
    const counts = {};
    if (res.rows) {
      res.rows.forEach(r => { counts[r.doctorName] = r.count; });
    }
    list.innerHTML = '';
    list.className = 'grid-doctors';
    doctors.forEach(doc => {
      const bookedCount = Number(counts[doc.name]) || 0;
      const maxSlots = Number(doc.maxSlots) || 15;
      const onLeave = Number(doc.onLeave) === 1;
      const remaining = maxSlots - bookedCount;
      const isFull = remaining <= 0;
      const timePassed = isTimePassed(doc.time);
      
      const card = document.createElement('div');
      card.className = `doctor-card ${isFull || onLeave || timePassed ? 'fully-booked' : ''}`;
      
      let statusText = `${remaining} Slots Available`;
      let statusClass = 'success';
      let statusIcon = 'check-circle-2';
      
      if (onLeave) {
        statusText = 'On Leave / Unavailable';
        statusClass = 'danger';
        statusIcon = 'clock-off';
      } else if (timePassed) {
        statusText = 'Consultation Over Today';
        statusClass = 'danger';
        statusIcon = 'history';
      } else if (isFull) {
        statusText = 'Fully Booked';
        statusClass = 'danger';
        statusIcon = 'ban';
      }
      card.innerHTML = `
        <div class="doctor-avatar"><i data-lucide="user-round"></i></div>
        <div class="doctor-info">
          <h4>${doc.name}</h4>
          <span class="doctor-qual">${doc.qual}</span>
          <div class="time-slot-badge"><i data-lucide="clock"></i> ${doc.time}</div>
          <div class="slots-badge ${statusClass}">
            <i data-lucide="${statusIcon}"></i> 
            ${statusText}
          </div>
        </div>
      `;
      if (!isFull && !onLeave && !timePassed) {
        card.onclick = () => selectDoctor(doc);
      } else {
        card.style.cursor = 'not-allowed';
        card.style.opacity = '0.7';
      }
      list.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to render doctors with availability", err);
    list.innerHTML = `<div class="text-center" style="grid-column: 1/-1; color: var(--error);">Error loading availability. Please try again.</div>`;
  }
  if (window.lucide) window.lucide.createIcons();
};
function selectDoctor(doc) {
  currentBooking.doctor = doc;
  setupReview();
  navigateTo('page-review');
}
function setupReview() {
  if (!currentBooking.patient) {
    showToast("Patient information missing. Please register again.", "error");
    navigateTo('page-home');
    return;
  }
  const reviewContainer = document.getElementById('review-details');
  reviewContainer.innerHTML = `
    <div class="ticket" style="margin: 0 auto; text-align: left; box-shadow: none; border: 1px solid var(--border-color);">
      <div class="ticket-header" style="border-radius: var(--radius-xl) var(--radius-xl) 0 0;">
        <h3>ESA HOSPITAL</h3>
        <p>Appointment Review</p>
      </div>
      <div class="ticket-divider"></div>
      <div class="ticket-body" style="padding: 1.5rem;">
        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid var(--border-color);">
          <h4 style="font-size: 0.85rem; color: var(--primary); margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">PATIENT INFORMATION</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <span class="ticket-label">Name</span>
              <span class="ticket-value" style="font-size: 0.95rem;">${currentBooking.patient.name}</span>
            </div>
            <div>
              <span class="ticket-label">Age/Gender</span>
              <span class="ticket-value" style="font-size: 0.95rem;">${currentBooking.patient.age} / ${currentBooking.patient.gender}</span>
            </div>
            <div style="grid-column: 1 / -1;">
              <span class="ticket-label">Phone</span>
              <span class="ticket-value" style="font-size: 0.95rem;">${currentBooking.patient.phone}</span>
            </div>
          </div>
        </div>
        <div>
          <h4 style="font-size: 0.85rem; color: var(--primary); margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">APPOINTMENT DETAILS</h4>
          <div class="ticket-row">
            <span class="ticket-label">Department</span>
            <span class="ticket-value">${currentBooking.department}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Consulting Doctor</span>
            <span class="ticket-value">${currentBooking.doctor.name}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Date & Time</span>
            <span class="ticket-value">${new Date().toLocaleDateString()} | ${currentBooking.doctor.time}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}
async function getNextDoctorToken(doctorName, date) {
  try {
    const res = await executeTursoQuery(
      "SELECT COUNT(*) as count FROM appointments WHERE doctorName = ? AND date = ? AND status != 'Cancelled'",
      [doctorName, date]
    );
    const count = (res.rows && res.rows[0]) ? res.rows[0].count : 0;
    const tokenVal = (count * 3) + 1;
    return { token: tokenVal.toString().padStart(2, '0'), totalBooked: count };
  } catch (e) {
    console.error("Token generation error", e);
    return { token: "01", totalBooked: 0 };
  }
}
window.finalizeAppointment = async function() {
  if (!window.currentUser) {
    showToast("Please log in to book an appointment", "error");
    navigateTo('page-login');
    return;
  }
  const today = new Date().toLocaleDateString();
  const maxSlots = Number(currentBooking.doctor.maxSlots) || 15;
  const { token, totalBooked } = await getNextDoctorToken(currentBooking.doctor.name, today);
  if (totalBooked >= maxSlots) {
    showToast("Sorry, this doctor is now fully booked for today.", "error");
    renderDoctors(currentBooking.department);
    navigateTo('page-doctors');
    return;
  }
  currentBooking.id = Date.now().toString();
  currentBooking.status = 'Active';
  currentBooking.token = token;
  currentBooking.date = today;
  currentBooking.userId = window.currentUser.uid;
  currentBooking.userName = window.currentUser.displayName || (window.currentUser.email ? window.currentUser.email.split('@')[0] : "User");
  currentBooking.userEmail = window.currentUser.email || "N/A";
  try {
    try {
      const resData = await executeTursoQuery(
        `INSERT INTO appointments 
          (userId, patientName, patientAge, patientGender, patientPhone, patientAddress, patientPincode, 
           department, doctorName, doctorTime, date, token, status, userName, userEmail) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          currentBooking.userId || null,
          currentBooking.patient.name,
          currentBooking.patient.age,
          currentBooking.patient.gender,
          currentBooking.patient.phone,
          currentBooking.patient.address,
          currentBooking.patient.pincode,
          currentBooking.department,
          currentBooking.doctor.name,
          currentBooking.doctor.time,
          currentBooking.date,
          currentBooking.token,
          currentBooking.status || "Active",
          currentBooking.userName,
          currentBooking.userEmail
        ]
      );
      currentBooking.id = resData.lastInsertRowid;
      setupAppointmentsListener(window.currentUser.uid);
    } catch (err) {
      console.error("Failed to save appointment to Turso", err);
    }
    const receipt = document.getElementById('receipt-details');
    receipt.innerHTML = `
      <div class="ticket">
        <div class="ticket-header" style="background: var(--primary); color: white; padding: 1.5rem; border-radius: 12px 12px 0 0; text-align: center;">
          <h3 style="margin: 0; font-size: 1.5rem;">ESA HOSPITAL</h3>
          <p style="margin: 0.25rem 0 0; opacity: 0.9; font-size: 0.85rem;">Excellence in Healthcare, Every Day</p>
        </div>
        <div class="ticket-body" style="padding: 1.5rem; background: white; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 12px 12px;">
          
          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid var(--border-color);">
            <h4 style="color: var(--primary); font-size: 0.8rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem;">PATIENT INFORMATION</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <span style="display: block; font-size: 0.75rem; color: #64748b; font-weight: bold;">Name</span>
                <span style="font-weight: 600; font-size: 1rem;">${currentBooking.patient.name}</span>
              </div>
              <div>
                <span style="display: block; font-size: 0.75rem; color: #64748b; font-weight: bold;">Age / Gender</span>
                <span style="font-weight: 600; font-size: 1rem;">${currentBooking.patient.age} / ${currentBooking.patient.gender}</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <span style="display: block; font-size: 0.75rem; color: #64748b; font-weight: bold;">Registered Account</span>
                <span style="font-size: 0.9rem;">${currentBooking.userEmail}</span>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 2rem;">
            <h4 style="color: var(--primary); font-size: 0.8rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem;">APPOINTMENT DETAILS</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: #64748b; font-weight: bold; font-size: 0.85rem;">Department</span>
              <span style="font-weight: 500;">${currentBooking.department}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: #64748b; font-weight: bold; font-size: 0.85rem;">Consultant</span>
              <span style="font-weight: 500;">${currentBooking.doctor.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-weight: bold; font-size: 0.85rem;">Date & Time</span>
              <span style="font-weight: 500;">${currentBooking.date} | ${currentBooking.doctor.time}</span>
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 1.5rem; border-radius: 12px; text-align: center;">
            <span style="color: #64748b; font-weight: bold; font-size: 0.8rem; letter-spacing: 0.05em;">TOKEN NUMBER</span>
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary); margin: 0.5rem 0;">${currentBooking.token}</div>
            <div style="display: flex; justify-content: center; margin-top: 1rem;">
              <svg id="receipt-barcode"></svg>
            </div>
          </div>
        </div>
      </div>
    `;
    if (window.JsBarcode) {
      JsBarcode("#receipt-barcode", currentBooking.token, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: false,
        margin: 0
      });
    }
    navigateTo('page-confirmation');
  } catch (error) {
    console.error("Error booking appointment:", error);
    showToast("Failed to book appointment. Please try again.", "error");
  }
}
window.finishAppointment = function() {
  document.getElementById('registration-form').reset();
  currentBooking = { id: null, status: null, patient: null, department: null, doctor: null, token: null };
  navigateTo('page-home');
};
function generatePDF(booking) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;

  // Header - Dark Navy
  doc.setFillColor(15, 23, 42); 
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("ESA HOSPITAL", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Excellence in Healthcare, Every Day", pageWidth / 2, 33, { align: "center" });
  doc.text("Kottayam, Kerala | Ph: +91 98765 43210", pageWidth / 2, 39, { align: "center" });

  let y = 65;

  // Subheader
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("OUTPATIENT APPOINTMENT RECEIPT", pageWidth / 2, y, { align: "center" });

  y += 15;

  // Section 1: Patient Information
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text("PATIENT INFORMATION", margin + 5, y + 6);
  
  y += 15;
  doc.setTextColor(100, 116, 139);
  doc.text("Name:", margin + 5, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(booking.patient.name, margin + 40, y);
  
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Age/Gender:", pageWidth / 2 + 10, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(`${booking.patient.age} Yrs / ${booking.patient.gender}`, pageWidth / 2 + 50, y);

  y += 10;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Phone:", margin + 5, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(booking.patient.phone, margin + 40, y);

  y += 10;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Address:", margin + 5, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  const addr = `${booking.patient.address || 'N/A'}, PIN: ${booking.patient.pincode || 'N/A'}`;
  doc.text(addr, margin + 40, y);

  y += 15;

  // Section 2: Appointment Details
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("APPOINTMENT DETAILS", margin + 5, y + 6);

  y += 15;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Department:", margin + 5, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(booking.department, margin + 40, y);

  y += 10;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Doctor:", margin + 5, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(booking.doctor.name || booking.doctor, margin + 40, y);

  y += 10;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Date:", margin + 5, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(booking.date, margin + 40, y);
  
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Time:", pageWidth / 2 + 10, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(booking.doctor.time || '', pageWidth / 2 + 25, y);

  y += 15;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 5, y, pageWidth - margin - 5, y);
  
  y += 15;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOKEN NUMBER", pageWidth / 2, y, { align: "center" });

  y += 15;
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(48);
  doc.text(booking.token, pageWidth / 2, y, { align: "center" });

  // Barcode
  try {
    const canvas = document.createElement('canvas');
    window.JsBarcode(canvas, booking.token, {
      format: "CODE128",
      displayValue: false,
      width: 4,
      height: 60,
      margin: 0
    });
    const barcodeImg = canvas.toDataURL("image/png");
    doc.addImage(barcodeImg, 'PNG', pageWidth / 2 - 30, y + 5, 60, 15);
  } catch (e) {
    console.warn("Barcode skipped.");
  }

  // Final Box Border
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, 55, pageWidth - (margin * 2), 200);

  // Footnotes
  y = 265;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("* Please arrive at the hospital 15 minutes prior to your scheduled time.", pageWidth / 2, y, { align: "center" });
  doc.text("* This is a computer-generated receipt and does not require a physical signature.", pageWidth / 2, y + 5, { align: "center" });
  
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}, ${new Date().toLocaleTimeString()}`, pageWidth / 2, y, { align: "center" });

  doc.save(`ESA_Receipt_${booking.token}.pdf`);
}

async function validateAndExpireAppointments() {
  const appointmentsRef = await executeTursoQuery("SELECT * FROM appointments WHERE status = 'Active'");
  if (!appointmentsRef.rows) return;
  
  const today = new Date();
  const todayStr = today.toLocaleDateString();
  
  for (const apt of appointmentsRef.rows) {
    let shouldExpire = false;
    
    // Simple date check
    const aptDate = new Date(apt.date);
    const currDate = new Date(todayStr); // Only compare dates
    
    if (aptDate < currDate) {
      shouldExpire = true;
    } else if (apt.date === todayStr) {
      // If same day, check time
      if (isTimePassed(apt.doctorTime || '')) {
        shouldExpire = true;
      }
    }
    
    if (shouldExpire) {
      console.log(`Auto-cancelling expired appointment: ${apt.id}`);
      await executeTursoQuery("UPDATE appointments SET status = 'Cancelled' WHERE id = ?", [apt.id]);
    }
  }
}

// Kick off auto-expiry logic
setTimeout(validateAndExpireAppointments, 2000);

// Specifically for the "Appointment Confirmed" page newly created booking
window.downloadPDF = function() {
  if (currentBooking) {
    generatePDF(currentBooking);
  } else {
    showToast('No booking found', 'error');
  }
};
window.renderAppointments = function(type) {
  const containerId = type === 'current' ? 'current-appointments-list' : 'previous-appointments-list';
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  let displayList = [];
  if (type === 'current') {
    if (userAppointments.length > 0) {
      displayList = [userAppointments[0]];
    }
  } else {
    displayList = [...userAppointments];
  }
  if (displayList.length === 0) {
    container.innerHTML = `<div class="empty-state">No appointments found.</div>`;
    return;
  }
  displayList.forEach(apt => {
    const div = document.createElement('div');
    div.className = 'appointment-item';
    const statusClass = apt.status === 'Cancelled' ? 'status-cancelled' : 'status-active';
    const isCancelled = apt.status === 'Cancelled';
    div.innerHTML = `
      <div class="appointment-header">
        <div class="details">
          <h4><i data-lucide="stethoscope" style="width: 18px; height: 18px;"></i> ${apt.doctor.name}</h4>
          <p>${apt.department} | ${apt.date} at ${apt.doctor.time}</p>
        </div>
        <div style="text-align: right;">
          <span class="status-badge ${statusClass}">${apt.status || 'Active'}</span>
          <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
            Token: <strong style="color: var(--primary);">${apt.token}</strong>
          </div>
        </div>
      </div>
      <div class="appointment-actions">
        <button class="action-btn btn-view" onclick="window.viewAppointment('${apt.id}')"><i data-lucide="eye" style="width: 16px; height: 16px;"></i> View</button>
        <button class="action-btn btn-download" onclick="window.downloadAppointmentPDF('${apt.id}')"><i data-lucide="download" style="width: 16px; height: 16px;"></i> PDF</button>
        <button class="action-btn btn-cancel" onclick="window.cancelAppointment('${apt.id}')" ${isCancelled ? 'disabled' : ''}><i data-lucide="x-circle" style="width: 16px; height: 16px;"></i> Cancel</button>
        <button class="action-btn btn-delete" onclick="window.deleteAppointment('${apt.id}')"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i> Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
  if (window.lucide) window.lucide.createIcons();
}
window.getAppointmentById = function(id) {
  return userAppointments.find(a => a.id == id);
};
window.downloadAppointmentPDF = function(id) {
  const apt = getAppointmentById(id);
  if (apt) {
    generatePDF(apt);
    showToast('PDF downloaded successfully', 'success');
  }
};
window.closeConfirmModal = function() {
  document.getElementById('confirm-modal').classList.remove('active');
  toggleBodyScroll(false);
};
window.showConfirmModal = function(title, message, icon, confirmText, confirmColor, onConfirm) {
  document.getElementById('confirm-title').innerText = title;
  document.getElementById('confirm-message').innerText = message;
  const iconContainer = document.getElementById('confirm-icon');
  iconContainer.innerHTML = `<i data-lucide="${icon}" style="width: 48px; height: 48px; margin: 0 auto;"></i>`;
  iconContainer.style.color = confirmColor;
  const confirmBtn = document.getElementById('confirm-action-btn');
  confirmBtn.innerText = confirmText;
  confirmBtn.style.backgroundColor = confirmColor;
  confirmBtn.style.borderColor = confirmColor;
  confirmBtn.onclick = () => {
    closeConfirmModal();
    onConfirm();
  };
  document.getElementById('confirm-modal').classList.add('active');
  toggleBodyScroll(true);
  if (window.lucide) window.lucide.createIcons();
};
window.cancelAppointment = function(id) {
  showConfirmModal(
    "Cancel Appointment",
    "Are you sure you want to cancel this appointment? This action cannot be undone.",
    "x-circle",
    "Yes, Cancel It",
    "#c2410c", 
    async () => {
      try {
        await executeTursoQuery("UPDATE appointments SET status = ? WHERE id = ?", ['Cancelled', id]);
        showToast('Appointment cancelled successfully', 'info');
        if (window.currentUser) {
          setupAppointmentsListener(window.currentUser.uid); 
        }
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        showToast('Failed to cancel appointment', 'error');
      }
    }
  );
};
window.deleteAppointment = function(id) {
  showConfirmModal(
    "Delete Record",
    "Are you sure you want to permanently delete this record? This will remove it from your history.",
    "trash-2",
    "Yes, Delete It",
    "#b91c1c", 
    async () => {
      try {
        await executeTursoQuery("DELETE FROM appointments WHERE id = ?", [id]);
        showToast('Appointment deleted successfully', 'success');
        if (window.currentUser) {
          setupAppointmentsListener(window.currentUser.uid); 
        }
      } catch (error) {
        console.error("Error deleting appointment:", error);
        showToast('Failed to delete appointment', 'error');
      }
    }
  );
};
window.viewAppointment = function(id) {
  console.log("Viewing appointment:", id);
  const apt = getAppointmentById(id);
  if (!apt) {
    console.error("Appointment not found for ID:", id);
    showToast("Error: Appointment details not found", "error");
    return;
  }
  const statusClass = apt.status === 'Cancelled' ? 'status-cancelled' : 'status-active';
  document.getElementById('modal-details').innerHTML = `
    <div class="ticket" style="margin: 0 auto; box-shadow: none; border: none;">
      <div class="ticket-header" style="border-radius: var(--radius-xl) var(--radius-xl) 0 0;">
        <h3>ESA HOSPITAL</h3>
        <p>Appointment Details</p>
      </div>
      <div class="ticket-divider"></div>
      <div class="ticket-body" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h4 style="margin: 0; color: var(--primary); font-size: 1.1rem;">Status:</h4>
          <span class="status-badge ${statusClass}">${apt.status || 'Active'}</span>
        </div>
        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: left; border: 1px solid var(--border-color);">
          <h4 style="font-size: 0.85rem; color: var(--primary); margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">PATIENT INFORMATION</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <span class="ticket-label">Name</span>
              <span class="ticket-value" style="font-size: 0.95rem;">${apt.patient.name}</span>
            </div>
            <div>
              <span class="ticket-label">Age/Gender</span>
              <span class="ticket-value" style="font-size: 0.95rem;">${apt.patient.age} / ${apt.patient.gender}</span>
            </div>
            <div style="grid-column: 1 / -1;">
              <span class="ticket-label">Phone</span>
              <span class="ticket-value" style="font-size: 0.95rem;">${apt.patient.phone}</span>
            </div>
          </div>
        </div>
        <div style="text-align: left;">
          <h4 style="font-size: 0.85rem; color: var(--primary); margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">APPOINTMENT DETAILS</h4>
          <div class="ticket-row">
            <span class="ticket-label">Department</span>
            <span class="ticket-value">${apt.department}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Consulting Doctor</span>
            <span class="ticket-value">${apt.doctor.name}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Date & Time</span>
            <span class="ticket-value">${apt.date} | ${apt.doctor.time}</span>
          </div>
        </div>
        <div class="ticket-token">
          <span class="ticket-label" style="text-align: center;">Token Number</span>
          <div class="ticket-value">${apt.token}</div>
          <div style="margin-top: 0.5rem; font-family: 'Libre Barcode 39', monospace; font-size: 3.5rem; line-height: 1; color: var(--primary); font-weight: normal;">*${apt.token}*</div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('view-modal').classList.add('active');
  toggleBodyScroll(true);
  if (window.lucide) window.lucide.createIcons();
};
window.closeModal = function() {
  document.getElementById('view-modal').classList.remove('active');
  toggleBodyScroll(false);
};
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (overlay.id === 'view-modal') window.closeModal();
      if (overlay.id === 'confirm-modal') window.closeConfirmModal();
    }
  });
});
setInterval(() => {
  if (document.getElementById('page-doctors').classList.contains('active')) {
    if (currentBooking && currentBooking.department) {
      window.renderDoctors(currentBooking.department, true);
    }
  }
}, 3000);
