/* ------------------ Estado ------------------ */
const actividadFilter = document.getElementById('actividadFilter');
const addActivityBtn = document.getElementById('addActivityBtn');
const inputMethod = document.getElementById('inputMethod');
const csvFile = document.getElementById('csvFile');
const sheetUrl = document.getElementById('sheetUrl');
const pasteData = document.getElementById('pasteData');
const activityNameInput = document.getElementById('activityName');

const createGroupBtn = document.getElementById('createGroupBtn');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const statusDiv = document.getElementById('status');
const participantsDiv = document.querySelector('#participants tbody');

let allActivities = {}; // {actividad: [participantes]}
let participants = [];   // participantes filtrados
let groupId = null;

/* ------------------ Helpers ------------------ */
function showStatus(msg, color='black'){ statusDiv.textContent = msg; statusDiv.style.color = color; }
function normalizarTelefono(tel){ return tel.toString().replace(/\D/g,''); }
function renderParticipants(){
  participantsDiv.innerHTML = '';
  participants.forEach(p => {
    const tr = document.createElement('tr');
    const tdNombre = document.createElement('td'); tdNombre.textContent = p.nombre;
    const tdTelefono = document.createElement('td'); tdTelefono.textContent = p.telefono;
    const tdWhatsApp = document.createElement('td');
    const textMsg = `Hola ${p.nombre}, te confirmo para la actividad ${p.actividad}`;
    tdWhatsApp.innerHTML = `
      <a class="whatsapp" href="https://wa.me/${encodeURIComponent(normalizarTelefono(p.telefono))}?text=${encodeURIComponent(textMsg)}" target="_blank">
        <i class="fab fa-whatsapp"></i>
      </a>
      <span class="status-icon ${p.status || 'pending'}"></span>
    `;
    tr.appendChild(tdNombre); tr.appendChild(tdTelefono); tr.appendChild(tdWhatsApp);
    participantsDiv.appendChild(tr);
  });
}
function actualizarFiltro(){
  actividadFilter.innerHTML = '<option value="">-- Selecciona actividad --</option>';
  Object.keys(allActivities).forEach(act => {
    const option = document.createElement('option');
    option.value = act; option.textContent = act;
    actividadFilter.appendChild(option);
  });
}

/* ------------------ Manejo inputs dinámicos ------------------ */
inputMethod.addEventListener('change',()=>{
  csvFile.style.display = 'none';
  sheetUrl.style.display = 'none';
  pasteData.style.display = 'none';
  if(inputMethod.value==='csv') csvFile.style.display='block';
  else if(inputMethod.value==='url') sheetUrl.style.display='block';
  else if(inputMethod.value==='paste') pasteData.style.display='block';
});

/* ------------------ Agregar actividad ------------------ */
addActivityBtn.addEventListener('click',async()=>{
  const nombre = activityNameInput.value.trim();
  if(!nombre){ showStatus('❌ Ingresa nombre de actividad', 'red'); return; }
  if(!inputMethod.value){ showStatus('❌ Selecciona método de carga', 'red'); return; }

  let participantes = [];

  try{
    if(inputMethod.value==='csv'){
      if(!csvFile.files[0]){ showStatus('❌ Selecciona un archivo CSV', 'red'); return; }
      const text = await csvFile.files[0].text();
      participantes = parseCSV(text);
    }else if(inputMethod.value==='url'){
      if(!sheetUrl.value){ showStatus('❌ Ingresa URL de Google Sheet', 'red'); return; }
      const resp = await fetch(sheetUrl.value);
      if(!resp.ok) throw new Error('No se pudo acceder a la URL');
      const text = await resp.text();
      participantes = parseCSV(text);
    }else if(inputMethod.value==='paste'){
      if(!pasteData.value){ showStatus('❌ Pega los datos', 'red'); return; }
      participantes = parseCSV(pasteData.value);
    }
    // Guardar participantes en actividad
    allActivities[nombre] = participantes;
    showStatus(`✅ Actividad "${nombre}" agregada con ${participantes.length} participantes.`, 'green');
    actualizarFiltro();
  }catch(err){
    console.error(err); showStatus('❌ Error al procesar participantes: '+err.message,'red');
  }
});

/* ------------------ Parse CSV simple ------------------ */
function parseCSV(text){
  const result = Papa.parse(text.trim(), {header:true, skipEmptyLines:true});
  return result.data.map(r=>{
    const nombre = (r['Nombre']||r['name']||'').trim();
    const telefono = normalizarTelefono(r['Teléfono']||r['Telefono']||r['telefono']||r['phone']||'');
    return {nombre, telefono, actividad:'', status:'pending'};
  }).filter(p=>p.nombre && p.telefono);
}

/* ------------------ Filtrar participantes ------------------ */
actividadFilter.addEventListener('change',()=>{
  const act = actividadFilter.value;
  if(!act){ participants = []; renderParticipants(); showStatus('Esperando acción...'); return; }
  participants = allActivities[act].map(p=>({...p, actividad:act, status:'pending'}));
  renderParticipants();
  showStatus(`✅ ${participants.length} participantes para "${act}".`,'green');
});

/* ------------------ Simulación WhatsApp ------------------ */
createGroupBtn.addEventListener('click',()=>{
  if(!actividadFilter.value){ showStatus('❌ Selecciona actividad','red'); return; }
  if(participants.length===0){ showStatus('❌ No hay participantes','red'); return; }
  groupId = 'grupo-simulado-123';
  showStatus(`✅ Grupo creado (simulado)`, 'green');
});

addParticipantsBtn.addEventListener('click',()=>{
  if(!groupId){ showStatus('❌ Crea primero el grupo','red'); return; }
  if(participants.length===0){ showStatus('❌ No hay participantes','red'); return; }
  participants = participants.map(p=>({...p,status:'success'}));
  renderParticipants();
  showStatus('✅ Participantes añadidos (simulado).', 'green');
});
