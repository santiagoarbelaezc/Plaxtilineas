// Ruta simple de health check para AWS
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Plaxtilineas Backend',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta raíz también responde
app.get('/', (req, res) => {
  res.json({
    message: 'API Plaxtilineas Backend',
    version: '1.0.0',
    health: '/health',
    docs: '/api-docs'
  });
});
