<?php

declare(strict_types=1);

namespace App\Mail\Transport;

use Hostinger\Api\SendApi;
use Hostinger\Model\V1SendRequest;
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

        $request = (new V1SendRequest)
            ->setTo(array_map(
                static fn ($address): string => $address->toString(),
                $originalMessage->getTo()
            ))
            ->setSubject((string) $originalMessage->getSubject())
            ->setDisplayName($this->displayName);

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

        try {
            $this->sendApi->sendEmail($this->mailboxResourceId, $request);
        } catch (Throwable $exception) {
            throw new TransportException(
                'Hostinger Mail API no pudo enviar el correo: '.$exception->getMessage(),
                (int) $exception->getCode(),
                $exception
            );
        }
    }

    public function __toString(): string
    {
        return 'hostinger://'.$this->mailboxResourceId;
    }
}
