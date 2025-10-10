/* ------------------ CONFIG ------------------ */
const API_URL = "https://naizenpf5.free.beeceptor.com";

/* ------------------ Estado y DOM ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const createGroupBtn = document.getElementById('createGroupBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');
const mainSection = document.getElementById('mainSection');

const activityNameInput = document.getElementById('activityName');
const csvFileInput = document.getElementById('csvFile');
const addActivityBtn = document.getElementById('addActivityBtn');

const adminPhoneInput = document.getElementById('adminPhone');
const apiKeyInput = document.getElementById('apiKey');

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
  let numero = tel.toString().replace(/\D/g, "");
  if (/^[67]\d{8}$/.test(numero)) numero = "34" + numero;
  return numero;
}

function esTelefonoValido(tel) {
  return (/^[67]\d{8}$/).test(tel) || (/^34[67]\d{8}$/).test(tel);
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

  return result.data.slice(1).map(row => {
    if (row.length < 3) return null;
    const nombre = (row[1] || '').trim().replace(/,/g, ''); // elimina comas
    let telefono = normalizarTelefono(row[2] || '');
    const valido = esTelefonoValido(telefono);

    return (nombre && telefono)
      ? { nombre, telefono, actividad: '', status: valido ? 'pending' : 'error' }
      : null;
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

  // Mostrar la parte inferior
  mainSection.classList.remove('hidden');

  // Actualizar colores de botones
  addActivityBtn.classList.remove('btn-active');
  addActivityBtn.classList.add('btn-done');
  actividadFilter.classList.add('btn-active'); // siguiente paso
}

/* ------------------ Actualizar lista ------------------ */
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

  // 🔒 Validar Teléfono y API Key antes de continuar
  const adminPhone = adminPhoneInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!adminPhone || !apiKey) {
    showStatus('❌ Debes completar el Teléfono y el API Key antes de crear el grupo.', 'red');

    if (!adminPhone) adminPhoneInput.style.border = '2px solid red';
    else adminPhoneInput.style.border = '';

    if (!apiKey) apiKeyInput.style.border = '2px solid red';
    else apiKeyInput.style.border = '';

    return;
  }

  adminPhoneInput.style.border = '';
  apiKeyInput.style.border = '';

  showStatus('📱 Creando grupo...', 'black');

  try {
    const res = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        participants: [normalizarTelefono(adminPhone)],
        subject: actividadFilter.value
      })
    });

    let data;
    try { data = await res.json(); } catch { data = null; }

    if (res.ok && data?.id) {
      groupId = data.id;
      showStatus(`✅ Grupo creado: ${actividadFilter.value}`, 'green');

      // actualizar botones
      createGroupBtn.classList.remove('btn-active');
      createGroupBtn.classList.add('btn-done');
      addParticipantsBtn.classList.add('btn-active'); // siguiente paso

    } else {
      groupId = null;
      showStatus('❌ Error al crear grupo.', 'red');
    }

  } catch (err) {
    console.error(err);
    showStatus('❌ Error de conexión al crear grupo.', 'red');
  }
});

/* ------------------ Añadir participantes ------------------ */
addParticipantsBtn.addEventListener('click', async () => {
  if (!groupId) {
    showStatus('❌ Crea primero el grupo.', 'red');
    return;
  }
  if (currentParticipants.length === 0) {
    showStatus('❌ No hay participantes.', 'red');
    return;
  }

  showStatus('📤 Añadiendo participantes...', 'black');

  const telefonos = currentParticipants
    .filter(p => esTelefonoValido(p.telefono))
    .map(p => normalizarTelefono(p.telefono));

  try {
    const res = await fetch(`${API_URL}/groups/${encodeURIComponent(groupId)}/participants`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKeyInput.value.trim()}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ participants: telefonos })
    });

    let data;
    try { data = await res.json(); } catch { data = null; }

    if (res.ok && data?.processed) {
      currentParticipants = currentParticipants.map(p => {
        if (!esTelefonoValido(p.telefono)) return { ...p, status: 'error' };
        return data.failed?.includes(p.telefono)
          ? { ...p, status: 'error' }
          : { ...p, status: 'success' };
      });
      renderParticipants();
      showStatus('✅ Participantes añadidos correctamente.', 'green');

      addParticipantsBtn.classList.remove('btn-active');
      addParticipantsBtn.classList.add('btn-done');

    } else {
      currentParticipants = currentParticipants.map(p => ({ ...p, status: 'error' }));
      renderParticipants();
      showStatus('❌ Error al añadir participantes.', 'red');
    }

  } catch (err) {
    console.error(err);
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

  actividadFilter.classList.remove('btn-active');
  actividadFilter.classList.add('btn-done');
  createGroupBtn.classList.add('btn-active');
});
