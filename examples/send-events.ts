/**
 * Example: Send test events to a local or deployed Uniflow endpoint
 * Run: npx ts-node examples/send-events.ts
 */

const INGEST_URL = process.env.UNIFLOW_INGEST_URL ?? 'http://localhost:4566';
const WRITE_KEY = process.env.UNIFLOW_WRITE_KEY ?? 'test_write_key';

async function send(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${INGEST_URL}/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(WRITE_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`POST /v1/${path}:`, res.status, data);
}

async function main() {
  const userId = 'user_demo_001';
  const anonymousId = 'anon_abc123';

  // Track anonymous page view
  await send('page', {
    anonymousId,
    name: 'Home',
    properties: { url: 'https://example.com', title: 'Home Page' },
  });

  // Identify user
  await send('identify', {
    userId,
    anonymousId,
    traits: {
      email: 'demo@example.com',
      name: 'Demo User',
      plan: 'pro',
    },
  });

  // Track purchase
  await send('track', {
    userId,
    event: 'Order Completed',
    properties: {
      orderId: 'ord_789',
      revenue: 99.99,
      currency: 'USD',
      items: [{ name: 'Pro Plan', price: 99.99 }],
    },
  });

  // Group / account association
  await send('group', {
    userId,
    groupId: 'acme_corp',
    traits: { name: 'ACME Corp', industry: 'Technology', employees: 500 },
  });

  console.log('\nDone! Check your profiles at the Admin UI.');
}

main().catch(console.error);
