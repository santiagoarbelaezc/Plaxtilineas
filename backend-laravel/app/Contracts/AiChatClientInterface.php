<?php

declare(strict_types=1);

namespace App\Contracts;

interface AiChatClientInterface
{
    /**
     * @param  list<array{role: string, content: string}>  $mensajes
     * @param  list<array<string, mixed>>  $productosContexto
     */
    public function generarRespuesta(array $mensajes, array $productosContexto, string $systemPrompt): string;

    /**
     * @param  list<array{role: string, content: string}>  $mensajes
     */
    public function generarRespuestaDashboard(array $mensajes, string $systemPrompt): string;
}
