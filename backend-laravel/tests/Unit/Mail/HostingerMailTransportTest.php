<?php

declare(strict_types=1);

use App\Mail\Transport\HostingerMailTransport;
use Hostinger\Api\SendApi;
use Hostinger\Model\V1SendRequest;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

test('HostingerMailTransport normaliza asuntos con tildes y signos no-ASCII para evitar error 500 de Hostinger', function () {
    $capturedRequest = null;

    $sendApiMock = Mockery::mock(SendApi::class);
    $sendApiMock->shouldReceive('sendEmail')
        ->once()
        ->with('mailbox-test', Mockery::on(function (V1SendRequest $req) use (&$capturedRequest) {
            $capturedRequest = $req;

            return true;
        }));

    $transport = new HostingerMailTransport($sendApiMock, 'mailbox-test', 'Plaxtilíneas');

    $email = (new Email)
        ->from(new Address('notificaciones@plaxtilineas.com', 'Plaxtilineas'))
        ->to(new Address('cliente@test.com'))
        ->subject('¡Actualización de tu pedido PX-2026-0018 — Niño!')
        ->html('<p>Tu pedido fue entregado.</p>');

    $envelope = new Envelope(
        new Address('notificaciones@plaxtilineas.com'),
        [new Address('cliente@test.com')]
    );

    $transport->send($email, $envelope);

    expect($capturedRequest)->not->toBeNull()
        ->and($capturedRequest->getSubject())->toBe('Actualizacion de tu pedido PX-2026-0018 - Nino!')
        ->and($capturedRequest->getDisplayName())->toBe('Plaxtilineas');
});

test('HostingerMailTransport reintenta automaticamente una vez ante error temporal de Hostinger', function () {
    $attempts = 0;

    $sendApiMock = Mockery::mock(SendApi::class);
    $sendApiMock->shouldReceive('sendEmail')
        ->twice()
        ->andReturnUsing(function () use (&$attempts) {
            $attempts++;
            if ($attempts === 1) {
                throw new RuntimeException('500 ERR_INTERNAL');
            }

            return null;
        });

    $transport = new HostingerMailTransport($sendApiMock, 'mailbox-test', 'Plaxtilineas');

    $email = (new Email)
        ->from(new Address('notificaciones@plaxtilineas.com'))
        ->to(new Address('cliente@test.com'))
        ->subject('Actualizacion de pedido')
        ->html('<p>Entregado</p>');

    $envelope = new Envelope(
        new Address('notificaciones@plaxtilineas.com'),
        [new Address('cliente@test.com')]
    );

    $transport->send($email, $envelope);

    expect($attempts)->toBe(2);
});
