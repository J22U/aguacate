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