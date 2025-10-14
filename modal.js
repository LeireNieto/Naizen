/* -------------------- Modal de información ------------------ */
document.addEventListener('DOMContentLoaded', function() {
  const infoIcons = document.querySelectorAll('.info-icon');
  
  // Crear modal una sola vez
  const modal = document.createElement('div');
  modal.className = 'info-modal';
  modal.innerHTML = `
    <div class="info-modal-content">
      <div class="info-modal-header">
        <h3 class="info-modal-title">Información</h3>
        <button class="info-modal-close">×</button>
      </div>
      <div class="info-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const modalBody = modal.querySelector('.info-modal-body');
  const closeBtn = modal.querySelector('.info-modal-close');
  
  // Función para abrir modal
  function openModal(content, title = 'Información') {
    modal.querySelector('.info-modal-title').textContent = title;
    modalBody.textContent = content;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevenir scroll del fondo
  }
  
  // Función para cerrar modal
  function closeModal() {
    modal.classList.remove('show');
    document.body.style.overflow = ''; // Restaurar scroll
  }
  
  // Event listeners para iconos
  infoIcons.forEach(icon => {
    icon.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const content = this.getAttribute('data-tooltip');
      const title = this.closest('#configHelp') ? 'Archivo de Configuración' : 'Archivo CSV';
      
      openModal(content, title);
    });
  });
  
  // Cerrar modal con botón X
  closeBtn.addEventListener('click', closeModal);
  
  // Cerrar modal haciendo click en el fondo
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
});