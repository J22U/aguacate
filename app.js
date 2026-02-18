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
// CORRECCIÓN EN EL SERVIDOR (app.js)
app.post('/api/movimientos', async (req, res) => {
    const { fecha, lote, monto, kilos, tipo, nota } = req.body;
    try {
        let pool = await connectDB();
        await pool.request()
            .input('fecha', fecha)
            .input('lote_id', lote) // Cambiamos lote por lote_id
            .input('monto', monto)
            .input('kilos', kilos)
            .input('tipo', tipo)
            .input('descripcion', nota) // Cambiamos nota por descripcion
            .query(`INSERT INTO movimientos (fecha, lote_id, monto, kilos, tipo, descripcion) 
                    VALUES (@fecha, @lote_id, @monto, @kilos, @tipo, @descripcion)`);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. RESUMEN (Corregido con ISNULL para evitar el error de JSON)
app.get('/api/resumen', async (req, res) => {
    try {
        let pool = await connectDB();
        const result = await pool.request().query(`
            SELECT 
                -- Suma solo gastos
                SUM(CASE WHEN tipo IN ('gasto_insumo', 'gasto_jornal', 'gasto_otros') THEN monto ELSE 0 END) as inversion,
                
                -- Suma solo montos de ventas
                SUM(CASE WHEN tipo = 'venta' THEN monto ELSE 0 END) as ventas,
                
                -- SUMA SOLO KILOS DE VENTAS (Esto evita que se mezclen otros datos)
                SUM(CASE WHEN tipo = 'venta' THEN ISNULL(kilos, 0) ELSE 0 END) as totalKilos 
            FROM movimientos
        `);

        // Si la tabla está vacía, SQL devuelve NULL. Esto asegura que siempre devuelva 0.
        const resumen = {
            inversion: result.recordset[0].inversion || 0,
            ventas: result.recordset[0].ventas || 0,
            totalKilos: result.recordset[0].totalKilos || 0
        };

        res.json(resumen);
    } catch (err) {
        console.error("Error en resumen SQL:", err);
        res.status(500).json({ error: err.message });
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
// REGISTRAR TRABAJADOR (Corregido)
app.post('/api/trabajadores', async (req, res) => {
    const { nombre, documento, labor } = req.body;
    if (!nombre || !documento) return res.status(400).json({ error: "Datos incompletos" });

    try {
        let pool = await connectDB();
        await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('documento', sql.NVarChar, documento)
            .input('labor', sql.NVarChar, labor || 'General')
            // Corregido: Quitamos el SELECT y el ID (que es automático)
            .query('INSERT INTO trabajadores (nombre, documento, labor_principal) VALUES (@nombre, @documento, @labor)');
        
        res.json({ success: true });
    } catch (err) {
        console.error("Error al registrar trabajador:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// OBTENER TRABAJADORES (Asegúrate de que incluya el ID)
app.get('/api/trabajadores', async (req, res) => {
    try {
        let pool = await connectDB();
        // IMPORTANTE: SELECT id para que el frontend pueda editar/eliminar
        const result = await pool.request().query('SELECT id, nombre, documento, labor_principal FROM trabajadores');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// RUTA PARA ELIMINAR TRABAJADOR
app.delete('/api/trabajadores/:id', async (req, res) => {
    try {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM trabajadores WHERE id = @id');
        res.json({ success: true, message: 'Trabajador eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar en la base de datos' });
    }
});

// RUTA PARA ACTUALIZAR TRABAJADOR
app.put('/api/trabajadores/:id', async (req, res) => {
    const { nombre, documento, labor } = req.body;
    try {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('nombre', sql.NVarChar, nombre)
            .input('documento', sql.NVarChar, documento)
            .input('labor', sql.NVarChar, labor)
            .query(`UPDATE trabajadores 
                    SET nombre = @nombre, 
                        documento = @documento, 
                        labor_principal = @labor 
                    WHERE id = @id`);
        res.json({ success: true, message: 'Trabajador actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar en la base de datos' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor funcionando en puerto ${PORT}`);
});