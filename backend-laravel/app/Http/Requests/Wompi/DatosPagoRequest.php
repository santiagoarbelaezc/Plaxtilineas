<?php

declare(strict_types=1);

namespace App\Http\Requests\Wompi;

use Illuminate\Foundation\Http\FormRequest;

class DatosPagoRequest extends FormRequest
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
            'pedido_id' => ['required', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'pedido_id.required' => 'pedido_id es requerido.',
        ];
    }

    public function getPedidoId(): int
    {
        return (int) $this->input('pedido_id');
    }
}
