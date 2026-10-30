<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RecuperarPasswordRequest extends FormRequest
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
            'correo' => ['required', 'string', 'email'],
            'captcha_id' => ['nullable', 'string'],
            'captchaId' => ['nullable', 'string'],
            'captcha_code' => ['nullable', 'string'],
            'captchaCode' => ['nullable', 'string'],
        ];
    }

    public function getCaptchaId(): ?string
    {
        /** @var string|null $id */
        $id = $this->input('captcha_id') ?? $this->input('captchaId');

        return $id ? (string) $id : null;
    }

    public function getCaptchaCode(): ?string
    {
        /** @var string|null $code */
        $code = $this->input('captcha_code') ?? $this->input('captchaCode');

        return $code ? (string) $code : null;
    }
}
