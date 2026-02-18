const express = require('express'); // 1. Importas Express
const app = express();               // 2. CREAS la variable 'app' que faltaba
const port = process.env.PORT || 3000;
const path = require('path');

app.use(express.json());             // Para que el servidor entienda datos JSON
app.use(express.static('public'));

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