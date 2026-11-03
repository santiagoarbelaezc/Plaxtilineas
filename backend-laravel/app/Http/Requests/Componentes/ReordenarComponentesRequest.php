<?php

declare(strict_types=1);

namespace App\Http\Requests\Componentes;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ReordenarComponentesRequest extends FormRequest
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
            'orden_ids' => ['required', 'array'],
            'orden_ids.*' => ['required', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'orden_ids.required' => 'Debe enviar un array de IDs ordenados',
            'orden_ids.array' => 'Debe enviar un array de IDs ordenados',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        $firstError = $validator->errors()->first();

        throw new HttpResponseException(
            response()->json([
                'error' => $firstError ?: 'Debe enviar un array de IDs ordenados',
            ], 400)
        );
    }
}
