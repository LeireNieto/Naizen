/* ------------------ CONFIG ------------------ */
// Poner tu API real de WhatsApp aquí si la tienes
const API_URL = ""; // Ej: "https://graph.facebook.com/v16.0/NUMERO_PHONE_ID"
const TOKEN = "";   // Tu token real de WhatsApp Cloud API

/* ------------------ Estado y DOM ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const importBtn = document.getElementById('importBtn');
const createGroupBtn = document.getElementById('createGroupBtn');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');

let groupId = null;
let allParticipants = []; // Todos los participantes del CSV
let participants = [];    // Participantes filtrados por actividad

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
  participants.forEach(p => {
    const tr = document.createElement('tr');

    const tdNombre = document.createElement('td'); 
    tdNombre.textContent = p.nombre;

    const tdTelefono = document.createElement('td'); 
    tdTelefono.textContent = p.telefono;

    const tdWhatsApp = document.createElement('td');
    const textMsg = `Hola ${p.nombre}, te confirmo para la actividad ${p.actividad}`;
    tdWhatsApp.innerHTML = `
      <a class="whatsapp" href="https://wa.me/${encodeURIComponent(normalizarTelefono(p.telefono))}?text=${encodeURIComponent(textMsg)}" target="_blank">
        <i class="fab fa-whatsapp"></i>
      </a>
      <span class="status-icon ${p.status || 'pending'}"></span>
    `;

    tr.appendChild(tdNombre);
    tr.appendChild(tdTelefono);
    tr.appendChild(tdWhatsApp);

    participantsDiv.appendChild(tr);
  });
}

/* ------------------ Inicializar CSV ------------------ */
async function loadCSVandFillActivities(){
  try {
    const resp = await fetch('./participantes.csv');
    if(!resp.ok) throw new Error('No se pudo cargar el CSV local');
    const csvText = await resp.text();
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        allParticipants = results.data.map(r => {
          const nombre = (r['Nombre']?.trim() || r['name']?.trim() || '');
          const telefono = (r['Teléfono']?.trim() || r['Telefono']?.trim() || r['telefono']?.trim() || r['phone']?.trim() || '');
          const actividad = (r['Actividad']?.trim() || r['actividad']?.trim() || '');
          return { nombre, telefono: normalizarTelefono(telefono), actividad, status:'pending' };
        }).filter(p => p.nombre && p.telefono && p.actividad);

        // Llenar select de actividades
        const actividades = [...new Set(allParticipants.map(p => p.actividad))];
        actividadFilter.innerHTML = '<option value="">-- Selecciona actividad --</option>';
        actividades.forEach(act => {
          const option = document.createElement('option');
          option.value = act; option.textContent = act;
          actividadFilter.appendChild(option);
        });

        showStatus(`✅ CSV cargado. ${actividades.length} actividades disponibles.`, 'green');
      },
      error: (err) => { console.error(err); showStatus('❌ Error parseando CSV', 'red'); }
    });
  } catch(err) {
    console.error(err);
    showStatus('❌ Error al cargar CSV: ' + err.message, 'red');
  }
}

/* ------------------ Eventos ------------------ */
// Filtrar participantes por actividad seleccionada
importBtn.addEventListener('click', () => {
  const actividadSeleccionada = actividadFilter.value;
  if(!actividadSeleccionada){
    showStatus('❌ Selecciona primero una actividad.', 'red');
    return;
  }
  participants = allParticipants.filter(p => p.actividad === actividadSeleccionada);
  renderParticipants();
  showStatus(`✅ ${participants.length} participantes importados para "${actividadSeleccionada}".`, 'green');
});

// Crear grupo en WhatsApp
createGroupBtn.addEventListener('click', async () => {
  if(!actividadFilter.value){ showStatus('❌ Selecciona una actividad.', 'red'); return; }
  if(participants.length===0){ showStatus('❌ Importa primero los participantes.', 'red'); return; }

  showStatus('Creando grupo...', 'black');

  if(API_URL && TOKEN){
    // Aquí se haría la llamada real al API de WhatsApp
    try {
      const res = await fetch(`${API_URL}/groups`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: actividadFilter.value,
          participants: [normalizarTelefono(participants[0].telefono)]
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
    // Simulación
    groupId = 'grupo-simulado-123';
    showStatus(`✅ Grupo creado (simulado)`, 'green');
  }
});

// Añadir participantes al grupo
addParticipantsBtn.addEventListener('click', async () => {
  if(!groupId){ showStatus('❌ Crea primero el grupo.', 'red'); return; }
  if(participants.length===0){ showStatus('❌ No hay participantes.', 'red'); return; }

  if(API_URL && TOKEN){
    try {
      const telefonos = participants.map(p => normalizarTelefono(p.telefono));
      const res = await fetch(`${API_URL}/groups/${encodeURIComponent(groupId)}/participants`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ participants: telefonos })
      });
      const data = await res.json();
      participants = participants.map(p=>({...p,status: res.ok ? 'success' : 'error'}));
      renderParticipants();
      showStatus(res.ok ? '✅ Participantes añadidos.' : '❌ Error al añadir participantes.', res.ok ? 'green' : 'red');
    } catch(err){
      console.error(err);
      participants = participants.map(p=>({...p,status:'error'}));
      renderParticipants();
      showStatus('❌ Error añadiendo participantes', 'red');
    }
  } else {
    // Simulación
    participants = participants.map(p=>({...p,status:'success'}));
    renderParticipants();
    showStatus('✅ Participantes añadidos (simulado).', 'green');
  }
});

/* ------------------ Inicializar app ------------------ */
loadCSVandFillActivities();
