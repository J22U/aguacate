const express = require('express');
const path = require('path');
const sql = require('mssql');
const app = express();
const port = process.env.PORT || 3000;

// Configuración usando tus variables actuales de Render
const dbConfig = {
    server: process.env.DB_SERVER, // AguacateDB.mssql.somee.com
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER, // jube05_SQLLogin_1
            password: process.env.DB_PASS  // cbqltm7coo
        }
    },
    options: {
        database: process.env.DB_NAME, // AguacateDB
        encrypt: false, // Somee normalmente no usa SSL estricto, cámbialo a true si falla
        trustServerCertificate: true
    }
};

// Función para conectar (más robusta)
async function connectDB() {
    try {
        return await sql.connect(dbConfig);
    } catch (err) {
        console.error("Error de conexión crítica:", err.message);
        throw err;
    }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 1. GUARDAR MOVIMIENTO
app.post('/api/movimientos', async (req, res) => {
    const { fecha, lote, monto, tipo, nota } = req.body;
    
    try {
        let pool = await connectDB();
        await pool.request()
            .input('fecha', sql.Date, fecha) // Recibe la fecha del frontend
            .input('lote_id', sql.Int, parseInt(lote) || 1)
            .input('monto', sql.Decimal(18, 2), monto)
            .input('tipo', sql.NVarChar, tipo)
            .input('descripcion', sql.NVarChar, nota) 
            // IMPORTANTE: Asegúrate que tu tabla tenga la columna 'fecha'
            .query('INSERT INTO movimientos (fecha, lote_id, monto, tipo, descripcion) VALUES (@fecha, @lote_id, @monto, @tipo, @descripcion)');
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. RESUMEN (Corregido con ISNULL para evitar el error de JSON)
app.get('/api/resumen', async (req, res) => {
    try {
        let pool = await connectDB();
        const result = await pool.request().query(`
            SELECT 
                ISNULL(SUM(CASE WHEN tipo IN ('gasto_insumo', 'gasto_jornal') THEN monto ELSE 0 END), 0) as inversion,
                ISNULL(SUM(CASE WHEN tipo = 'venta' THEN monto ELSE 0 END), 0) as ventas
            FROM movimientos
        `);
        // Aseguramos que siempre devuelva un objeto, nunca null
        res.json(result.recordset[0] || { inversion: 0, ventas: 0 });
    } catch (err) {
        console.error("Error en resumen:", err.message);
        res.status(500).json({ error: 'Error en la consulta de base de datos' });
    }
});

// 3. HISTORIAL (Incluye ISNULL para mayor estabilidad)
app.get('/api/historial', async (req, res) => {
    try {
        let pool = await connectDB();
        const result = await pool.request().query(`
            SELECT TOP 15 
                fecha, 
                tipo, 
                ISNULL(monto, 0) as monto, 
                ISNULL(descripcion, '') as nota, 
                ISNULL(lote_id, 1) as lote_id 
            FROM movimientos 
            ORDER BY fecha DESC
        `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error en historial:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 4. REGISTRAR TRABAJADOR
app.post('/api/trabajadores', async (req, res) => {
    const { nombre, documento, labor } = req.body;
    if (!nombre || !documento) return res.status(400).json({ error: "Datos incompletos" });

    try {
        let pool = await connectDB();
        await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('documento', sql.NVarChar, documento)
            .input('labor_principal', sql.NVarChar, labor || 'General')
            .query('INSERT INTO trabajadores (nombre, documento, labor_principal) VALUES (@nombre, @documento, @labor_principal)');
        res.json({ success: true });
    } catch (err) {
        console.error("Error al registrar trabajador:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 5. LISTA TRABAJADORES
app.get('/api/trabajadores', async (req, res) => {
    try {
        let pool = await connectDB();
        const result = await pool.request().query('SELECT nombre, labor_principal FROM trabajadores ORDER BY nombre ASC');
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al cargar lista:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`Servidor activo en puerto ${port}`));