<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\GoogleAuthClientInterface;
use App\Contracts\WompiClientInterface;
use App\Services\GoogleAuthService;
use App\Services\WompiService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            GoogleAuthClientInterface::class,
            GoogleAuthService::class
        );

        $this->app->bind(
            WompiClientInterface::class,
            WompiService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip() ?: '127.0.0.1');
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip() ?: '127.0.0.1');
        });

        RateLimiter::for('chat', function (Request $request) {
            $key = (string) ($request->header('X-Session-ID') ?: $request->ip() ?: '127.0.0.1');

            return Limit::perMinute(30)->by($key);
        });

        RateLimiter::for('wompi-webhook', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip() ?: '127.0.0.1');
        });
    }
}
