// 1. CONFIGURACIÓN INICIAL
document.addEventListener('DOMContentLoaded', () => {
    // Poner fecha de hoy por defecto en el calendario
    const hoy = new Date().toISOString().split('T')[0];
    const inputFecha = document.getElementById('mov_fecha');
    if (inputFecha) inputFecha.value = hoy;

    // Mostrar fecha actual en el header
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('current-date');
    if(dateElement) dateElement.innerText = new Date().toLocaleDateString('es-ES', options);

    actualizarTodo();
});

// Helper para formatear dinero
function formatMoney(n) { 
    return '$ ' + Number(n).toLocaleString('es-CO'); 
}

// 2. FUNCIÓN MAESTRA DE CARGA
async function actualizarTodo() {
    await cargarResumen();
    await cargarHistorial();
    await cargarTrabajadores();
}

// 3. CARGAR DASHBOARD (GASTOS, VENTAS, UTILIDAD)
async function cargarResumen() {
    try {
        const res = await fetch('/api/resumen');
        const data = await res.json();
        
        const inversion = data.inversion || 0;
        const ventas = data.ventas || 0;
        const kilos = data.totalKilos || 0; // Capturamos los kilos
        const utilidad = ventas - inversion;

        document.getElementById('dash-gastos').innerText = formatMoney(inversion);
        document.getElementById('dash-ventas').innerText = formatMoney(ventas);
        
        // ACTUALIZAMOS EL CUADRO DE KILOS
        document.getElementById('dash-kilos').innerText = `${kilos.toLocaleString()} Kg`;
        
        const utilElement = document.getElementById('dash-utilidad');
        utilElement.innerText = formatMoney(utilidad);
        utilElement.style.color = utilidad < 0 ? '#ff9999' : '#ffffff';

    } catch (err) {
        console.error("Error cargando resumen:", err);
    }
}

// 4. CARGAR HISTORIAL Y CÁLCULO DE KILOS
async function cargarHistorial() {
    try {
        const res = await fetch('/api/historial');
        const movimientos = await res.json();
        const tabla = document.getElementById('tabla-movimientos');
        tabla.innerHTML = '';
        
        let totalKilos = 0;

        if (!Array.isArray(movimientos)) return;

        movimientos.forEach(m => {
            const esVenta = m.tipo === 'venta';
            
            // SUMA DE KILOS REAL: Usamos el campo numérico de la BD
            if (esVenta && m.kilos) {
                totalKilos += parseFloat(m.kilos);
            }

            const fechaFormateada = m.fecha ? new Date(m.fecha).toLocaleDateString('es-CO', {timeZone: 'UTC'}) : 'S/F';
            const colorMonto = esVenta ? 'text-green-600' : 'text-red-600';
            const simbolo = esVenta ? '+' : '-';

            // AGREGAMOS data-tipo="${m.tipo}" PARA QUE EL FILTRO FUNCIONE
            tabla.innerHTML += `
                <tr data-tipo="${m.tipo}" class="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td class="px-8 py-4">
                        <p class="font-bold text-slate-700">${fechaFormateada}</p>
                        <p class="text-[10px] text-slate-400 uppercase font-black">Lote ${m.lote_id || 1}</p>
                    </td>
                    <td class="px-8 py-4">
                        <span class="${esVenta ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-2 py-0.5 rounded-full text-[9px] font-black uppercase mr-2">
                            ${m.tipo.replace('_', ' ')}
                        </span>
                        <span class="text-slate-600">${m.descripcion || m.nota || ''}</span>
                        ${m.kilos > 0 ? `<b class="ml-2 text-slate-400 text-xs">(${m.kilos} Kg)</b>` : ''}
                    </td>
                    <td class="px-8 py-4 text-right font-black ${colorMonto}">
                        ${simbolo} ${formatMoney(m.monto)}
                    </td>
                </tr>`;
        });

        // Actualizamos el dashboard con la suma real
        const dashKilos = document.getElementById('dash-kilos');
        if(dashKilos) dashKilos.innerText = `${totalKilos.toLocaleString()} Kg`;

    } catch (err) {
        console.error("Error cargando historial:", err);
    }
}

// 5. REGISTRAR MOVIMIENTO
async function registrarOperacion() {
    // 1. CAPTURA DE VALORES
    const fecha = document.getElementById('mov_fecha').value;
    const lote = document.getElementById('mov_lote').value;
    const monto = document.getElementById('mov_monto').value;
    const kilos = document.getElementById('mov_kilos').value || 0; 
    const tipo = document.getElementById('mov_tipo').value;
    const nota = document.getElementById('mov_nota').value;

    // 2. VALIDACIÓN: CAMPOS BÁSICOS
    if (!fecha || !monto || monto <= 0) {
        return Swal.fire('Atención', 'Por favor completa fecha y monto', 'warning');
    }

    // 3. VALIDACIÓN: KILOS OBLIGATORIOS EN VENTAS
    if (tipo === 'venta' && (kilos <= 0)) {
        return Swal.fire('Atención', 'Si es una venta, debes registrar cuántos kilos vendiste', 'info');
    }

    // 4. VALIDACIÓN: DESCRIPCIÓN OBLIGATORIA EN "OTROS GASTOS"
    if (tipo === 'gasto_otros' && nota.trim() === "") {
        return Swal.fire('Atención', 'Por favor describe en qué consiste el gasto extra', 'info');
    }

    try {
        // 5. ENVÍO DE DATOS AL SERVIDOR
        const response = await fetch('/api/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                fecha, 
                lote, 
                monto, 
                kilos, 
                tipo, 
                nota 
            })
        });

        if (response.ok) {
            Swal.fire({
                title: '¡Éxito!',
                text: 'Movimiento guardado correctamente',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
            // 6. LIMPIEZA DE CAMPOS
            document.getElementById('mov_monto').value = '';
            document.getElementById('mov_kilos').value = ''; 
            document.getElementById('mov_nota').value = '';
            
            // 7. ACTUALIZAR DASHBOARD Y TABLA
            actualizarTodo(); 

        } else {
            const error = await response.json();
            Swal.fire('Error', error.error || 'No se pudo guardar', 'error');
        }
    } catch (error) {
        console.error("Error en registro:", error);
        Swal.fire('Error', 'Fallo de conexión con el servidor', 'error');
    }
}

// 6. TRABAJADORES
async function guardarTrabajador() {
    const nombre = document.getElementById('t_nombre').value;
    const documento = document.getElementById('t_documento').value;
    const labor = document.getElementById('t_labor').value;

    if (!nombre || !documento) return Swal.fire('Atención', 'Nombre y Documento requeridos', 'warning');

    try {
        const response = await fetch('/api/trabajadores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, documento, labor })
        });

        if (response.ok) {
            Swal.fire('¡Éxito!', 'Trabajador registrado', 'success');
            document.getElementById('t_nombre').value = '';
            document.getElementById('t_documento').value = '';
            document.getElementById('t_labor').value = '';
            cargarTrabajadores();
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo guardar', 'error');
    }
}

async function cargarTrabajadores() {
    try {
        const res = await fetch('/api/trabajadores');
        const lista = await res.json();
        const contenedor = document.getElementById('lista-trabajadores');
        contenedor.innerHTML = '';

        if (!Array.isArray(lista) || lista.length === 0) {
            contenedor.innerHTML = '<p class="text-xs text-slate-400 italic p-3">No hay personal registrado</p>';
            return;
        }

        lista.forEach(t => {
            // SEGURIDAD: Intentamos capturar el ID de ambas formas por si acaso
            const idCorrecto = t.id !== undefined ? t.id : t.ID;
            
            // Si el ID sigue fallando, mostramos error en consola para debugear
            if (idCorrecto === undefined) console.error("No se encontró ID en:", t);

            contenedor.innerHTML += `
                <div class="group flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-transparent hover:border-lime-200 transition-all mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-green-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                            ${(t.nombre || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-700">${t.nombre || 'Sin nombre'}</p>
                            <p class="text-[10px] text-slate-400 uppercase font-medium">${t.labor_principal || 'General'}</p>
                        </div>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="prepararEdicion(${idCorrecto}, '${t.nombre}', '${t.documento}', '${t.labor_principal}')" 
                                class="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        <button onclick="eliminarTrabajador(${idCorrecto})" 
                                class="p-1.5 text-red-500 hover:bg-red-100 rounded-lg">
                            <i class="fa-solid fa-trash text-[10px]"></i>
                        </button>
                    </div>
                </div>`;
        });
    } catch (err) {
        console.error("Error cargando trabajadores:", err);
    }
}

// ELIMINAR
async function eliminarTrabajador(id) {
    const result = await Swal.fire({
        title: '¿Eliminar trabajador?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/trabajadores/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire('Eliminado', 'El trabajador ha sido quitado de la lista.', 'success');
                cargarTrabajadores();
            } else {
                Swal.fire('Error', 'No se pudo eliminar del servidor.', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Fallo de conexión.', 'error');
        }
    }
}

// EDITAR (Usando SweetAlert para el formulario)
async function prepararEdicion(id, nombre, documento, labor) {
    const idValido = Number(id);
    // 1. Validación de seguridad inicial
    if (!id || id === 'undefined') {
        Swal.fire('Error', 'ID de trabajador no válido (' + id + ')', 'error');
    }

    // 2. Abrir el formulario emergente con los datos actuales
    const { value: formValues } = await Swal.fire({
        title: 'Editar Trabajador',
        html: `
            <div style="text-align: left; font-size: 0.8rem; color: #64748b; margin-bottom: 5px; margin-left: 10%;">Nombre Completo</div>
            <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${nombre}">
            
            <div style="text-align: left; font-size: 0.8rem; color: #64748b; margin-bottom: 5px; margin-left: 10%;">Cédula / Documento</div>
            <input id="swal-doc" class="swal2-input" placeholder="Cédula" value="${documento}">
            
            <div style="text-align: left; font-size: 0.8rem; color: #64748b; margin-bottom: 5px; margin-left: 10%;">Labor o Cargo</div>
            <input id="swal-labor" class="swal2-input" placeholder="Labor" value="${labor}">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#166534', // Verde oscuro para que combine con tu diseño
        preConfirm: () => {
            const nuevoNombre = document.getElementById('swal-nombre').value.trim();
            const nuevoDoc = document.getElementById('swal-doc').value.trim();
            const nuevaLabor = document.getElementById('swal-labor').value.trim();

            if (!nuevoNombre || !nuevoDoc) {
                Swal.showValidationMessage('Nombre y Documento son obligatorios');
                return false;
            }

            return {
                nombre: nuevoNombre,
                documento: nuevoDoc,
                labor: nuevaLabor
            };
        }
    });

    // 3. Si el usuario confirmó los cambios, enviar al servidor
    if (formValues) {
        // Mostrar alerta de "Cargando..."
        Swal.fire({
            title: 'Actualizando...',
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const res = await fetch(`/api/trabajadores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });

            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: 'Los datos del trabajador se han modificado correctamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
                cargarTrabajadores(); // Refrescar la lista en pantalla
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error desconocido en el servidor');
            }
        } catch (err) {
            console.error("Error en PUT:", err);
            Swal.fire({
                icon: 'error',
                title: 'Error al actualizar',
                text: err.message || 'No se pudo conectar con el servidor.'
            });
        }
    }
}

function filtrarTabla() {
    // Obtenemos valores y limpiamos espacios
    const busqueda = document.getElementById('filter-busqueda').value.toLowerCase().trim();
    const tipoFiltro = document.getElementById('filter-tipo').value; 
    const filas = document.querySelectorAll('#tabla-movimientos tr');

    filas.forEach(fila => {
        const textoFila = fila.innerText.toLowerCase();
        const tipoFila = fila.getAttribute('data-tipo'); 

        const coincideBusqueda = busqueda === "" || textoFila.includes(busqueda);
        const coincideTipo = tipoFiltro === "" || tipoFila === tipoFiltro;

        // Mostrar u ocultar
        fila.style.display = (coincideBusqueda && coincideTipo) ? "" : "none";
    });
}

// Función para limpiar los buscadores y restablecer la tabla
function limpiarFiltros() {
    console.log("Limpiando filtros..."); // Esto es para que veas en la consola que sí entra
    
    // 1. Limpiar los elementos del DOM
    const inputBusqueda = document.getElementById('filter-busqueda');
    const selectTipo = document.getElementById('filter-tipo');
    const inputFecha = document.getElementById('filter-fecha');

    if (inputBusqueda) inputBusqueda.value = "";
    if (selectTipo) selectTipo.value = "";
    if (inputFecha) inputFecha.value = "";

    // 2. Ejecutar la función de filtrado para mostrar todo de nuevo
    if (typeof filtrarTabla === "function") {
        filtrarTabla();
    } else {
        console.error("La función filtrarTabla no existe.");
    }
}