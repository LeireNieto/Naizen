/* ------------------ Configuración inicial ------------------ */
let API_URL = "";

const configSection = document.getElementById('configSection');
const activitySection = document.getElementById('activitySection');
const mainSection = document.getElementById('mainSection');

const adminPhoneInput = document.getElementById('adminPhone');
const apiKeyInput = document.getElementById('apiKey');
const apiUrlInput = document.getElementById('apiUrl');
const credencialesFileInput = document.getElementById('credencialesFile');

/* ------------------ Inicial: mostrar inputs vacíos y botón examinar ------------------ */
adminPhoneInput.value = "";
apiKeyInput.value = "";
apiUrlInput.value = "";

adminPhoneInput.style.display = "inline-block";
apiKeyInput.style.display = "inline-block";
apiUrlInput.style.display = "inline-block";

/* ------------------ Asegurar que la configuración inicial sea visible ------------------ */
configSection.classList.remove('hidden');
activitySection.classList.add('hidden');
mainSection.classList.add('hidden');

/* ------------------ Estado y DOM para actividades ------------------ */
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const createGroupBtn = document.getElementById('createGroupBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');

const activityNameInput = document.getElementById('activityName');
const csvFileInput = document.getElementById('csvFile');
const addActivityBtn = document.getElementById('addActivityBtn');
const activityStatusDiv = document.getElementById('activityStatus');

let activities = {};
let currentParticipants = [];
let currentActivityName = "";
let groupId = null;

/* ------------------ Helpers ------------------ */
function showActivityStatus(msg, type = '') {
  activityStatusDiv.textContent = msg;
  activityStatusDiv.className = `activity-status ${type}`;
}

function resetToInitialConfig() {
  // Mostrar solo la sección de configuración
  configSection.classList.remove('hidden');
  activitySection.classList.add('hidden');
  mainSection.classList.add('hidden');
  
  // Limpiar formularios
  adminPhoneInput.value = "";
  apiKeyInput.value = "";
  apiUrlInput.value = "";
  credencialesFileInput.value = "";
  activityNameInput.value = "";
  csvFileInput.value = "";
  
  // Limpiar estados
  showActivityStatus('');
  activities = {};
  currentParticipants = [];
  groupId = null;
  
  // Resetear filtros y botones
  actividadFilter.innerHTML = '<option value="">-- Selecciona actividad --</option>';
  
}

function construirURL(base, endpoint) {
  // Eliminar barra final de base y barra inicial de endpoint si existen
  const baseClean = base.replace(/\/+$/, '');
  const endpointClean = endpoint.replace(/^\/+/, '');
  return `${baseClean}/${endpointClean}`;
}

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
  const result = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
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

/* ------------------ Cargar CSV y crear actividad ------------------ */
async function handleFileUpload(file, activityName) {
  const text = await file.text();
  const participants = parseCSV(text);
  if (participants.length === 0) {
    showStatus('❌ El CSV no contiene participantes válidos.', 'red');
    return;
  }
  participants.forEach(p => p.actividad = activityName);
  activities[activityName] = participants;
  
  // Configurar actividad actual automáticamente
  currentActivityName = activityName;
  currentParticipants = participants;
  
  showActivityStatus(`✅ Actividad "${activityName}" creada con ${participants.length} participantes.`, 'success');

  // Ocultar texto de ayuda del CSV
  const csvHelp = document.getElementById('csvHelp');
  if (csvHelp) csvHelp.style.display = 'none';

  // Mostrar participantes directamente
  renderParticipants();
  mainSection.classList.remove('hidden');
  addActivityBtn.classList.remove('btn-active');
  addActivityBtn.classList.add('btn-done');
  createGroupBtn.classList.add('btn-active');
  showStatus(`Actividad "${activityName}" lista. Puedes crear el grupo de WhatsApp.`, 'green');
}

/* ------------------ Event listeners para limpiar mensajes de error ------------------ */
activityNameInput.addEventListener('input', () => {
  if (activityStatusDiv.textContent.includes('nombre')) {
    showActivityStatus('');
  }
});

csvFileInput.addEventListener('change', () => {
  if (activityStatusDiv.textContent.includes('CSV')) {
    showActivityStatus('');
  }
});

/* ------------------ Eventos de actividades y grupos ------------------ */
addActivityBtn.addEventListener('click', async () => {
  const name = activityNameInput.value.trim();
  const file = csvFileInput.files[0];
  
  // Limpiar mensaje anterior
  showActivityStatus('');
  
  // Validar nombre de actividad
  if (!name) { 
    showActivityStatus('❌ Por favor, escribe un nombre para la actividad.', 'error'); 
    return; 
  }
  
  // Validar archivo CSV
  if (!file) { 
    showActivityStatus('❌ Por favor, selecciona un archivo CSV.', 'error'); 
    return; 
  }
  
  await handleFileUpload(file, name);
});

createGroupBtn.addEventListener('click', async () => {
  if (!currentActivityName) { showStatus('❌ Primero crea una actividad.', 'red'); return; }
  const adminPhone = adminPhoneInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  if (!adminPhone || !apiKey) {
    showStatus('❌ Debes completar Teléfono y API Key.', 'red');
    return;
  }
  showStatus('📱 Creando grupo...', 'black');
  try {
    const res = await fetch(construirURL(API_URL, '/groups'), {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ participants: [normalizarTelefono(adminPhone)], subject: currentActivityName })
    });
    let data; try { data = await res.json(); } catch { data = null; }
    if (res.ok && data?.id) {
      groupId = data.id;
      showStatus(`✅ Grupo creado: ${currentActivityName}`, 'green');
      createGroupBtn.classList.remove('btn-active'); createGroupBtn.classList.add('btn-done');
      addParticipantsBtn.classList.add('btn-active');
    } else { groupId = null; showStatus('❌ Error al crear grupo.', 'red'); }
  } catch (err) { console.error(err); showStatus('❌ Error de conexión al crear grupo.', 'red'); }
});

addParticipantsBtn.addEventListener('click', async () => {
  if (!groupId) { showStatus('❌ Crea primero el grupo.', 'red'); return; }
  if (currentParticipants.length === 0) { showStatus('❌ No hay participantes.', 'red'); return; }
  showStatus('📤 Añadiendo participantes...', 'black');
  const adminPhone = normalizarTelefono(adminPhoneInput.value.trim());
  const telefonos = currentParticipants
    .filter(p => esTelefonoValido(p.telefono) && normalizarTelefono(p.telefono) !== adminPhone)
    .map(p => normalizarTelefono(p.telefono));
  if (telefonos.length === 0) { showStatus('❌ Ningún número válido para añadir.', 'red'); return; }
  try {
    const res = await fetch(construirURL(API_URL, `/groups/${encodeURIComponent(groupId)}/participants`), {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKeyInput.value.trim()}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ participants: telefonos })
    });
    let data; try { data = await res.json(); } catch { data = null; }
    currentParticipants = currentParticipants.map(p => {
      const tel = normalizarTelefono(p.telefono);
      if (!esTelefonoValido(p.telefono)) return { ...p, status: 'error' };
      if (tel === adminPhone) return { ...p, status: 'success' };
      const fallo = data?.failed?.includes(tel);
      return fallo ? { ...p, status: 'error' } : { ...p, status: 'success' };
    });
    renderParticipants();
    showStatus('✅ Participantes añadidos correctamente.', 'green');
    addParticipantsBtn.classList.remove('btn-active'); addParticipantsBtn.classList.add('btn-done');
  } catch (err) { console.error(err); showStatus('❌ Error de conexión al añadir participantes.', 'red'); }
});

/* ------------------ Cargar credenciales desde JSON ------------------ */
credencialesFileInput.addEventListener('change', async () => {
  const file = credencialesFileInput.files[0];
  if (!file) { showStatus('❌ Selecciona un archivo JSON.', 'red'); return; }

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.telefono || !data.apiKey || !data.apiUrl) { showStatus('❌ JSON inválido.', 'red'); return; }

    // Rellenar campos
    adminPhoneInput.value = data.telefono;      // se ve ahora
    apiKeyInput.value = data.apiKey;
    apiUrlInput.value = data.apiUrl;

    // Teléfono visible, API Key y URL codificados
    adminPhoneInput.type = "text";
    apiKeyInput.type = "password";
    apiUrlInput.type = "password";

    API_URL = data.apiUrl;

    // Ocultar texto de ayuda de configuración
    const configHelp = document.getElementById('configHelp');
    if (configHelp) configHelp.style.display = 'none';

    // Ocultar sección de credenciales
    configSection.style.display = "none";

    // Mostrar sección de crear actividad
    activitySection.classList.remove("hidden");

    showStatus("✅ Credenciales cargadas, ingresa la actividad.", "green");

  } catch (err) {
    console.error(err);
    showStatus("❌ Error al leer el archivo JSON.", "red");
  }
});


