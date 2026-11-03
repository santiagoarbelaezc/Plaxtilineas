<?php

declare(strict_types=1);

namespace App\Http\Requests\Pqrs;

use Illuminate\Foundation\Http\FormRequest;

class CrearPQRRequest extends FormRequest
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
            'tipo' => ['required', 'string', 'in:PETICION,QUEJA,RECLAMO,SUGERENCIA'],
            'nombre_completo' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:150'],
            'telefono' => ['required', 'string', 'max:50'],
            'producto_relacionado' => ['nullable', 'string', 'max:150'],
            'descripcion' => ['required', 'string'],
            'archivos' => ['nullable', 'array'],
            'archivos.*' => ['nullable', 'file', 'max:10240'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tipo.required' => 'El tipo de solicitud es obligatorio.',
            'tipo.in' => 'Tipo de PQR inválido. Válidos: PETICION, QUEJA, RECLAMO, SUGERENCIA',
            'nombre_completo.required' => 'El nombre completo es obligatorio.',
            'email.required' => 'El correo electrónico es obligatorio.',
            'telefono.required' => 'El teléfono de contacto es obligatorio.',
            'descripcion.required' => 'La descripción es obligatoria.',
        ];
    }
}
