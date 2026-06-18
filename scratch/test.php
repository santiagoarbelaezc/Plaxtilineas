<?php
$url = 'http://localhost/Plaxtilineas/backend-php/api/productos/buscar?nombre=lamina';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo "cURL Error: " . curl_error($ch) . "\n";
} else {
    echo "Response:\n";
    echo $response . "\n";
}
curl_close($ch);
