const express = require('express');
const path = require('path');
const sql = require('mssql');
const app = express();
const port = process.env.PORT || 3000;

// Configuración de la conexión a SQL Server
const dbConfig = process.env.DATABASE_URL; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// RUTA PRINCIPAL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 1. RUTA PARA GUARDAR (POST)
app.post('/api/movimientos', async (req, res) => {
    const { lote, monto, tipo, nota } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('lote', sql.NVarChar, lote)
            .input('monto', sql.Decimal(15, 2), monto)
            .input('tipo', sql.NVarChar, tipo)
            .input('nota', sql.NVarChar, nota)
            .query('INSERT INTO movimientos (lote, monto, tipo, nota) VALUES (@lote, @monto, @tipo, @nota)');
        
        res.json({ success: true });
    } catch (err) {
        console.error("Error al guardar:", err);
        res.status(500).send("Error en el servidor");
    }
});

// 2. RUTA PARA EL RESUMEN (GET)
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
        console.error("Error en resumen:", err);
        res.status(500).json({ error: 'Error al calcular resumen' });
    }
});

// 3. RUTA PARA EL HISTORIAL (GET)
app.get('/api/historial', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT TOP 10 * FROM movimientos ORDER BY fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en historial:", err);
        res.status(500).send(err.message);
    }
});

app.listen(port, () => {
    console.log(`Servidor del cultivo corriendo en el puerto ${port}`);
});