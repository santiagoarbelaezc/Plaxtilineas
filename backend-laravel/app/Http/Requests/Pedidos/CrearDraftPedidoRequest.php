<?php

declare(strict_types=1);

namespace App\Http\Requests\Pedidos;

use Illuminate\Foundation\Http\FormRequest;

class CrearDraftPedidoRequest extends FormRequest
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
            'items' => ['required', 'array', 'min:1'],
            'items.*.producto_id' => ['required', 'integer'],
            'items.*.variante_id' => ['nullable', 'integer'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'direccion_envio' => ['required', 'string'],
            'ciudad' => ['nullable', 'string', 'max:100'],
            'departamento' => ['nullable', 'string', 'max:100'],
            'telefono_contacto' => ['nullable', 'string', 'max:50'],
            'metodo_pago' => ['nullable', 'string', 'max:50'],
            'notas' => ['nullable', 'string'],
            'wompi_desarrollo' => ['nullable', 'boolean'],
            'captchaId' => ['nullable', 'string'],
            'captcha_id' => ['nullable', 'string'],
            'captchaCode' => ['nullable', 'string'],
            'captcha_code' => ['nullable', 'string'],
            'captcha_respuesta' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Debes enviar al menos un producto.',
            'items.min' => 'Debes enviar al menos un producto.',
            'items.array' => 'Debes enviar al menos un producto.',
            'direccion_envio.required' => 'La dirección de envío es obligatoria.',
        ];
    }

    public function getCaptchaId(): string
    {
        return (string) ($this->input('captchaId') ?? $this->input('captcha_id') ?? '');
    }

    public function getCaptchaCode(): string
    {
        return (string) ($this->input('captchaCode') ?? $this->input('captcha_code') ?? $this->input('captcha_respuesta') ?? '');
    }
}
