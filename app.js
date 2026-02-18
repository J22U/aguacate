const express = require('express');
const path = require('path');
const sql = require('mssql'); // Asegúrate de haber hecho: npm install mssql
const app = express();
const port = process.env.PORT || 3000;

// Configuración de la conexión (Render usa la variable DATABASE_URL)
const dbConfig = process.env.DATABASE_URL; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Ejemplo de ruta en Node.js/Express


app.post('/api/registrar-movimiento', async (req, res) => {
    const { lote, monto, tipo, nota } = req.body;
    try {
        const nuevoMovimiento = await pool.query(
            "INSERT INTO movimientos (lote_id, monto, tipo, descripcion) VALUES ($1, $2, $3, $4) RETURNING *",
            [lote, monto, tipo, nota]
        );
        res.json(nuevoMovimiento.rows[0]);
    } catch (err) {
        res.status(500).send("Error en el servidor");
    }
});

// RUTA PARA OBTENER EL RESUMEN DEL DASHBOARD
app.get('/api/resumen-cultivo', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        
        // Consultamos la suma de gastos y ventas directamente en SQL
        const result = await pool.request().query(`
            SELECT 
                SUM(CASE WHEN tipo IN ('gasto_insumo', 'gasto_jornal') THEN monto ELSE 0 END) as inversion,
                SUM(CASE WHEN tipo = 'venta' THEN monto ELSE 0 END) as ventas,
                SUM(CASE WHEN tipo = 'venta' AND descripcion LIKE '%kg%' 
                         THEN TRY_CAST(SUBSTRING(descripcion, 1, CHARINDEX('kg', descripcion)-1) AS INT) 
                         ELSE 0 END) as kilos
            FROM movimientos
        `);

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al calcular resumen' });
    }
});

app.get('/api/historial', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT TOP 10 * FROM movimientos ORDER BY fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(port, () => {
    console.log(`Servidor del cultivo corriendo en el puerto ${port}`);
});