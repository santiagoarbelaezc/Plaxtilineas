import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
}

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cookies.html',
  styleUrl: './cookies.css'
})
export class CookieConsentComponent implements OnInit {
  readonly STORAGE_KEY = 'app_cookie_consent_v1';

  isVisible = false;
  showModal = false;
  activeTab: 'preferences' | 'legal' = 'preferences';

  // Toggle States
  necessaryEnabled = true; // Always true & disabled
  analyticsEnabled = true;
  preferencesEnabled = true;
  marketingEnabled = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.checkConsent();

      // Permitir abrir el modal o resetear desde cualquier parte del sitio web
      window.addEventListener('open-cookie-settings', () => {
        this.showModal = true;
        this.cdr.detectChanges();
      });

      window.addEventListener('reset-cookie-consent', () => {
        localStorage.removeItem(this.STORAGE_KEY);
        this.isVisible = true;
        this.cdr.detectChanges();
      });
    }
  }

  checkConsent(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const savedConsent = localStorage.getItem(this.STORAGE_KEY);
    console.log('🍪 Estado de consentimiento de cookies en localStorage:', savedConsent ? 'REGISTRADO' : 'NO REGISTRADO');

    if (!savedConsent) {
      this.isVisible = true;
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        if (parsed && parsed.preferences) {
          this.analyticsEnabled = !!parsed.preferences.analytics;
          this.preferencesEnabled = !!parsed.preferences.preferences;
          this.marketingEnabled = !!parsed.preferences.marketing;
        }
      } catch (e) {
        console.warn('Error al leer preferencias de cookies guardadas', e);
      }
      this.isVisible = false;
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

  private saveConsent(status: 'all' | 'essential' | 'custom'): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const consentPayload = {
      status,
      timestamp: new Date().toISOString(),
      version: 'v1',
      preferences: {
        necessary: true,
        analytics: this.analyticsEnabled,
        preferences: this.preferencesEnabled,
        marketing: this.marketingEnabled
      }
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(consentPayload));
    this.isVisible = false;
    this.showModal = false;
    this.cdr.detectChanges();
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
