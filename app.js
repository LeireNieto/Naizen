

/* ------------------ CONFIG SEGURA ------------------ */
// Variables de configuración - se cargan desde la interfaz del usuario
let API_URL = "";
let API_KEY = "";

// Función para inicializar configuración
function loadConfig() {
  const savedApiUrl = localStorage.getItem('naizen_api_url');
  const savedApiKey = localStorage.getItem('naizen_api_key');
  
  if (savedApiUrl && savedApiKey) {
    API_URL = savedApiUrl;
    API_KEY = savedApiKey;
    if (document.getElementById('apiUrl')) {
      document.getElementById('apiUrl').value = API_URL;
      document.getElementById('apiKey').value = '••••••••••••••••'; // Ocultar con puntos
    }
    showStatus('✅ Configuración cargada desde el almacenamiento local', 'green');
  } else {
    showStatus('⚠️ Configura tu API URL y Token para comenzar', 'orange');
  }
}

// Función para guardar configuración
function saveConfig() {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiUrl || !apiKey || apiKey === '••••••••••••••••') {
    showStatus('❌ Ingresa URL y Token válidos', 'red');
    return false;
  }
  
  API_URL = apiUrl;
  API_KEY = apiKey;
  
  localStorage.setItem('naizen_api_url', API_URL);
  localStorage.setItem('naizen_api_key', API_KEY);
  
  // Ocultar el token en la interfaz
  document.getElementById('apiKey').value = '••••••••••••••••';
  
  showStatus('✅ Configuración guardada de forma segura', 'green');
  return true;
}

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
const credencialesFileInput = document.getElementById('credencialesFile');

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
    const nombre = (row[1] || '').trim().replace(/,/g, '');
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

  mainSection.classList.remove('hidden');

  addActivityBtn.classList.remove('btn-active');
  addActivityBtn.classList.add('btn-done');
  actividadFilter.classList.add('btn-active');
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
  if (!validateConfig()) return;
  
  if (!actividadFilter.value) {
    showStatus('❌ Selecciona una actividad.', 'red');
    return;
  }

  const adminPhone = adminPhoneInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!adminPhone || !apiKey) {
    showStatus('❌ Debes completar Teléfono y API Key antes de crear el grupo.', 'red');
    if (!adminPhone) adminPhoneInput.style.border = '2px solid red'; else adminPhoneInput.style.border = '';
    if (!apiKey) apiKeyInput.style.border = '2px solid red'; else apiKeyInput.style.border = '';
    return;
  }

  adminPhoneInput.style.border = '';
  apiKeyInput.style.border = '';

  showStatus('📱 Creando grupo...', 'black');

  try {
    const res = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        participants: [normalizarTelefono(adminPhone)],
        subject: actividadFilter.value
      })
    });

    let data;
    try { data = await res.json(); } catch { data = null; }
    console.log("Respuesta crear grupo:", data);

    if (res.ok && data?.id) {
      groupId = data.id;
      showStatus(`✅ Grupo creado: ${actividadFilter.value}`, 'green');

      createGroupBtn.classList.remove('btn-active');
      createGroupBtn.classList.add('btn-done');
      addParticipantsBtn.classList.add('btn-active');

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

  if (!groupId) { showStatus('❌ Crea primero el grupo.', 'red'); return; }
  if (currentParticipants.length === 0) { showStatus('❌ No hay participantes.', 'red'); return; }



  showStatus('📤 Añadiendo participantes...', 'black');

  const adminPhone = normalizarTelefono(adminPhoneInput.value.trim());

  // Excluimos al admin de la lista de participantes a añadir
  const telefonos = currentParticipants
    .filter(p => esTelefonoValido(p.telefono) && normalizarTelefono(p.telefono) !== adminPhone)
    .map(p => normalizarTelefono(p.telefono));

  if (telefonos.length === 0) {
    showStatus('❌ Ningún número válido para añadir (solo está el admin o números inválidos).', 'red');
    return;
  }

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
    console.log("Respuesta añadir participantes:", data);

    // Actualizamos los estados
    currentParticipants = currentParticipants.map(p => {
      const tel = normalizarTelefono(p.telefono);

      if (!esTelefonoValido(p.telefono)) return { ...p, status: 'error' };
      if (tel === adminPhone) return { ...p, status: 'success' }; // admin siempre ok

      // Si hubo fallo y no es 409 del admin
      const fallo = data?.failed?.includes(tel);
      return fallo ? { ...p, status: 'error' } : { ...p, status: 'success' };
    });

    renderParticipants();
    showStatus('✅ Participantes añadidos correctamente.', 'green');
    addParticipantsBtn.classList.remove('btn-active');
    addParticipantsBtn.classList.add('btn-done');

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
  currentParticipants = selected ? (activities[selected] || []) : [];
  renderParticipants();
  showStatus(`Mostrando ${currentParticipants.length} participantes de "${selected}"`);
  actividadFilter.classList.remove('btn-active');
  actividadFilter.classList.add('btn-done');
  createGroupBtn.classList.add('btn-active'); // siguiente paso
});

/* ------------------ Configuración API ------------------ */
document.addEventListener('DOMContentLoaded', () => {
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', () => {
      if (saveConfig()) {
        // Habilitar botones una vez configurado
        createGroupBtn.disabled = false;
        addParticipantsBtn.disabled = false;
      }
    });
  }
  
  loadConfig();
  
  // Deshabilitar botones hasta configurar API
  if (!API_URL || !API_KEY) {
    createGroupBtn.disabled = true;
    addParticipantsBtn.disabled = true;
  }
});

/* ------------------ Validar configuración antes de usar API ------------------ */
function validateConfig() {
  if (!API_URL || !API_KEY) {
    showStatus('❌ Configura primero tu API URL y Token', 'red');
    return false;
  }
  return true;
}

/* ------------------ Cargar credenciales desde JSON ------------------ */
credencialesFileInput?.addEventListener('change', async () => {
  const file = credencialesFileInput.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.telefono) { adminPhoneInput.value = data.telefono; adminPhoneInput.readOnly = true; }
    if (data.apiKey) { apiKeyInput.value = data.apiKey; apiKeyInput.readOnly = true; }
    if (data.apiUrl) { API_URL = data.apiUrl; }

    showStatus("✅ Credenciales cargadas correctamente.", "green");
    console.log("API_URL cargada:", API_URL);
  } catch (err) {
    console.error(err);
    showStatus("❌ Error al leer el archivo de credenciales.", "red");
  }
});

