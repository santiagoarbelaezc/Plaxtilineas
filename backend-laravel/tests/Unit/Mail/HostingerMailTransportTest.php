<?php

declare(strict_types=1);

use App\Mail\Transport\HostingerMailTransport;
use Hostinger\Api\SendApi;
use Hostinger\Model\V1SendRequest;
use Symfony\Component\Mime\Email;

test('el transporte Hostinger convierte un correo Symfony en una solicitud del SDK', function () {
    $sendApi = Mockery::mock(SendApi::class);
    $sendApi->shouldReceive('sendEmail')
        ->once()
        ->withArgs(function (string $mailboxResourceId, V1SendRequest $request): bool {
            return $mailboxResourceId === 'mailbox-test'
                && $request->getTo() === ['cliente@example.com']
                && $request->getSubject() === 'Prueba'
                && $request->getHtml() === '<p>Contenido</p>'
                && $request->getText() === 'Contenido'
                && $request->getDisplayName() === 'Plaxtilineas';
        });

    $transport = new HostingerMailTransport($sendApi, 'mailbox-test', 'Plaxtilineas');

    $transport->send(
        (new Email)
            ->from('info@plaxtilineas.com')
            ->to('cliente@example.com')
            ->subject('Prueba')
            ->html('<p>Contenido</p>')
    );
});
