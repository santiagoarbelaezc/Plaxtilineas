<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
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
        $rules = [
            'nombre' => ['required', 'string', 'max:100'],
            'correo' => ['required', 'string', 'email', 'max:150'],
            'password' => ['required', 'string', 'min:6'],
            'rol' => ['nullable', 'string', 'in:cliente,admin'],
            'captcha_id' => ['nullable', 'string'],
            'captchaId' => ['nullable', 'string'],
            'captcha_code' => ['nullable', 'string'],
            'captchaCode' => ['nullable', 'string'],
            'captcha_respuesta' => ['nullable', 'string'],
        ];

        $rol = $this->input('rol', 'cliente');
        if ($rol === 'cliente') {
            $rules['apellidos'] = ['required', 'string', 'max:100'];
            $rules['edad'] = ['required', 'integer', 'min:0', 'max:120'];
            $rules['direccion'] = ['required', 'string', 'max:255'];
            $rules['ciudad'] = ['required', 'string', 'max:100'];
            $rules['telefono'] = ['required', 'string', 'max:50'];
        }

        return $rules;
    }

    public function getCaptchaId(): ?string
    {
        /** @var string|null $id */
        $id = $this->input('captchaId') ?? $this->input('captcha_id');

        return $id ? (string) $id : null;
    }

    public function getCaptchaCode(): ?string
    {
        /** @var string|null $code */
        $code = $this->input('captchaCode') ?? $this->input('captcha_code') ?? $this->input('captcha_respuesta');

        return $code ? (string) $code : null;
    }
}
