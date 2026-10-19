<?php

declare(strict_types=1);

namespace App\Contracts;

use Illuminate\Http\UploadedFile;

interface MediaStorageInterface
{
    /**
     * @return array{url: string, public_id: string}
     */
    public function upload(UploadedFile $file, string $folder = 'pqrs'): array;

    public function delete(string $publicId): bool;
}
