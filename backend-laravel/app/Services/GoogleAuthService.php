<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\GoogleAuthClientInterface;
use App\Exceptions\Domain\CredencialesInvalidasException;
use App\Exceptions\Domain\ServicioExternoException;
use Illuminate\Support\Facades\Http;
use Throwable;

class GoogleAuthService implements GoogleAuthClientInterface
{
    /**
     * @return array{email: string, name: string, sub: string}
     */
    public function verifyCredential(string $credential): array
    {
        try {
            $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $credential,
            ]);

            if ($response->failed()) {
                throw new CredencialesInvalidasException('Token de Google inválido o expirado.');
            }

            /** @var array<string, mixed> $data */
            $data = $response->json();

            $iss = (string) ($data['iss'] ?? '');
            if (! in_array($iss, ['accounts.google.com', 'https://accounts.google.com'], true)) {
                throw new CredencialesInvalidasException('Emisor de token de Google inválido.');
            }

            $googleClientId = (string) config('services.google.client_id', '');
            if ($googleClientId !== '' && ($data['aud'] ?? '') !== $googleClientId) {
                throw new CredencialesInvalidasException('Audiencia del token de Google no coincide.');
            }

            $email = (string) ($data['email'] ?? '');
            $name = (string) ($data['name'] ?? '');
            $sub = (string) ($data['sub'] ?? '');

            if ($email === '' || $sub === '') {
                throw new CredencialesInvalidasException('Token de Google no contiene la información necesaria.');
            }

            return [
                'email' => $email,
                'name' => $name,
                'sub' => $sub,
            ];
        } catch (CredencialesInvalidasException $e) {
            throw $e;
        } catch (Throwable $e) {
            throw new ServicioExternoException('Google OAuth', $e->getMessage(), [], $e);
        }
    }
}
