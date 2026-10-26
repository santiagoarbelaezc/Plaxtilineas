import http from 'k6/http';
import crypto from 'k6/crypto';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://127.0.0.1:8000/api';
const EVENTS_SECRET = __ENV.WOMPI_EVENTS_SECRET;
const REFERENCE = __ENV.WOMPI_LOAD_REFERENCE;
const AMOUNT_CENTS = Number(__ENV.WOMPI_LOAD_AMOUNT_CENTS || '5000000');

if (!EVENTS_SECRET || !REFERENCE) {
  throw new Error('Configure WOMPI_EVENTS_SECRET y WOMPI_LOAD_REFERENCE para ejecutar la carga.');
}

export default function () {
  const eventId = `load_evt_${__VU}_${__ITER}_${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const transactionId = `tx_load_${__VU}_${__ITER}`;
  const status = 'APPROVED';
  const checksum = crypto.sha256(
    `${transactionId}${status}${AMOUNT_CENTS}${timestamp}${EVENTS_SECRET}`,
    'hex',
  );

  const payload = JSON.stringify({
    event: 'transaction.updated',
    id: eventId,
    timestamp: Number(timestamp),
    data: {
      transaction: {
        id: transactionId,
        status,
        reference: REFERENCE,
        amount_in_cents: AMOUNT_CENTS,
      },
    },
    signature: {
      properties: [
        'data.transaction.id',
        'data.transaction.status',
        'data.transaction.amount_in_cents',
      ],
      checksum: timestamp,
    },
  });

  const response = http.post(`${BASE_URL}/wompi/webhook`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Event-Checksum': checksum,
    },
  });

  check(response, {
    'status is successful or rate limited': (result) =>
      result.status === 200 || result.status === 429,
  });
}
