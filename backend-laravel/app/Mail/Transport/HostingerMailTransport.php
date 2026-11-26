<?php

declare(strict_types=1);

namespace App\Mail\Transport;

use Hostinger\Api\SendApi;
use Hostinger\Model\V1SendRequest;
use Illuminate\Support\Str;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Email;
use Throwable;

final class HostingerMailTransport extends AbstractTransport
{
    public function __construct(
        private readonly SendApi $sendApi,
        private readonly string $mailboxResourceId,
        private readonly string $displayName,
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $originalMessage = $message->getOriginalMessage();

        if (! $originalMessage instanceof Email) {
            throw new TransportException('Hostinger Mail API requiere un mensaje Symfony Email.');
        }

        // Hostinger Mail API devuelve 500 ERR_INTERNAL si el asunto o displayName
        // contiene caracteres no-ASCII (tildes, ñ, ¡, ¿). Normalizamos a ASCII limpio.
        $rawSubject = (string) $originalMessage->getSubject();
        $safeSubject = trim(preg_replace('/[^\x20-\x7E]/', '', Str::ascii($rawSubject)) ?? $rawSubject);
        $safeDisplayName = trim(preg_replace('/[^\x20-\x7E]/', '', Str::ascii($this->displayName)) ?? $this->displayName);

        $request = (new V1SendRequest)
            ->setTo(array_map(
                static fn ($address): string => $address->toString(),
                $originalMessage->getTo()
            ))
            ->setSubject($safeSubject !== '' ? $safeSubject : 'Notificacion Plaxtilineas')
            ->setDisplayName($safeDisplayName !== '' ? $safeDisplayName : 'Plaxtilineas');

        $html = $originalMessage->getHtmlBody();
        $text = $originalMessage->getTextBody();

        if ($html !== null) {
            $request->setHtml($html);
        }

        if ($text !== null) {
            $request->setText($text);
        } elseif ($html !== null) {
            $request->setText(trim(strip_tags($html)));
        }

        $cc = $originalMessage->getCc();
        if ($cc !== []) {
            $request->setCc(array_map(
                static fn ($address): string => $address->toString(),
                $cc
            ));
        }

        $bcc = $originalMessage->getBcc();
        if ($bcc !== []) {
            $request->setBcc(array_map(
                static fn ($address): string => $address->toString(),
                $bcc
            ));
        }

        $lastException = null;
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            try {
                $this->sendApi->sendEmail($this->mailboxResourceId, $request);

                return;
            } catch (Throwable $exception) {
                $lastException = $exception;
                if ($attempt < 2) {
                    usleep(350_000);
                }
            }
        }

        throw new TransportException(
            'Hostinger Mail API no pudo enviar el correo: '.($lastException?->getMessage() ?? 'Error desconocido'),
            (int) ($lastException?->getCode() ?? 0),
            $lastException
        );
    }

    public function __toString(): string
    {
        return 'hostinger://'.$this->mailboxResourceId;
    }
}
