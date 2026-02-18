// --- VARIABLES GLOBALES ---
let movimientos = JSON.parse(localStorage.getItem('movimientos_cultivo')) || [];
let trabajadores = JSON.parse(localStorage.getItem('trabajadores_cultivo')) || [];

// --- AL INICIAR ---
document.addEventListener('DOMContentLoaded', () => {
    actualizarDashboard();
    renderizarMovimientos();
    renderizarTrabajadores();
    
    // Mostrar fecha actual
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', options);
});

// --- FUNCIONES DE CÁLCULO (EL "MOTOR") ---
function actualizarDashboard() {
    let inversion = 0; // Gastos (Insumos + Jornales)
    let ventas = 0;    // Ingresos por fruta
    let kilos = 0;     // Solo si registraste kilos en la nota

    movimientos.forEach(m => {
        if (m.tipo === 'gasto_insumo' || m.tipo === 'gasto_jornal') {
            inversion += parseFloat(m.monto);
        } else if (m.tipo === 'venta') {
            ventas += parseFloat(m.monto);
            // Intenta extraer kilos si pusiste algo como "200kg" en la nota
            const matchKilos = m.nota.match(/(\d+)\s*kg/i);
            if (matchKilos) kilos += parseInt(matchKilos[1]);
        }
    });

    const utilidad = ventas - inversion;

    // Actualizar el HTML con formato moneda
    document.getElementById('dash-gastos').innerText = formatMoney(inversion);
    document.getElementById('dash-ventas').innerText = formatMoney(ventas);
    document.getElementById('dash-utilidad').innerText = formatMoney(utilidad);
    document.getElementById('dash-kilos').innerText = `${kilos} Kg`;

    // Cambiar color de utilidad si es negativa
    const utilElement = document.getElementById('dash-utilidad');
    utilElement.classList.toggle('text-red-200', utilidad < 0);
}

// --- REGISTRAR OPERACIÓN ---
function registrarOperacion() {
    const lote = document.getElementById('mov_lote').value;
    const monto = document.getElementById('mov_monto').value;
    const tipo = document.getElementById('mov_tipo').value;
    const nota = document.getElementById('mov_nota').value;

    if (!monto || monto <= 0) {
        return Swal.fire('Error', 'Debes ingresar un monto válido', 'error');
    }

    const nuevaOp = {
        id: Date.now(),
        fecha: new Date().toLocaleDateString(),
        lote,
        monto,
        tipo,
        nota
    };

    movimientos.unshift(nuevaOp); // Agregar al inicio
    localStorage.setItem('movimientos_cultivo', JSON.stringify(movimientos));
    
    // Limpiar campos
    document.getElementById('mov_monto').value = '';
    document.getElementById('mov_nota').value = '';

    actualizarDashboard();
    renderizarMovimientos();
    
    Swal.fire({
        title: '¡Registrado!',
        text: 'Movimiento de finca guardado correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });
}

// --- RENDERIZAR TABLA ---
function renderizarMovimientos() {
    const tabla = document.getElementById('tabla-movimientos');
    tabla.innerHTML = '';

    movimientos.forEach(m => {
        const esVenta = m.tipo === 'venta';
        const badgeClass = esVenta ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
        const signo = esVenta ? '+' : '-';
        const colorMonto = esVenta ? 'text-green-600' : 'text-red-600';

        tabla.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-8 py-4">
                    <div class="font-bold text-slate-700">${m.fecha}</div>
                    <div class="text-[10px] uppercase font-black text-slate-400">${m.lote}</div>
                </td>
                <td class="px-8 py-4">
                    <span class="${badgeClass} px-2 py-0.5 rounded-full text-[9px] font-black uppercase mr-2">
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
}

// --- UTILIDADES ---
function formatMoney(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
}

function cerrarSesion() {
    localStorage.removeItem('isLogged');
    window.location.replace('/login');
}

async function actualizarTablero() {
    try {
        const response = await fetch('/api/resumen-cultivo');
        const data = await response.json();

        // Escribimos los valores en el HTML usando los IDs de tu dashboard
        document.getElementById('dash-gastos').innerText = formatMoney(data.inversion || 0);
        document.getElementById('dash-ventas').innerText = formatMoney(data.ventas || 0);
        document.getElementById('dash-utilidad').innerText = formatMoney((data.ventas || 0) - (data.inversion || 0));
        document.getElementById('dash-kilos').innerText = `${data.kilos || 0} Kg`;
        
    } catch (error) {
        console.error('Error al actualizar tablero:', error);
    }
}

// Llama a esta función al final de tu 'registrarOperacion' para que se actualice al guardar
// Y también al cargar la página:
document.addEventListener('DOMContentLoaded', actualizarTablero);

// FUNCIÓN: Actualizar Cuadros (Dashboard)
async function cargarResumen() {
    const res = await fetch('/api/resumen');
    const data = await res.json();
    
    const inversion = data.inversion || 0;
    const ventas = data.ventas || 0;
    const utilidad = ventas - inversion;

    document.getElementById('dash-gastos').innerText = formatMoney(inversion);
    document.getElementById('dash-ventas').innerText = formatMoney(ventas);
    document.getElementById('dash-utilidad').innerText = formatMoney(utilidad);
}

// FUNCIÓN: Dibujar Tabla de Historial
async function cargarHistorial() {
    const res = await fetch('/api/historial');
    const movimientos = await res.json();
    const tabla = document.getElementById('tabla-movimientos');
    tabla.innerHTML = '';

    movimientos.forEach(m => {
        const esVenta = m.tipo === 'venta';
        tabla.innerHTML += `
            <tr>
                <td class="px-8 py-4 font-bold text-xs">${new Date(m.fecha).toLocaleDateString()} - ${m.lote}</td>
                <td class="px-8 py-4">
                    <span class="${esVenta ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-2 py-0.5 rounded-full text-[9px] font-black uppercase mr-2">
                        ${m.tipo}
                    </span> ${m.nota}
                </td>
                <td class="px-8 py-4 text-right font-black ${esVenta ? 'text-green-600' : 'text-red-600'}">
                    ${esVenta ? '+' : '-'} ${formatMoney(m.monto)}
                </td>
            </tr>
        `;
    });
}

function formatMoney(n) {
    return '$ ' + Number(n).toLocaleString('es-CO');
}