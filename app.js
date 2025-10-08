/* ------------------ CONFIG ------------------ */
const API_URL = "https://naizenpf5.free.beeceptor.com"; // o el real luego
const API_KEY = "RiNr52I9SoPGV6ccVuF7LqPWx6IuT900";

/* ------------------ Estado y DOM ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const createGroupBtn = document.getElementById('createGroupBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');

const activityNameInput = document.getElementById('activityName');
const csvFileInput = document.getElementById('csvFile');
const addActivityBtn = document.getElementById('addActivityBtn');

let activities = {};
let currentParticipants = [];
let groupId = null;

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
    skipEmptyLines: true,
  });

  return result.data.map(row => {
    if (row.length < 3) return null;
    const nombre = (row[1] || '').trim();
    const telefono = normalizarTelefono(row[2] || '');
    return (nombre && telefono) ? { nombre, telefono, actividad: '', status: 'pending' } : null;
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
  const actividad = actividadFilter.value;
  if (!actividad) {
    showStatus('❌ Selecciona una actividad.', 'red');
    return;
  }

  showStatus('📱 Creando grupo...', 'black');

  try {
    const res = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        participants: ["34685647064"], // el admin (Naizen)
        subject: actividad
      })
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = null; // si la API simulada no devuelve JSON
    }

    if (res.ok) {
      groupId = data?.id || "grupo-simulado";
      showStatus(`✅ Grupo creado: ${actividad}`, 'green');
    } else {
      showStatus('❌ Error al crear el grupo.', 'red');
    }

    console.log("📦 Respuesta de la API:", data || "(sin datos)");

  } catch (err) {
    console.error("🚨 Error al crear grupo:", err);
    showStatus('❌ Error en la conexión.', 'red');
  }
});

/* ------------------ Añadir participantes (enviar mensajes) ------------------ */
addParticipantsBtn.addEventListener('click', async () => {
  if (!groupId) {
    showStatus('❌ Crea primero el grupo.', 'red');
    return;
  }
  if (!currentParticipants.length) {
    showStatus('❌ No hay participantes.', 'red');
    return;
  }

  showStatus('📤 Añadiendo participantes...', 'black');

  for (let p of currentParticipants) {
    // aquí solo simulamos el envío
    p.status = 'success';
    renderParticipants();
  }

  showStatus('✅ Participantes añadidos (simulado).', 'green');
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
