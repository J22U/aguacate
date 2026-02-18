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

app.listen(port, () => {
    console.log(`Servidor del cultivo corriendo en el puerto ${port}`);
});