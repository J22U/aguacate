document.addEventListener('DOMContentLoaded', () => {
    actualizarTodo();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('current-date');
    if(dateElement) dateElement.innerText = new Date().toLocaleDateString('es-ES', options);
});

async function actualizarTodo() {
    await cargarResumen();
    await cargarHistorial();
    await cargarTrabajadores();
}

async function registrarOperacion() {
    const lote = document.getElementById('mov_lote').value; // Esto capturará el "1"
    const monto = document.getElementById('mov_monto').value;
    const tipo = document.getElementById('mov_tipo').value;
    const nota = document.getElementById('mov_nota').value;

    if (!monto || monto <= 0) return Swal.fire('Error', 'Monto inválido', 'error');

    try {
        const response = await fetch('/api/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Enviamos lote como string, el servidor lo convertirá a Int
            body: JSON.stringify({ lote, monto, tipo, nota }) 
        });

        if (response.ok) {
            Swal.fire('¡Éxito!', 'Movimiento guardado', 'success');
            // ... resto de la limpieza de campos
        } else {
            const error = await response.json();
            Swal.fire('Error SQL', error.error, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Fallo de conexión', 'error');
    }
}

async function cargarResumen() {
    const res = await fetch('/api/resumen');
    const data = await res.json();
    document.getElementById('dash-gastos').innerText = formatMoney(data.inversion || 0);
    document.getElementById('dash-ventas').innerText = formatMoney(data.ventas || 0);
    document.getElementById('dash-utilidad').innerText = formatMoney((data.ventas || 0) - (data.inversion || 0));
}

async function cargarHistorial() {
    const res = await fetch('/api/historial');
    const movimientos = await res.json();
    const tabla = document.getElementById('tabla-movimientos');
    tabla.innerHTML = '';
    let totalKilos = 0;

    movimientos.forEach(m => {
        const esVenta = m.tipo === 'venta';
        if (esVenta && m.nota) {
            const match = m.nota.match(/(\d+)\s*kg/i);
            if (match) totalKilos += parseInt(match[1]);
        }

        tabla.innerHTML += `
            <tr class="hover:bg-slate-50">
                <td class="px-8 py-4 font-bold text-xs">${new Date(m.fecha).toLocaleDateString()} - Lote ${m.lote_id || 1}</td>
                <td class="px-8 py-4">
                    <span class="${esVenta ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-2 py-0.5 rounded-full text-[9px] font-black uppercase mr-2">${m.tipo}</span>
                    ${m.nota || ''}
                </td>
                <td class="px-8 py-4 text-right font-black ${esVenta ? 'text-green-600' : 'text-red-600'}">
                    ${esVenta ? '+' : '-'} ${formatMoney(m.monto)}
                </td>
            </tr>`;
    });
    document.getElementById('dash-kilos').innerText = `${totalKilos} Kg`;
}

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
            await cargarTrabajadores();
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo guardar', 'error');
    }
}

async function cargarTrabajadores() {
    const contenedor = document.getElementById('lista-trabajadores');
    if(!contenedor) return;

    try {
        const res = await fetch('/api/trabajadores');
        const trabajadores = await res.json();
        
        if (trabajadores.length === 0) {
            contenedor.innerHTML = '<p class="text-xs text-slate-400 italic">No hay personal</p>';
            return;
        }

        contenedor.innerHTML = trabajadores.map(t => `
            <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                    <p class="text-sm font-bold text-slate-700">${t.nombre}</p>
                    <p class="text-[9px] uppercase font-black text-lime-600">${t.labor_principal || 'General'}</p>
                </div>
                <i class="fas fa-check-circle text-lime-500 text-xs"></i>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

function formatMoney(n) { return '$ ' + Number(n).toLocaleString('es-CO'); }