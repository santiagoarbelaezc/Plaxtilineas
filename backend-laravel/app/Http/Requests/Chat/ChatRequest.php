<?php

declare(strict_types=1);

namespace App\Http\Requests\Chat;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ChatRequest extends FormRequest
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
            'mensaje' => ['required', 'string', 'max:600'],
            'session_id' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mensaje.required' => 'El mensaje no puede estar vacío',
            'mensaje.max' => 'El mensaje supera el límite máximo de 600 caracteres',
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
