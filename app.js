/* ------------------ CONFIG ------------------ */
// API de WhatsApp (puedes dejar vacío si es solo simulación)
const API_URL = "";
const TOKEN = "";

/* ------------------ Estado y DOM ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const createGroupBtn = document.getElementById('createGroupBtn');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');

// Formulario para crear actividad
const activityNameInput = document.getElementById('activityName');
const inputMethod = document.getElementById('inputMethod');
const csvFileInput = document.getElementById('csvFile');
const sheetUrlInput = document.getElementById('sheetUrl');
const pasteDataTextarea = document.getElementById('pasteData');
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
  return tel.toString().replace(/\D/g, "");
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
    if (row.length < 3) return null; // aseguramos que tenga al menos 3 columnas
    const nombre = (row[1] || '').trim(); // columna 2
    const telefono = normalizarTelefono(row[2] || ''); // columna 3
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

/* ------------------ Cargar desde URL ------------------ */
async function handleURLInput(url, activityName){
  try {
    const response = await fetch(url);
    if(!response.ok) throw new Error("No se pudo leer el archivo remoto");
    const text = await response.text();
    const participants = parseCSV(text);
    if(participants.length === 0){
      showStatus('❌ El CSV remoto no tiene participantes válidos.', 'red');
      return;
    }
    participants.forEach(p => p.actividad = activityName);
    activities[activityName] = participants;
    updateActivityList();
    showStatus(`✅ Actividad "${activityName}" importada desde URL con ${participants.length} participantes.`, 'green');
  } catch (err){
    console.error(err);
    showStatus('❌ Error leyendo el archivo remoto: ' + err.message, 'red');
  }
}

/* ------------------ Cargar desde Copy & Paste ------------------ */
function handlePasteData(data, activityName){
  const participants = parseCSV(data);
  if(participants.length === 0){
    showStatus('❌ Los datos pegados no tienen participantes válidos.', 'red');
    return;
  }
  participants.forEach(p => p.actividad = activityName);
  activities[activityName] = participants;
  updateActivityList();
  showStatus(`✅ Actividad "${activityName}" creada desde datos pegados (${participants.length} participantes).`, 'green');
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
// Mostrar input correcto según el método elegido
inputMethod.addEventListener('change', () => {
  csvFileInput.style.display = 'none';
  sheetUrlInput.style.display = 'none';
  pasteDataTextarea.style.display = 'none';

  if(inputMethod.value === 'csv') csvFileInput.style.display = 'block';
  if(inputMethod.value === 'url') sheetUrlInput.style.display = 'block';
  if(inputMethod.value === 'paste') pasteDataTextarea.style.display = 'block';
});

// Crear actividad según método
addActivityBtn.addEventListener('click', async () => {
  const name = activityNameInput.value.trim();
  const method = inputMethod.value;

  if(!name){ showStatus('❌ Escribe un nombre de actividad.', 'red'); return; }
  if(!method){ showStatus('❌ Selecciona un método de carga.', 'red'); return; }

  if(method === 'csv'){
    const file = csvFileInput.files[0];
    if(!file){ showStatus('❌ Sube un archivo CSV.', 'red'); return; }
    await handleFileUpload(file, name);
  } else if(method === 'url'){
    const url = sheetUrlInput.value.trim();
    if(!url){ showStatus('❌ Escribe la URL del CSV.', 'red'); return; }
    await handleURLInput(url, name);
  } else if(method === 'paste'){
    const data = pasteDataTextarea.value.trim();
    if(!data){ showStatus('❌ Pega los datos del CSV.', 'red'); return; }
    handlePasteData(data, name);
  }
});

// Seleccionar una actividad del filtro
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

// Crear grupo en WhatsApp
createGroupBtn.addEventListener('click', async () => {
  if(!actividadFilter.value){ showStatus('❌ Selecciona una actividad.', 'red'); return; }
  if(currentParticipants.length===0){ showStatus('❌ No hay participantes.', 'red'); return; }

  showStatus('Creando grupo...', 'black');

  if(API_URL && TOKEN){
    try {
      const res = await fetch(`${API_URL}/groups`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: actividadFilter.value,
          participants: [normalizarTelefono(currentParticipants[0].telefono)]
        })
      });
      const data = await res.json();
      groupId = data.id || data.groupId;
      showStatus(groupId ? `✅ Grupo creado (id: ${groupId})` : '❌ Error creando grupo', groupId ? 'green' : 'red');
    } catch(err) {
      console.error(err);
      showStatus('❌ Error creando grupo real', 'red');
    }
  } else {
    groupId = 'grupo-simulado-123';
    showStatus(`✅ Grupo creado (simulado)`, 'green');
  }
});

// Añadir participantes al grupo
addParticipantsBtn.addEventListener('click', async () => {
  if(!groupId){ showStatus('❌ Crea primero el grupo.', 'red'); return; }
  if(currentParticipants.length===0){ showStatus('❌ No hay participantes.', 'red'); return; }

  if(API_URL && TOKEN){
    try {
      const telefonos = currentParticipants.map(p => normalizarTelefono(p.telefono));
      const res = await fetch(`${API_URL}/groups/${encodeURIComponent(groupId)}/participants`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ participants: telefonos })
      });
      const data = await res.json();
      currentParticipants = currentParticipants.map(p=>({...p,status: res.ok ? 'success' : 'error'}));
      renderParticipants();
      showStatus(res.ok ? '✅ Participantes añadidos.' : '❌ Error al añadir participantes.', res.ok ? 'green' : 'red');
    } catch(err){
      console.error(err);
      currentParticipants = currentParticipants.map(p=>({...p,status:'error'}));
      renderParticipants();
      showStatus('❌ Error añadiendo participantes', 'red');
    }
  } else {
    currentParticipants = currentParticipants.map(p=>({...p,status:'success'}));
    renderParticipants();
    showStatus('✅ Participantes añadidos (simulado).', 'green');
  }
});
