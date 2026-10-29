<?php

declare(strict_types=1);

namespace App\Http\Requests\Notificaciones;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProductoNuevoRequest extends FormRequest
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
            'producto' => ['required', 'array'],
            'producto.id' => ['required', 'integer', 'min:1'],
            'producto.nombre' => ['required', 'string', 'max:255'],
            'producto.descripcion' => ['nullable', 'string', 'max:500'],
            'producto.imagen_url' => ['nullable', 'url:https', 'max:500'],
            'producto.precio' => ['nullable', 'numeric', 'min:0'],
            'producto.unidad' => ['nullable', 'string', 'max:20'],
            'producto.categoria' => ['nullable', 'string', 'max:120'],
        ];
    }

    /**
     * Solo los campos permitidos del producto.
     *
     * @return array<string, mixed>
     */
    public function producto(): array
    {
        /** @var array<string, mixed> $producto */
        $producto = $this->validated()['producto'];

        return $producto;
    }
}

