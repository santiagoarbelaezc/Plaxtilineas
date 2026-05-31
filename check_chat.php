<?php
require __DIR__ . '/backend-php/api/config/database.php';
$db = Database::getConnection();
$stmt = $db->query('SELECT * FROM chat_historial ORDER BY created_at DESC LIMIT 5');
$res = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($res, JSON_PRETTY_PRINT);
