import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, Optional } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SwUpdate } from '@angular/service-worker';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
}

interface StoredCookieConsent {
  status: 'all' | 'essential' | 'custom';
  timestamp: string;
  expiresAt: string;
  version: string;
  preferences: CookiePreferences;
}

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cookies.html',
  styleUrl: './cookies.css'
})
export class CookieConsentComponent implements OnInit, OnDestroy {
  readonly STORAGE_KEY = 'app_cookie_consent_v2';
  readonly LEGACY_STORAGE_KEY = 'app_cookie_consent_v1';
  readonly CONSENT_TTL_DAYS = 180;

  isVisible = false;
  showModal = false;
  activeTab: 'preferences' | 'legal' = 'preferences';

  // Toggle States
  necessaryEnabled = true; // Always true & disabled
  analyticsEnabled = true;
  preferencesEnabled = true;
  marketingEnabled = false;

  private isBrowser: boolean;
  private boundOpenSettings = () => {
    this.showModal = true;
    this.cdr.detectChanges();
  };
  private boundResetConsent = () => {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.LEGACY_STORAGE_KEY);
    this.isVisible = true;
    this.cdr.detectChanges();
  };

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private cdr: ChangeDetectorRef,
    @Optional() private swUpdate: SwUpdate | null
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.checkConsent();
    window.addEventListener('open-cookie-settings', this.boundOpenSettings);
    window.addEventListener('reset-cookie-consent', this.boundResetConsent);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    window.removeEventListener('open-cookie-settings', this.boundOpenSettings);
    window.removeEventListener('reset-cookie-consent', this.boundResetConsent);
  }

  checkConsent(): void {
    if (!this.isBrowser) return;

    // Limpiar clave legacy v1 si existía y migrar preferencias de forma limpia
    const legacyRaw = localStorage.getItem(this.LEGACY_STORAGE_KEY);
    if (legacyRaw && !localStorage.getItem(this.STORAGE_KEY)) {
      try {
        const legacy = JSON.parse(legacyRaw);
        if (legacy?.preferences) {
          this.analyticsEnabled = !!legacy.preferences.analytics;
          this.preferencesEnabled = !!legacy.preferences.preferences;
          this.marketingEnabled = !!legacy.preferences.marketing;
          this.persistConsent(legacy.status || 'custom');
        }
      } catch {
        // Ignorar datos corruptos de v1
      } finally {
        localStorage.removeItem(this.LEGACY_STORAGE_KEY);
      }
    }

    const savedConsent = localStorage.getItem(this.STORAGE_KEY);
    if (!savedConsent) {
      this.isVisible = true;
      this.cdr.detectChanges();
      return;
    }

    try {
      const parsed: StoredCookieConsent = JSON.parse(savedConsent);
      const isExpired = parsed.expiresAt ? new Date(parsed.expiresAt).getTime() < Date.now() : false;

      if (isExpired || !parsed.preferences) {
        localStorage.removeItem(this.STORAGE_KEY);
        this.isVisible = true;
      } else {
        this.analyticsEnabled = !!parsed.preferences.analytics;
        this.preferencesEnabled = !!parsed.preferences.preferences;
        this.marketingEnabled = !!parsed.preferences.marketing;
        this.isVisible = false;
      }
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      this.isVisible = true;
    }

    this.cdr.detectChanges();
  }

  acceptAll(): void {
    this.analyticsEnabled = true;
    this.preferencesEnabled = true;
    this.marketingEnabled = true;

    this.saveConsent('all');
  }

  acceptEssential(): void {
    this.analyticsEnabled = false;
    this.preferencesEnabled = false;
    this.marketingEnabled = false;

    this.saveConsent('essential');
  }

  saveCustomPreferences(): void {
    this.saveConsent('custom');
  }

  private persistConsent(status: 'all' | 'essential' | 'custom'): StoredCookieConsent {
    const now = new Date();
    const expires = new Date(now.getTime() + this.CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000);

    const consentPayload: StoredCookieConsent = {
      status,
      timestamp: now.toISOString(),
      expiresAt: expires.toISOString(),
      version: 'v2',
      preferences: {
        necessary: true,
        analytics: this.analyticsEnabled,
        preferences: this.preferencesEnabled,
        marketing: this.marketingEnabled
      }
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(consentPayload));
    localStorage.removeItem(this.LEGACY_STORAGE_KEY);
    return consentPayload;
  }

  private saveConsent(status: 'all' | 'essential' | 'custom'): void {
    if (!this.isBrowser) return;

    const payload = this.persistConsent(status);
    this.isVisible = false;
    this.showModal = false;
    this.cdr.detectChanges();

    // Notificar de forma limpia sin bloquear la navegación
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: payload }));

    // Verificar en segundo plano si existe una versión más reciente del sitio desplegada
    if (this.swUpdate?.isEnabled) {
      this.swUpdate.checkForUpdate().catch(() => {});
    }
  }

  openModal(): void {
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  setActiveTab(tab: 'preferences' | 'legal'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }
}
