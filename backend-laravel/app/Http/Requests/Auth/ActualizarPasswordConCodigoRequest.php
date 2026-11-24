<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarPasswordConCodigoRequest extends FormRequest
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
            'codigo' => ['required', 'string', 'regex:/^\d{6}$/'],
            'nueva_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[^a-zA-Z0-9]/',
            ],
            'nueva_password_confirmation' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'codigo.required' => 'El código de verificación es obligatorio.',
            'codigo.regex' => 'El código debe tener exactamente 6 dígitos numéricos.',
            'nueva_password.required' => 'La nueva contraseña es obligatoria.',
            'nueva_password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'nueva_password.confirmed' => 'Las contraseñas no coinciden.',
            'nueva_password.regex' => 'La contraseña debe incluir mayúscula, minúscula, número y un carácter especial.',
        ];
    }
}
