<?php

declare(strict_types=1);

namespace App\Http\Requests\Chat;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class DashboardAssistantRequest extends FormRequest
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
            'mensajes' => ['required', 'array', 'min:1'],
            'mensajes.*.sender' => ['required', 'string', 'in:user,assistant,system'],
            'mensajes.*.text' => ['required', 'string'],
            'session_id' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mensajes.required' => 'El historial de mensajes no puede estar vacío',
            'mensajes.min' => 'El historial de mensajes no puede estar vacío',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        $firstError = $validator->errors()->first();

        throw new HttpResponseException(
            response()->json([
                'error' => $firstError ?: 'El historial de mensajes no puede estar vacío',
            ], 400)
        );
    }
}
