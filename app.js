/* ------------------ CONFIG ------------------ */
const API_URL = "https://api.whatsappprovider.com/v1"; // URL de tu proveedor
const API_KEY = "RINr52I95oPGV6ccVuF7LqPWx6IuT900"; // Tu API Key

/* ------------------ Estado y DOM ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');

const activityNameInput = document.getElementById('activityName');
const csvFileInput = document.getElementById('csvFile');
const addActivityBtn = document.getElementById('addActivityBtn');

let activities = {};  // { actividad: [participantes] }
let currentParticipants = [];

/* ------------------ Helpers ------------------ */
function showStatus(msg, color){
  statusDiv.textContent = msg;
  statusDiv.style.color = color || 'black';
}

function normalizarTelefono(tel){
  if(!tel) return "";
  return tel.toString().replace(/\D/g, ""); // sin símbolos ni espacios
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

/* ------------------ Eventos ------------------ */
// Mostrar siempre el input de archivo CSV
csvFileInput.style.display = 'block';

// Crear actividad solo con CSV
addActivityBtn.addEventListener('click', async () => {
  const name = activityNameInput.value.trim();
  if(!name){ showStatus('❌ Escribe un nombre de actividad.', 'red'); return; }

  const file = csvFileInput.files[0];
  if(!file){ showStatus('❌ Sube un archivo CSV.', 'red'); return; }

  await handleFileUpload(file, name);
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

/* ------------------ Enviar mensajes reales ------------------ */
async function enviarMensaje(telefono, texto){
  try{
    const res = await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: telefono,
        type: "text",
        text: { body: texto }
      })
    });
    await res.json(); // leer respuesta
    return res.ok;
  } catch(err){
    console.error(err);
    return false;
  }
}

addParticipantsBtn.addEventListener('click', async () => {
  if(!currentParticipants.length){
    showStatus('❌ No hay participantes.', 'red');
    return;
  }

  showStatus('Enviando mensajes...', 'black');

  for(let p of currentParticipants){
    const texto = `Hola ${p.nombre}, te confirmo para la actividad ${actividadFilter.value}`;
    const exito = await enviarMensaje(normalizarTelefono(p.telefono), texto);
    p.status = exito ? 'success' : 'error';
    renderParticipants();
  }

  showStatus('✅ Mensajes enviados (revisa los estados)', 'green');
});
