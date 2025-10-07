/* ------------------ CONFIG ------------------ */
const API_URL = "https://naizenpf5.free.beeceptor.com";
const API_KEY = "RiNr52I9SoPGV6ccVuF7LqPWx6IuT900";

/* ------------------ Estado y DOM ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const createGroupBtn = document.getElementById('createGroupBtn');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');
const groupNameDisplay = document.getElementById('groupNameDisplay');

const activityNameInput = document.getElementById('activityName');
const csvFileInput = document.getElementById('csvFile');
const addActivityBtn = document.getElementById('addActivityBtn');

let activities = {};  
let currentParticipants = [];
let groupId = null;

/* ------------------ Helpers ------------------ */
function showStatus(msg, color){
  statusDiv.textContent = msg;
  statusDiv.style.color = color || 'black';
}

function normalizarTelefono(tel){
  if(!tel) return "";
  return tel.toString().replace(/\D/g, "");
}

/* ------------------ Render ------------------ */
function renderParticipants(){
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
function parseCSV(text){
  const result = Papa.parse(text.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  return result.data.map(row => {
    if (row.length < 3) return null;
    const nombre = (row[1] || '').trim();
    const telefono = normalizarTelefono(row[2] || '');
    return (nombre && telefono) ? { nombre, telefono, actividad:'', status:'pending' } : null;
  }).filter(Boolean);
}

/* ------------------ Cargar CSV ------------------ */
async function handleFileUpload(file, activityName){
  const text = await file.text();
  const participants = parseCSV(text);
  if(participants.length === 0){
    showStatus('❌ El CSV no contiene participantes válidos.', 'red');
    return;
  }
  participants.forEach(p => p.actividad = activityName);
  activities[activityName] = participants;
  updateActivityList();
  showStatus(`✅ Actividad "${activityName}" creada con ${participants.length} participantes.`, 'green');
}

/* ------------------ Actualizar lista de actividades ------------------ */
function updateActivityList(){
  actividadFilter.innerHTML = '<option value="">-- Selecciona actividad --</option>';
  Object.keys(activities).forEach(act => {
    const option = document.createElement('option');
    option.value = act;
    option.textContent = act;
    actividadFilter.appendChild(option);
  });
}

/* ------------------ Eventos ------------------ */
csvFileInput.style.display = 'block';

addActivityBtn.addEventListener('click', async () => {
  const name = activityNameInput.value.trim();
  if(!name){ showStatus('❌ Escribe un nombre de actividad.', 'red'); return; }

  const file = csvFileInput.files[0];
  if(!file){ showStatus('❌ Sube un archivo CSV.', 'red'); return; }

  await handleFileUpload(file, name);
});

actividadFilter.addEventListener('change', () => {
  const selected = actividadFilter.value;
  currentParticipants = selected ? activities[selected] || [] : [];
  renderParticipants();
  showStatus(selected ? `Mostrando ${currentParticipants.length} participantes de "${selected}"` : 'Esperando acción...');
});

/* ------------------ Crear grupo en WhatsApp ------------------ */
createGroupBtn.addEventListener('click', async () => {
  const actividad = actividadFilter.value;
  if(!actividad){
    showStatus('❌ Selecciona una actividad.', 'red');
    return;
  }

  showStatus('Creando grupo...', 'black');
  groupNameDisplay.textContent = "";

  try {
    const res = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        participants: ["34685647064"], // teléfono del administrador
        subject: actividad
      })
    });

    const data = await res.json();
    groupId = data.id || data.groupId || 'grupo-simulado';

    if (res.ok) {
      showStatus(`✅ Grupo "${actividad}" creado correctamente.`, 'green');
      groupNameDisplay.textContent = `Grupo creado: "${actividad}"`;
    } else {
      showStatus('❌ Error al crear el grupo.', 'red');
    }
  } catch(err){
    console.error(err);
    showStatus('❌ Error en la conexión con la API.', 'red');
  }
});

/* ------------------ Añadir participantes ------------------ */
addParticipantsBtn.addEventListener('click', async () => {
  if(!groupId){
    showStatus('❌ Crea primero el grupo.', 'red');
    return;
  }
  if(currentParticipants.length === 0){
    showStatus('❌ No hay participantes.', 'red');
    return;
  }

  showStatus('Añadiendo participantes...', 'black');

  try {
    const telefonos = currentParticipants.map(p => normalizarTelefono(p.telefono));
    const res = await fetch(`${API_URL}/groups/${encodeURIComponent(groupId)}/participants`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ participants: telefonos })
    });

    if (res.ok) {
      currentParticipants = currentParticipants.map(p => ({ ...p, status: 'success' }));
      renderParticipants();
      showStatus('✅ Participantes añadidos correctamente.', 'green');
    } else {
      throw new Error("Error al añadir participantes");
    }
  } catch (err) {
    console.error(err);
    currentParticipants = currentParticipants.map(p => ({ ...p, status: 'error' }));
    renderParticipants();
    showStatus('❌ Error al añadir participantes.', 'red');
  }
});
