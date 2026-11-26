<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarPerfilRequest extends FormRequest
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
            'nombre' => ['required', 'string', 'max:100'],
            'apellidos' => ['required', 'string', 'max:100'],
            'tipo_documento' => ['nullable', 'string', 'in:CC,NIT'],
            'numero_documento' => ['nullable', 'string', 'max:30', 'regex:/^[0-9]{5,15}(-[0-9])?$/'],
            'edad' => ['required', 'integer', 'min:0', 'max:120'],
            'direccion' => ['required', 'string', 'max:255'],
            'ciudad' => ['required', 'string', 'max:100'],
            'telefono' => ['required', 'string', 'regex:/^[0-9]{7,15}$/'],
        ];
    }
}
