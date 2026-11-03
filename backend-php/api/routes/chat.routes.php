<?php
/**
 * Rutas para el Asistente Virtual Mateo
 */

require_once __DIR__ . '/../controllers/ChatController.php';

$chatController = new ChatController();

// POST /api/chat
if ($uri === '/chat' && $method === 'POST') {
    $chatController->chat();
    exit;
}

// GET /api/chat/historial
if ($uri === '/chat/historial' && $method === 'GET') {
    $chatController->historial();
    exit;
}

// DELETE /api/chat/limpiar
if ($uri === '/chat/limpiar' && $method === 'DELETE') {
    $chatController->limpiar();
    exit;
}
