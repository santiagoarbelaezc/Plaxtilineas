<?php

declare(strict_types=1);

namespace App\Http\Requests\Pqrs;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarEstadoPQRRequest extends FormRequest
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
            'estado' => ['required', 'string', 'in:PENDIENTE,EN_PROCESO,RESUELTO,CERRADO'],
            'mensaje_respuesta' => ['nullable', 'string'],
        ];
    }
}
