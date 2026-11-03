<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class CambiarPasswordTemporalRequest extends FormRequest
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
            'nueva_password' => ['nullable', 'string', 'min:8'],
            'password' => ['nullable', 'string', 'min:8'],
        ];
    }

    public function getNuevaPassword(): string
    {
        /** @var string|null $pw */
        $pw = $this->input('nueva_password') ?? $this->input('password');

        return (string) $pw;
    }
}
