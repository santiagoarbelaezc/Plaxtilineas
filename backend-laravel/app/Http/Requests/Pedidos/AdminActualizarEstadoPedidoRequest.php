<?php

declare(strict_types=1);

namespace App\Http\Requests\Pedidos;

use Illuminate\Foundation\Http\FormRequest;

class AdminActualizarEstadoPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'estado' => ['required', 'string'],
            'guia_numero' => ['nullable', 'string', 'max:100'],
            'transportadora' => ['nullable', 'string', 'max:100'],
            'solicitud_cliente' => ['nullable', 'boolean'],
        ];
    }
}
