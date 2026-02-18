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
        const utilidad = ventas - inversion;

        document.getElementById('dash-gastos').innerText = formatMoney(inversion);
        document.getElementById('dash-ventas').innerText = formatMoney(ventas);
        
        const utilElement = document.getElementById('dash-utilidad');
        utilElement.innerText = formatMoney(utilidad);
        // Si hay pérdidas, poner en rojo suave
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
            
            // Lógica para sumar kilos: busca un número seguido de "kg" en la descripción
            if (esVenta && m.nota) {
                const match = m.nota.match(/(\d+)\s*kg/i);
                if (match) totalKilos += parseInt(match[1]);
            }

            const fechaFormateada = m.fecha ? new Date(m.fecha).toLocaleDateString('es-CO', {timeZone: 'UTC'}) : 'S/F';
            const colorMonto = esVenta ? 'text-green-600' : 'text-red-600';
            const simbolo = esVenta ? '+' : '-';

            tabla.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td class="px-8 py-4">
                        <p class="font-bold text-slate-700">${fechaFormateada}</p>
                        <p class="text-[10px] text-slate-400 uppercase font-black">Lote ${m.lote_id || 1}</p>
                    </td>
                    <td class="px-8 py-4">
                        <span class="${esVenta ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-2 py-0.5 rounded-full text-[9px] font-black uppercase mr-2">
                            ${m.tipo.replace('_', ' ')}
                        </span>
                        <span class="text-slate-600">${m.nota || ''}</span>
                    </td>
                    <td class="px-8 py-4 text-right font-black ${colorMonto}">
                        ${simbolo} ${formatMoney(m.monto)}
                    </td>
                </tr>`;
        });

        document.getElementById('dash-kilos').innerText = `${totalKilos} Kg`;

    } catch (err) {
        console.error("Error cargando historial:", err);
    }
}

// 5. REGISTRAR MOVIMIENTO
async function registrarOperacion() {
    const fecha = document.getElementById('mov_fecha').value;
    const lote = document.getElementById('mov_lote').value;
    const monto = document.getElementById('mov_monto').value;
    const tipo = document.getElementById('mov_tipo').value;
    const nota = document.getElementById('mov_nota').value;

    if (!fecha || !monto || monto <= 0) {
        return Swal.fire('Atención', 'Por favor completa fecha y monto', 'warning');
    }

    try {
        const response = await fetch('/api/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, lote, monto, tipo, nota })
        });

        if (response.ok) {
            Swal.fire('¡Éxito!', 'Movimiento guardado', 'success');
            document.getElementById('mov_monto').value = '';
            document.getElementById('mov_nota').value = '';
            actualizarTodo();
        } else {
            const error = await response.json();
            Swal.fire('Error', error.error, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Fallo de conexión', 'error');
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

        lista.forEach(t => {
            contenedor.innerHTML += `
                <div class="group flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-transparent hover:border-lime-200 transition-all mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-green-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                            ${t.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-700">${t.nombre}</p>
                            <p class="text-[10px] text-slate-400 uppercase font-medium">${t.labor_principal || 'General'}</p>
                        </div>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="prepararEdicion(${t.id}, '${t.nombre}', '${t.documento}', '${t.labor_principal}')" class="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        <button onclick="eliminarTrabajador(${t.id})" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                            <i class="fa-solid fa-trash text-[10px]"></i>
                        </button>
                    </div>
                </div>`;
        });
    } catch (err) { console.error(err); }
}

// ELIMINAR
async function eliminarTrabajador(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#166534',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/trabajadores/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire('Eliminado', 'El trabajador ha sido borrado', 'success');
                cargarTrabajadores();
            }
        } catch (err) { Swal.fire('Error', 'No se pudo eliminar', 'error'); }
    }
}

// EDITAR (Usando SweetAlert para el formulario)
async function prepararEdicion(id, nombre, documento, labor) {
    const { value: formValues } = await Swal.fire({
        title: 'Editar Trabajador',
        html:
            `<input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${nombre}">` +
            `<input id="swal-doc" class="swal2-input" placeholder="Cédula" value="${documento}">` +
            `<input id="swal-labor" class="swal2-input" placeholder="Labor" value="${labor}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        preConfirm: () => {
            return {
                nombre: document.getElementById('swal-nombre').value,
                documento: document.getElementById('swal-doc').value,
                labor: document.getElementById('swal-labor').value
            }
        }
    });

    if (formValues) {
        try {
            const res = await fetch(`/api/trabajadores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
            if (res.ok) {
                Swal.fire('Actualizado', 'Datos guardados', 'success');
                cargarTrabajadores();
            }
        } catch (err) { Swal.fire('Error', 'No se pudo actualizar', 'error'); }
    }
}