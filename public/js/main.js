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

// 3. CARGAR DASHBOARD (GASTOS, VENTAS, UTILIDAD Y KILOS)
async function cargarResumen() {
    try {
        const res = await fetch('/api/resumen');
        const data = await res.json();
        
        const inversion = data.inversion || 0;
        const ventas = data.ventas || 0;
        const kilos = data.totalKilos || 0;
        const utilidad = ventas - inversion;

        // Actualizar Inversión
        const gasElement = document.getElementById('dash-gastos');
        if (gasElement) gasElement.innerText = formatMoney(inversion);
        
        // Actualizar Ventas
        const venElement = document.getElementById('dash-ventas');
        if (venElement) venElement.innerText = formatMoney(ventas);
        
        // Actualizar KILOS - Esta es la parte importante para el usuario
        const kiloElement = document.getElementById('dash-kilos');
        if (kiloElement) kiloElement.innerText = `${Number(kilos).toLocaleString()} Kg`;
        
        // Actualizar Utilidad
        const utilElement = document.getElementById('dash-utilidad');
        if (utilElement) {
            utilElement.innerText = formatMoney(utilidad);
            utilElement.style.color = utilidad < 0 ? '#ff9999' : '#ffffff';
        }

        // Sincronizar con filtros si ya hay uno seleccionado
        if (document.getElementById('filter-cosecha')?.value !== "") {
            filtrarTabla();
        }

    } catch (err) {
        console.error("Error cargando resumen:", err);
    }
}

// 4. CARGAR HISTORIAL Y CÁLCULO DE KILOS
// 4. CARGAR HISTORIAL Y CÁLCULO DE KILOS (VERSIÓN TOTAL)
async function cargarHistorial() {
    try {
        const res = await fetch('/api/historial');
        let movimientos = await res.json();
        const tabla = document.getElementById('tabla-movimientos');
        
        if (!tabla) return;
        tabla.innerHTML = '';
        
        let totalGastos = 0;
        let totalVentas = 0;
        let totalKilos = 0;

        movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        movimientos.forEach((m, index) => {
            const loteAsignado = m.lote_id || "3"; 
            
            // CORRECCIÓN AQUÍ: Normalizamos el tipo para la comparación
            const tipoNormalizado = m.tipo ? m.tipo.toLowerCase().trim() : "";
            const esVenta = tipoNormalizado === 'venta';
            
            const monto = parseFloat(m.monto) || 0;
            const kilos = parseFloat(m.kilos) || 0;

            // Sumas para Dashboard
            // Sumas para Dashboard
            if (esVenta) {
                totalVentas += monto;
                totalKilos += kilos;
            } else {
                totalGastos += monto;
            }

            // --- ESTA ES LA PARTE NUEVA ---
            const fechaObjeto = new Date(m.fecha);
            const soloFecha = fechaObjeto.toISOString().split('T')[0];
            const fechaMostrar = soloFecha; 
            // ------------------------------

            const descSegura = (m.descripcion || 'Sin descripción').replace(/'/g, "\\'");

            tabla.innerHTML += `
                <tr onclick="toggleDetalle(${index})" 
                    data-lote="${loteAsignado}" 
                    data-tipo="${m.tipo}" 
                    data-monto="${monto}" 
data-kilos="${kilos}"
                    data-fecha="${soloFecha}"
                    class="cursor-pointer hover:bg-slate-50 border-b border-slate-100">
                    <td class="px-8 py-4">
                        <p class="font-bold text-slate-700">${fechaMostrar}</p>
                        <p class="text-[10px] text-slate-400 uppercase font-black">Año ${loteAsignado === "1" ? "2025" : "2026"}</p>
                    </td>
                    <td class="px-8 py-4">
                        <span class="${esVenta ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-2 py-0.5 rounded-full text-[9px] font-black uppercase mr-2">
                            ${m.tipo.replace('_', ' ')}
                        </span>
                        <span class="text-slate-600 font-medium">${m.descripcion || 'Sin descripción'}</span>
                    </td>
                    <td class="px-8 py-4 text-right font-black ${esVenta ? 'text-green-600' : 'text-red-600'}">
                        ${esVenta ? '+' : '-'} $${monto.toLocaleString()}
                    </td>
                </tr>
                <tr id="detalle-${index}" class="hidden bg-slate-50">
                    <td colspan="3" class="px-8 py-4 text-center">
                        <div class="flex justify-around items-center">
                            <span class="text-sm"><b>Kilos:</b> ${kilos} Kg</span>
                            
                            <button onclick="abrirEditar(${m.id}, '${soloFecha}', ${monto}, ${kilos}, '${descSegura}')" 
                                class="text-blue-600 font-bold uppercase text-[10px] tracking-widest hover:underline">
                                [ EDITAR ]
                            </button>

                            <button onclick="eliminarMovimiento(${m.id})" 
                                class="text-red-500 font-bold uppercase text-[10px] tracking-widest hover:underline">
                                [ ELIMINAR ]
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        // Actualizar Dashboard con los IDs correctos
        if(document.getElementById('dash-gastos')) document.getElementById('dash-gastos').innerText = `$ ${totalGastos.toLocaleString()}`;
        if(document.getElementById('dash-ventas')) document.getElementById('dash-ventas').innerText = `$ ${totalVentas.toLocaleString()}`;
        if(document.getElementById('dash-kilos')) document.getElementById('dash-kilos').innerText = `${totalKilos.toLocaleString()} Kg`;
        if(document.getElementById('dash-utilidad')) document.getElementById('dash-utilidad').innerText = `$ ${(totalVentas - totalGastos).toLocaleString()}`;

        filtrarTabla();

    } catch (err) {
        console.error("Error al cargar historial:", err);
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
        // 5. ENVÍO DE DATOS AL SERVIDOR (Corregido para coincidir con la BD)
        const response = await fetch('/api/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                fecha: fecha, 
                lote_id: lote,          // Se envía como lote_id
                monto: Number(monto), 
                kilos: Number(kilos), 
                tipo: tipo, 
                descripcion: nota       // Se envía como descripcion
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
            const errorData = await response.json().catch(() => ({}));
            Swal.fire('Error del Servidor', errorData.error || 'Revisa que las columnas lote_id y kilos existan en la BD', 'error');
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
    const busqueda = document.getElementById('filter-busqueda').value.toLowerCase().trim();
    const cosecha = document.getElementById('filter-cosecha').value.toString().trim();
    const tipo = document.getElementById('filter-tipo').value.toString().trim();
    const filas = document.querySelectorAll('#tabla-movimientos tr');

    let sumInversion = 0;
    let sumVentas = 0;
    let sumKilos = 0;

    filas.forEach(fila => {
        const fLote = (fila.getAttribute('data-lote') || "").toString().trim();
        const fTipo = (fila.getAttribute('data-tipo') || "").toString().trim();
        const fMonto = parseFloat(fila.getAttribute('data-monto')) || 0;
        const fKilos = parseFloat(fila.getAttribute('data-kilos')) || 0;
        
        // Usamos textContent para capturar la descripción recién inyectada
        const fTexto = fila.textContent.toLowerCase();

        const coincideBusqueda = busqueda === "" || fTexto.includes(busqueda);
        const coincideCosecha = cosecha === "" || fLote === cosecha;
        const coincideTipo = tipo === "" || fTipo === tipo;

        const fechaDesde = document.getElementById('filter-fecha-desde')?.value || "";
        const fechaHasta = document.getElementById('filter-fecha-hasta')?.value || "";
        const fFecha = fila.getAttribute('data-fecha') || "";
        
        let coincideFecha = true;
        if (fechaDesde && fechaHasta) {
            coincideFecha = fFecha >= fechaDesde && fFecha <= fechaHasta;
        } else if (fechaDesde) {
            coincideFecha = fFecha >= fechaDesde;
        } else if (fechaHasta) {
            coincideFecha = fFecha <= fechaHasta;
        }

        if (coincideBusqueda && coincideCosecha && coincideTipo && coincideFecha) {
            fila.style.display = '';
            if (fTipo === 'venta') {
                sumVentas += fMonto;
                sumKilos += fKilos;
            } else {
                sumInversion += fMonto;
            }
        } else {
            fila.style.display = 'none';
        }
    });

    const utilidad = sumVentas - sumInversion;
    document.getElementById('dash-gastos').innerText = formatMoney(sumInversion);
    document.getElementById('dash-ventas').innerText = formatMoney(sumVentas);
    document.getElementById('dash-kilos').innerText = `${sumKilos.toLocaleString()} Kg`;
    
    const utilElement = document.getElementById('dash-utilidad');
    if (utilElement) {
        utilElement.innerText = formatMoney(utilidad);
        utilElement.style.color = utilidad < 0 ? '#ff9999' : '#ffffff';
    }
}

// Función para limpiar los buscadores y restablecer la tabla
function limpiarFiltros() {
    console.log("Limpiando filtros..."); 
    
    // 1. Limpiar los elementos del DOM (Incluyendo la nueva Cosecha)
    const inputBusqueda = document.getElementById('filter-busqueda');
    const selectTipo = document.getElementById('filter-tipo');
    const selectCosecha = document.getElementById('filter-cosecha');
    const inputFechaDesde = document.getElementById('filter-fecha-desde');
    const inputFechaHasta = document.getElementById('filter-fecha-hasta');

    if (inputBusqueda) inputBusqueda.value = "";
    if (selectTipo) selectTipo.value = "";
    if (selectCosecha) selectCosecha.value = "";
    if (inputFechaDesde) inputFechaDesde.value = "";
    if (inputFechaHasta) inputFechaHasta.value = "";

    // 2. Ejecutar la función de filtrado para mostrar todo de nuevo
    if (typeof filtrarTabla === "function") {
        filtrarTabla();
    } else {
        console.error("La función filtrarTabla no existe.");
    }
}

function calcularResumenFiltrado() {
    let ingresos = 0;
    let egresos = 0;

    // Solo recorremos las filas que NO están ocultas por el filtro
    const filasVisibles = document.querySelectorAll('#tabla-movimientos tr:not([style*="display: none"])');

    filasVisibles.forEach(fila => {
        // Extraemos el monto y el tipo (data-tipo)
        const monto = parseFloat(fila.getAttribute('data-monto')) || 0;
        const tipo = fila.getAttribute('data-tipo');

        if (tipo === 'venta') {
            ingresos += monto;
        } else if (tipo.startsWith('gasto_')) {
            egresos += monto;
        }
    });

    const utilidad = ingresos - egresos;

    // Mostramos el resultado (puedes usar un Swal o actualizar un div en el HTML)
    console.log(`Resumen: Ingresos ${ingresos}, Gastos ${egresos}, Ganancia: ${utilidad}`);
    
    // Si quieres mostrarlo en el Dashboard automáticamente:
    document.getElementById('dash-ventas').innerText = `$ ${ingresos.toLocaleString()}`;
    document.getElementById('dash-gastos').innerText = `$ ${egresos.toLocaleString()}`;
    document.getElementById('dash-utilidad').innerText = `$ ${utilidad.toLocaleString()}`;
}

// 1. Función para abrir el modal con los datos actuales
function abrirEditar(id, fecha, monto, kilos, nota) {
    document.getElementById('edit_id').value = id;
    document.getElementById('edit_fecha').value = fecha;
    document.getElementById('edit_monto').value = monto;
    document.getElementById('edit_kilos').value = kilos;
    document.getElementById('edit_nota').value = nota;
    
    const modal = document.getElementById('modal-editar');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// 2. Función para cerrar el modal
function cerrarModal() {
    const modal = document.getElementById('modal-editar');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// 3. Función para enviar la actualización a la Base de Datos
async function actualizarMovimiento() {
    const id = document.getElementById('edit_id').value;
    
    // Verificación de seguridad para evitar el error de undefined
    if (!id || id === 'undefined') {
        Swal.fire('Error', 'No se encontró el ID del movimiento', 'error');
        return;
    }

    const data = {
        fecha: document.getElementById('edit_fecha').value,
        monto: document.getElementById('edit_monto').value,
        kilos: document.getElementById('edit_kilos').value,
        descripcion: document.getElementById('edit_nota').value // CAMBIADO: 'nota' por 'descripcion'
    };

    try {
        const res = await fetch(`/api/historial/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            Swal.fire({
                title: '¡Actualizado!',
                text: 'El movimiento ha sido modificado y los kilos recalculados.',
                icon: 'success',
                confirmButtonColor: '#166534'
            });
            cerrarModal();
            
            // Importante: Asegúrate de que actualizarTodo() llame a cargarHistorial()
            // para que los kilos se sumen de nuevo en el Dashboard.
            if (typeof actualizarTodo === 'function') {
                actualizarTodo(); 
            } else {
                cargarHistorial();
            }
        } else {
            const errorServer = await res.json();
            Swal.fire('Error', errorServer.error || 'Error en el servidor', 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
}

// Función para mostrar/ocultar los detalles de cada fila
function toggleDetalle(index) {
    const detalleRow = document.getElementById(`detalle-${index}`);
    if (detalleRow) {
        // Si está escondido lo muestra, si está visible lo esconde
        if (detalleRow.classList.contains('hidden')) {
            detalleRow.classList.remove('hidden');
        } else {
            detalleRow.classList.add('hidden');
        }
    }
}

function toggleHistorial() {
    const contenido = document.getElementById('historial-desplegable');
    const icono = document.getElementById('icono-flecha');
    
    if (contenido.classList.contains('hidden') || contenido.style.display === 'none') {
        contenido.style.display = 'block';
        contenido.classList.remove('hidden');
        icono.classList.add('rotate-180');
        // Forzamos que se recalculen los filtros al abrir
        if (typeof filtrarTabla === 'function') filtrarTabla();
    } else {
        contenido.style.display = 'none';
        icono.classList.remove('rotate-180');
    }
}
// ELIMINAR MOVIMIENTO
async function eliminarMovimiento(id) {
    const result = await Swal.fire({
        title: '¿Eliminar movimiento?',
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
            const res = await fetch(`/api/historial/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire('Eliminado', 'El movimiento ha sido eliminado.', 'success');
                actualizarTodo();
            } else {
                Swal.fire('Error', 'No se pudo eliminar del servidor.', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Fallo de conexión.', 'error');
        }
    }
}
