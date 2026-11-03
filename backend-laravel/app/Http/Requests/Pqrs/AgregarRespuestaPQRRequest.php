<?php

declare(strict_types=1);

namespace App\Http\Requests\Pqrs;

use Illuminate\Foundation\Http\FormRequest;

class AgregarRespuestaPQRRequest extends FormRequest
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
            'mensaje' => ['required', 'string'],
            'tipo' => ['nullable', 'string', 'in:CLIENTE,ADMINISTRACION'],
            'adjunto' => ['nullable', 'file', 'max:10240'],
        ];
    }
}
