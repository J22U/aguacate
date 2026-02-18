const express = require('express');
const path = require('path');
const sql = require('mssql');
const app = express();
const port = process.env.PORT || 3000;

const dbConfig = process.env.DATABASE_URL; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 1. GUARDAR: Usando 'descripcion' y 'lote_id' como pide tu DB
app.post('/api/movimientos', async (req, res) => {
    const { lote, monto, tipo, nota } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('lote_id', sql.Int, 1) // Tu DB pide un INT para lote_id
            .input('monto', sql.Decimal(18, 2), monto)
            .input('tipo', sql.NVarChar, tipo)
            .input('descripcion', sql.NVarChar, nota) // Aquí se mapea nota -> descripcion
            .query('INSERT INTO movimientos (lote_id, monto, tipo, descripcion) VALUES (@lote_id, @monto, @tipo, @descripcion)');
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al guardar");
    }
});

// 2. RESUMEN: Usando 'descripcion' para los kilos
app.get('/api/resumen', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                SUM(CASE WHEN tipo IN ('gasto_insumo', 'gasto_jornal') THEN monto ELSE 0 END) as inversion,
                SUM(CASE WHEN tipo = 'venta' THEN monto ELSE 0 END) as ventas
            FROM movimientos
        `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error en resumen' });
    }
});

// 3. HISTORIAL: Traer los datos reales
app.get('/api/historial', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT TOP 10 fecha, tipo, monto, descripcion as nota FROM movimientos ORDER BY fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// API: Registrar Trabajador
app.post('/api/trabajadores', async (req, res) => {
    // Extraemos los datos del cuerpo de la solicitud
    const { nombre, documento, labor } = req.body;

    // Validación: El documento es clave en tu tabla
    if (!nombre || !documento) {
        return res.status(400).json({ error: "Nombre y Documento son requeridos" });
    }

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('documento', sql.NVarChar, documento)
            .input('labor_principal', sql.NVarChar, labor || 'General') // Nombre exacto de tu columna
            .query('INSERT INTO trabajadores (nombre, documento, labor_principal) VALUES (@nombre, @documento, @labor_principal)');
        
        res.json({ success: true });
    } catch (err) {
        // Esto imprimirá el error real en los logs de Render para que lo veas
        console.error("ERROR SQL AL GUARDAR TRABAJADOR:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});

// API: Obtener Lista de Trabajadores
app.get('/api/trabajadores', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT nombre, labor_principal FROM trabajadores ORDER BY nombre ASC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(port, () => console.log(`Corriendo en ${port}`));