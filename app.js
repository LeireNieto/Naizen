/* ------------------ CONFIG ------------------ */
// API de tu profesor (Beeceptor, usada para pruebas)
const API_URL = "https://naizenpf5.free.beeceptor.com";
const TOKEN = "RiNr52I9SoPGV6ccVuF7LqPWx6IuT900"; 

// Número administrador (el que crea el grupo)
const ADMIN_PHONE = "34685647064";

/* ------------------ Estado y DOM ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const createGroupBtn = document.getElementById('createGroupBtn');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');

const activityNameInput = document.getElementById('activityName');
const csvFileInput = document.getElementById('csvFile');
const addActivityBtn = document.getElementById('addActivityBtn');

let activities = {};  // { actividad: [participantes] }
let currentParticipants = [];
let groupId = null;

/* ------------------ Helpers ------------------ */
function showStatus(msg, color){
  statusDiv.textContent = msg;
  statusDiv.style.color = color || 'black';
}

function normalizarTelefono(tel){
  if(!tel) return "";
  return tel.toString().replace(/\D/g, ""); // elimina símbolos y espacios
}

/* ------------------ Render ------------------ */
function renderParticipants(){
  participantsDiv.innerHTML = "";
  currentParticipants.forEach(p => {
    const tr = document.createElement('tr');

    const tdNombre = document.createElement('td'); 
    tdNombre.textContent = p.nombre;

    const tdTelefono = document.createElement('td'); 
    tdTelefono.textContent = p.telefono;

    const tdEstado = document.createElement('td');
    tdEstado.innerHTML = `<span class="status-icon ${p.status || 'pending'}"></span>`;

    tr.appendChild(tdNombre);
    tr.appendChild(tdTelefono);
    tr.appendChild(tdEstado);
    participantsDiv.appendChild(tr);
  });
}

/* ------------------ CSV Parsing ------------------ */
function parseCSV(text){
  const result = Papa.parse(text.trim(), {
    header: false,
    skipEmptyLines: true,
    delimiter: "" // autodetecta coma, punto y coma o tab
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

/* ------------------ Crear grupo en WhatsApp ------------------ */
createGroupBtn.addEventListener('click', async () => {
  if (!actividadFilter.value) {
    showStatus('❌ Selecciona una actividad.', 'red');
    return;
  }

  const nombreActividad = actividadFilter.value;

  // 🕒 Generar automáticamente nombre de grupo con mes y año
  const fecha = new Date();
  const opciones = { month: 'short', day: '2-digit' };
  const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones).replace('.', '');
  const nombreGrupo = `${nombreActividad} ${fechaFormateada}`;

  showStatus(`📱 Creando grupo "${nombreGrupo}"...`, 'black');

  try {
    const res = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${TOKEN}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        participants: [ADMIN_PHONE],
        subject: nombreGrupo
      })
    });

    const data = await res.json();
    console.log("Respuesta crear grupo:", data);

    if (res.ok) {
      groupId = data.id || data.groupId || "grupo-simulado";
      showStatus(`✅ Grupo "${nombreGrupo}" creado correctamente.`, 'green');
    } else {
      throw new Error('Error al crear grupo');
    }
  } catch (err) {
    console.error(err);
    showStatus('❌ Error creando grupo en WhatsApp.', 'red');
  }
});

/* ------------------ Añadir participantes al grupo ------------------ */
addParticipantsBtn.addEventListener('click', async () => {
  if(!groupId){ 
    showStatus('❌ Crea primero el grupo.', 'red'); 
    return; 
  }
  if(!currentParticipants.length){
    showStatus('❌ No hay participantes.', 'red');
    return;
  }

  showStatus('👥 Añadiendo participantes al grupo...', 'black');

  try {
    const telefonos = currentParticipants.map(p => normalizarTelefono(p.telefono));
    const res = await fetch(`${API_URL}/groups/${encodeURIComponent(groupId)}/participants`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${TOKEN}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ participants: telefonos })
    });

    const data = await res.json();
    console.log("Respuesta añadir participantes:", data);

    currentParticipants = currentParticipants.map(p => ({
      ...p,
      status: res.ok ? 'success' : 'error'
    }));
    renderParticipants();

    showStatus(res.ok 
      ? '✅ Participantes añadidos correctamente.' 
      : '❌ Error al añadir participantes.', 
      res.ok ? 'green' : 'red'
    );
  } catch(err){
    console.error(err);
    showStatus('❌ Error de conexión al añadir participantes.', 'red');
  }
});

/* ------------------ Crear actividad desde CSV ------------------ */
csvFileInput.style.display = 'block';

addActivityBtn.addEventListener('click', async () => {
  const name = activityNameInput.value.trim();
  if(!name){ showStatus('❌ Escribe un nombre de actividad.', 'red'); return; }

  const file = csvFileInput.files[0];
  if(!file){ showStatus('❌ Sube un archivo CSV.', 'red'); return; }

  await handleFileUpload(file, name);
});

/* ------------------ Seleccionar una actividad ------------------ */
actividadFilter.addEventListener('change', () => {
  const selected = actividadFilter.value;
  if(!selected){
    currentParticipants = [];
    renderParticipants();
    return;
  }
  currentParticipants = activities[selected] || [];
  renderParticipants();
  showStatus(`Mostrando ${currentParticipants.length} participantes de "${selected}"`);
});
