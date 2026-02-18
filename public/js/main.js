// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    actualizarTodo();
    
    // Mostrar fecha actual en el encabezado
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaTexto = new Date().toLocaleDateString('es-ES', options);
    document.getElementById('current-date').innerText = fechaTexto;
});

// --- FUNCIÓN MAESTRA: CARGAR TODO DESDE EL SERVIDOR ---
async function actualizarTodo() {
    await cargarResumen();
    await cargarHistorial();
}

// --- REGISTRAR OPERACIÓN (ENVÍO AL SERVIDOR) ---
async function registrarOperacion() {
    const lote = document.getElementById('mov_lote').value;
    const monto = document.getElementById('mov_monto').value;
    const tipo = document.getElementById('mov_tipo').value;
    const nota = document.getElementById('mov_nota').value;

    if (!monto || monto <= 0) {
        return Swal.fire('Error', 'Debes ingresar un monto válido', 'error');
    }

    const datos = { lote, monto, tipo, nota };

    try {
        const response = await fetch('/api/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            Swal.fire({
                title: '¡Registrado!',
                text: 'Los datos se guardaron en la base de datos',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            
            // Limpiar campos
            document.getElementById('mov_monto').value = '';
            document.getElementById('mov_nota').value = '';
            
            // Refrescar la pantalla con datos nuevos
            actualizarTodo();
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
}

// --- OBTENER RESUMEN (LOS CUADROS DE COLORES) ---
async function cargarResumen() {
    try {
        const res = await fetch('/api/resumen');
        const data = await res.json();
        
        const inversion = parseFloat(data.inversion || 0);
        const ventas = parseFloat(data.ventas || 0);
        const utilidad = ventas - inversion;

        document.getElementById('dash-gastos').innerText = formatMoney(inversion);
        document.getElementById('dash-ventas').innerText = formatMoney(ventas);
        document.getElementById('dash-utilidad').innerText = formatMoney(utilidad);
        
        // El cálculo de kilos lo hacemos basado en el historial que recibimos
        // o puedes añadirlo a la consulta SQL del servidor si prefieres
    } catch (err) {
        console.error("Error al cargar resumen:", err);
    }
}

// --- DIBUJAR TABLA DE HISTORIAL ---
async function cargarHistorial() {
    try {
        const res = await fetch('/api/historial');
        const movimientos = await res.json();
        const tabla = document.getElementById('tabla-movimientos');
        tabla.innerHTML = '';

        let totalKilos = 0;

        movimientos.forEach(m => {
            const esVenta = m.tipo === 'venta';
            const colorMonto = esVenta ? 'text-green-600' : 'text-red-600';
            const signo = esVenta ? '+' : '-';

            // Extraer kilos para el dashboard de forma automática
            if (esVenta) {
                const matchKilos = m.nota.match(/(\d+)\s*kg/i);
                if (matchKilos) totalKilos += parseInt(matchKilos[1]);
            }

            tabla.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-8 py-4">
                        <div class="font-bold text-slate-700">${new Date(m.fecha).toLocaleDateString()}</div>
                        <div class="text-[10px] uppercase font-black text-slate-400">${m.lote}</div>
                    </td>
                    <td class="px-8 py-4">
                        <span class="${esVenta ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-2 py-0.5 rounded-full text-[9px] font-black uppercase mr-2">
                            ${m.tipo.replace('_', ' ')}
                        </span>
                        <span class="text-slate-600">${m.nota}</span>
                    </td>
                    <td class="px-8 py-4 text-right font-black ${colorMonto}">
                        ${signo} ${formatMoney(m.monto)}
                    </td>
                </tr>
            `;
        });

        document.getElementById('dash-kilos').innerText = `${totalKilos} Kg`;

    } catch (err) {
        console.error("Error al cargar historial:", err);
    }
}

// --- UTILIDADES ---
function formatMoney(n) {
    return '$ ' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

function cerrarSesion() {
    window.location.replace('/login');
}