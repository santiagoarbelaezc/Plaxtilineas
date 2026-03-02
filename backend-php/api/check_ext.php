<?php
header('Content-Type: application/json');
echo json_encode([
    'php_version' => PHP_VERSION,
    'pdo_loaded' => extension_loaded('pdo'),
    'pdo_mysql_loaded' => extension_loaded('pdo_mysql'),
    'openssl_loaded' => extension_loaded('openssl'),
    'curl_loaded' => extension_loaded('curl'),
    'display_errors' => ini_get('display_errors'),
    'error_reporting' => error_reporting()
]);
