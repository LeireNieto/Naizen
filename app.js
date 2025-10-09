/* ------------------ CONFIG ------------------ */
const API_URL = "https://naizenpf5.free.beeceptor.com"; // o tu API real
const API_KEY = "RiNr52I9SoPGV6ccVuF7LqPWx6ccVuF7LqPWx6IuT900";

/* ------------------ Estado y DOM ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const createGroupBtn = document.getElementById('createGroupBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');

const activityNameInput = document.getElementById('activityName');
const csvFileInput = document.getElementById('csvFile');
const addActivityBtn = document.getElementById('addActivityBtn');

let activities = {};        // { actividad: [participantes] }
let currentParticipants = [];
let groupId = null;          // se asigna al crear el grupo

/* ------------------ Helpers ------------------ */
function showStatus(msg, color) {
  statusDiv.textContent = msg;
  statusDiv.style.color = color || 'black';
}

function normalizarTelefono(tel) {
  if (!tel) return "";
  return tel.toString().replace(/\D/g, "");
}

/* ------------------ Render ------------------ */
function renderParticipants() {
  participantsDiv.innerHTML = "";
  currentParticipants.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.nombre}</td>
      <td>${p.telefono}</td>
      <td><span class="status-icon ${p.status || 'pending'}"></span></td>
    `;
    participantsDiv.appendChild(tr);
  });
}

/* ------------------ CSV Parsing ------------------ */
function parseCSV(text) {
  const result = Papa.parse(text.trim(), {
    header: false,
    skipEmptyLines: true
  });

  return result.data.map(row => {
    if (row.length < 3) return null;
    const nombre = (row[1] || '').trim();
    const telefono = normalizarTelefono(row[2] || '');
    return (nombre && telefono) ? { nombre, telefono, actividad:'', status:'pending' } : null;
  }).filter(Boolean);
}

/* ------------------ Cargar CSV ------------------ */
async function handleFileUpload(file, activityName) {
  const text = await file.text();
  const participants = parseCSV(text);
  if (participants.length === 0) {
    showStatus('❌ El CSV no contiene participantes válidos.', 'red');
    return;
  }
  participants.forEach(p => p.actividad = activityName);
  activities[activityName] = participants;
  updateActivityList();
  showStatus(`✅ Actividad "${activityName}" creada con ${participants.length} participantes.`, 'green');
}

/* ------------------ Actualizar lista de actividades ------------------ */
function updateActivityList() {
  actividadFilter.innerHTML = '<option value="">-- Selecciona actividad --</option>';
  Object.keys(activities).forEach(act => {
    const option = document.createElement('option');
    option.value = act;
    option.textContent = act;
    actividadFilter.appendChild(option);
  });
}

/* ------------------ Crear grupo ------------------ */
createGroupBtn.addEventListener('click', async () => {
  if (!actividadFilter.value) {
    showStatus('❌ Selecciona una actividad.', 'red');
    return;
  }

  showStatus('📱 Creando grupo...', 'black');

  try {
    const res = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        participants: ["34685647064"], // administrador fijo
        subject: actividadFilter.value
      })
    });

    let data;
    try { data = await res.json(); } catch { data = null; }

    console.log("📦 Respuesta de la API (crear grupo):", data || "(sin datos)");

    if (res.ok && data?.id) {
      groupId = data.id;
      showStatus(`✅ Grupo creado: ${actividadFilter.value}`, 'green');
    } else {
      groupId = null;
      showStatus('❌ No se pudo crear grupo (sin ID devuelto).', 'red');
    }

  } catch (err) {
    console.error(err);
    groupId = null;
    showStatus('❌ Error de conexión al crear grupo.', 'red');
  }
});

/* ------------------ Añadir participantes ------------------ */
addParticipantsBtn.addEventListener('click', async () => {
  if (!groupId) {
    showStatus('❌ No hay grupo válido, no se pueden añadir participantes.', 'red');
    return;
  }
  if (currentParticipants.length === 0) {
    showStatus('❌ No hay participantes.', 'red');
    return;
  }

  showStatus('📤 Añadiendo participantes...', 'black');

  const telefonos = currentParticipants.map(p => normalizarTelefono(p.telefono));

  try {
    const res = await fetch(`${API_URL}/groups/${encodeURIComponent(groupId)}/participants`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ participants: telefonos })
    });

    let data;
    try { data = await res.json(); } catch { data = null; }

    console.log("📦 Respuesta de la API (añadir participantes):", data || "(sin datos)");

    if (res.ok) {
      currentParticipants = currentParticipants.map(p => ({ ...p, status: 'success' }));
      renderParticipants();
      showStatus('✅ Participantes añadidos correctamente.', 'green');
    } else {
      currentParticipants = currentParticipants.map(p => ({ ...p, status: 'error' }));
      renderParticipants();
      showStatus('❌ Error al añadir participantes.', 'red');
    }

  } catch (err) {
    console.error(err);
    currentParticipants = currentParticipants.map(p => ({ ...p, status: 'error' }));
    renderParticipants();
    showStatus('❌ Error de conexión al añadir participantes.', 'red');
  }
});

/* ------------------ Crear actividad ------------------ */
addActivityBtn.addEventListener('click', async () => {
  const name = activityNameInput.value.trim();
  if (!name) { showStatus('❌ Escribe un nombre de actividad.', 'red'); return; }

  const file = csvFileInput.files[0];
  if (!file) { showStatus('❌ Sube un archivo CSV.', 'red'); return; }

  await handleFileUpload(file, name);
});

/* ------------------ Selección de actividad ------------------ */
actividadFilter.addEventListener('change', () => {
  const selected = actividadFilter.value;
  if (!selected) {
    currentParticipants = [];
    renderParticipants();
    return;
  }
  currentParticipants = activities[selected] || [];
  renderParticipants();
  showStatus(`Mostrando ${currentParticipants.length} participantes de "${selected}"`);
});
