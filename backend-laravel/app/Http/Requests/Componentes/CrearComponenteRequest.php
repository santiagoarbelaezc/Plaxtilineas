<?php

declare(strict_types=1);

namespace App\Http\Requests\Componentes;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class CrearComponenteRequest extends FormRequest
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
            'tipo' => ['required', 'string', 'max:100'],
            'contenido' => ['required', 'array'],
            'activo' => ['nullable'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tipo.required' => 'El tipo de componente y el contenido son obligatorios',
            'contenido.required' => 'El tipo de componente y el contenido son obligatorios',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        $firstError = $validator->errors()->first();

        throw new HttpResponseException(
            response()->json([
                'error' => $firstError ?: 'Datos de entrada inválidos',
            ], 400)
        );
    }
}
