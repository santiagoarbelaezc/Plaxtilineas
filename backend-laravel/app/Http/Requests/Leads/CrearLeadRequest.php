<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class CrearLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'min:3', 'max:150'],
            'telefono' => ['required', 'string', 'max:50'],
            'fuente' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:150'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nombre.required' => 'Nombre y teléfono son obligatorios.',
            'telefono.required' => 'Nombre y teléfono son obligatorios.',
            'nombre.min' => 'El nombre debe tener al menos 3 caracteres.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        $firstError = $validator->errors()->first();

        throw new HttpResponseException(
            response()->json([
                'error' => $firstError ?: 'Datos de entrada inválidos',
            ], 422)
        );
    }
}
