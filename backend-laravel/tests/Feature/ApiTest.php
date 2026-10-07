<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiTest extends TestCase
{
    public function test_api_test_get_endpoint_returns_json(): void
    {
        $response = $this->getJson('/api/test');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'status',
                     'message',
                     'framework',
                     'php_version',
                     'environment',
                     'server_time',
                     'client_ip',
                 ])
                 ->assertJson([
                     'status' => 'success',
                 ]);
    }

    public function test_api_test_post_endpoint_echoes_payload(): void
    {
        $payload = ['ping' => 'pong', 'user' => 'Santiago'];
        $response = $this->postJson('/api/test', $payload);

        $response->assertStatus(200)
                 ->assertJson([
                     'status' => 'success',
                     'payload' => $payload,
                 ]);
    }

    public function test_api_health_endpoint_returns_healthy(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
                 ->assertJson([
                     'status' => 'healthy',
                 ]);
    }

    public function test_api_db_check_endpoint_returns_status(): void
    {
        $response = $this->getJson('/api/db-check');

        $response->assertStatus(200)
                 ->assertJsonStructure(['status', 'message']);
    }
}
