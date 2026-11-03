<?php

declare(strict_types=1);

namespace App\Http\Requests\Carrito;

use Illuminate\Foundation\Http\FormRequest;

class SyncCarritoRequest extends FormRequest
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
            'items' => ['present', 'array'],
            'items.*.producto_id' => ['required', 'integer'],
            'items.*.variante_id' => ['nullable', 'integer'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.present' => 'Los items deben ser un arreglo.',
            'items.array' => 'Los items deben ser un arreglo.',
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getItems(): array
    {
        /** @var array<int, array<string, mixed>> $items */
        $items = $this->input('items', []);

        return $items;
    }
}
