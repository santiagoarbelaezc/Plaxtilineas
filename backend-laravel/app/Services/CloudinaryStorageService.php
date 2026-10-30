<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\MediaStorageInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

final class CloudinaryStorageService implements MediaStorageInterface
{
    /**
     * @return array{url: string, public_id: string}
     */
    public function upload(UploadedFile $file, string $folder = 'pqrs'): array
    {
        $cloudName = (string) config('services.cloudinary.cloud_name', '');
        $apiKey = (string) config('services.cloudinary.api_key', '');
        $apiSecret = (string) config('services.cloudinary.api_secret', '');

        if ($cloudName !== '' && $apiKey !== '' && $apiSecret !== '') {
            try {
                $timestamp = time();
                $signature = sha1("folder={$folder}&timestamp={$timestamp}{$apiSecret}");

                $response = Http::timeout(20)
                    ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                    ->post("https://api.cloudinary.com/v1_1/{$cloudName}/auto/upload", [
                        'api_key' => $apiKey,
                        'timestamp' => $timestamp,
                        'signature' => $signature,
                        'folder' => $folder,
                    ]);

                if ($response->successful()) {
                    /** @var array<string, mixed> $data */
                    $data = $response->json();
                    $url = (string) ($data['secure_url'] ?? $data['url'] ?? '');
                    $publicId = (string) ($data['public_id'] ?? '');

                    if ($url !== '') {
                        return ['url' => $url, 'public_id' => $publicId];
                    }
                }
            } catch (Throwable $e) {
                Log::warning('Cloudinary upload fallo, usando almacenamiento local como fallback', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Fallback local: disco público de Laravel
        $path = $file->store($folder, 'public');
        $publicId = $path;
        $url = Storage::disk('public')->url($path);

        return [
            'url' => $url,
            'public_id' => $publicId,
        ];
    }

    public function delete(string $publicId): bool
    {
        $cloudName = (string) config('services.cloudinary.cloud_name', '');
        $apiKey = (string) config('services.cloudinary.api_key', '');
        $apiSecret = (string) config('services.cloudinary.api_secret', '');

        if ($cloudName !== '' && $apiKey !== '' && $apiSecret !== '') {
            try {
                $timestamp = time();
                $signature = sha1("public_id={$publicId}&timestamp={$timestamp}{$apiSecret}");

                $response = Http::timeout(10)->post("https://api.cloudinary.com/v1_1/{$cloudName}/image/destroy", [
                    'api_key' => $apiKey,
                    'timestamp' => $timestamp,
                    'signature' => $signature,
                    'public_id' => $publicId,
                ]);

                if ($response->successful()) {
                    return true;
                }
            } catch (Throwable $e) {
                Log::warning('Cloudinary delete fallo', ['error' => $e->getMessage()]);
            }
        }

        if (Storage::disk('public')->exists($publicId)) {
            return Storage::disk('public')->delete($publicId);
        }

        return true;
    }
}
