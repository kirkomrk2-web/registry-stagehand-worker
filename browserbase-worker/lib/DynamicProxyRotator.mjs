// lib/DynamicProxyRotator.mjs
/**
 * Enhanced Dynamic Proxy Rotation Manager
 * - Tracks proxy health and usage
 * - Automatic rotation on failures
 * - Real-time status monitoring
 * - Visual dashboard integration
 */

import { COLORS } from "../config/constants.mjs";

export class DynamicProxyRotator {
  constructor(proxies = []) {
    this.proxies = proxies.map((p, idx) => ({
      ...p,
      id: p.id || `proxy-${idx}`,
      status: 'idle',           // idle, active, error, rotating
      health: 100,              // 0-100 health score
      requests: 0,              // total requests
      failures: 0,              // failed requests
      successes: 0,             // successful requests
      lastUsed: null,           // timestamp
      lastError: null,          // error message
      lastSuccess: null,        // timestamp
      country: null,            // detected country
      verified: false,          // has been verified
      currentBrowser: null,     // current browser instance
    }));

    this.currentIndex = -1;
    this.rotationInterval = 5 * 60 * 1000; // 5 minutes default
    this.autoRotate = true;
    this.rotationTimer = null;
    this.stats = {
      totalRotations: 0,
      totalRequests: 0,
      totalFailures: 0,
      uptime: Date.now(),
    };
  }

  /**
   * Get the next available proxy using round-robin with health checks
   */
  getNext() {
    const enabled = this.proxies.filter(p => p.enabled);
    if (enabled.length === 0) return null;

    // Sort by health score and last used time
    const sorted = enabled.sort((a, b) => {
      if (a.health !== b.health) return b.health - a.health;
      const aTime = a.lastUsed || 0;
      const bTime = b.lastUsed || 0;
      return aTime - bTime; // least recently used first
    });

    this.currentIndex = (this.currentIndex + 1) % sorted.length;
    const proxy = sorted[this.currentIndex];
    
    proxy.status = 'active';
    proxy.lastUsed = Date.now();
    proxy.requests++;
    this.stats.totalRequests++;

    console.log(`${COLORS.cyan}[ROTATOR]${COLORS.reset} Selected proxy: ${proxy.id} (health: ${proxy.health}%)`);
    
    return proxy;
  }

  /**
   * Get current active proxy
   */
  getCurrent() {
    return this.proxies.find(p => p.status === 'active') || this.proxies[0];
  }

  /**
   * Mark proxy as successful
   */
  markSuccess(proxyId) {
    const proxy = this.proxies.find(p => p.id === proxyId);
    if (!proxy) return;

    proxy.successes++;
    proxy.lastSuccess = Date.now();
    proxy.status = 'idle';
    
    // Improve health
    proxy.health = Math.min(100, proxy.health + 5);

    console.log(`${COLORS.green}[ROTATOR]${COLORS.reset} Proxy ${proxyId} success (health: ${proxy.health}%)`);
  }

  /**
   * Mark proxy as failed
   */
  markFailure(proxyId, error = '') {
    const proxy = this.proxies.find(p => p.id === proxyId);
    if (!proxy) return;

    proxy.failures++;
    proxy.lastError = error;
    proxy.status = 'error';
    
    // Degrade health
    proxy.health = Math.max(0, proxy.health - 20);

    console.log(`${COLORS.red}[ROTATOR]${COLORS.reset} Proxy ${proxyId} failed (health: ${proxy.health}%) - ${error}`);
    
    this.stats.totalFailures++;

    // Auto-rotate if health is too low
    if (proxy.health < 30 && this.autoRotate) {
      this.rotateNow();
    }
  }

  /**
   * Update proxy verification status
   */
  markVerified(proxyId, country) {
    const proxy = this.proxies.find(p => p.id === proxyId);
    if (!proxy) return;

    proxy.verified = true;
    proxy.country = country;
    proxy.health = Math.max(proxy.health, 80);

    console.log(`${COLORS.green}[ROTATOR]${COLORS.reset} Proxy ${proxyId} verified: ${country}`);
  }

  /**
   * Force rotation to next proxy
   */
  rotateNow() {
    const current = this.getCurrent();
    if (current) {
      current.status = 'rotating';
      console.log(`${COLORS.yellow}[ROTATOR]${COLORS.reset} Forcing rotation from ${current.id}`);
    }

    const next = this.getNext();
    this.stats.totalRotations++;

    console.log(`${COLORS.cyan}[ROTATOR]${COLORS.reset} Rotated to ${next?.id || 'none'}`);
    
    return next;
  }

  /**
   * Start automatic rotation timer
   */
  startAutoRotation(intervalMs = this.rotationInterval) {
    this.stopAutoRotation();
    
    console.log(`${COLORS.cyan}[ROTATOR]${COLORS.reset} Starting auto-rotation every ${intervalMs / 1000}s`);
    
    this.rotationTimer = setInterval(() => {
      if (this.autoRotate) {
        this.rotateNow();
      }
    }, intervalMs);
  }

  /**
   * Stop automatic rotation
   */
  stopAutoRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
      console.log(`${COLORS.yellow}[ROTATOR]${COLORS.reset} Stopped auto-rotation`);
    }
  }

  /**
   * Get overall statistics
   */
  getStats() {
    const uptimeMs = Date.now() - this.stats.uptime;
    const uptimeMin = Math.floor(uptimeMs / 60000);
    
    return {
      ...this.stats,
      uptimeMinutes: uptimeMin,
      activeProxies: this.proxies.filter(p => p.enabled).length,
      healthyProxies: this.proxies.filter(p => p.health >= 70).length,
      averageHealth: Math.round(
        this.proxies.reduce((sum, p) => sum + p.health, 0) / this.proxies.length
      ),
      successRate: this.stats.totalRequests > 0
        ? Math.round((this.stats.totalRequests - this.stats.totalFailures) / this.stats.totalRequests * 100)
        : 0,
    };
  }

  /**
   * Get status of all proxies (for dashboard)
   */
  getProxyStatus() {
    return this.proxies.map(p => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      status: p.status,
      health: p.health,
      requests: p.requests,
      successes: p.successes,
      failures: p.failures,
      lastUsed: p.lastUsed,
      lastSuccess: p.lastSuccess,
      lastError: p.lastError,
      country: p.country,
      verified: p.verified,
    }));
  }

  /**
   * Get current status summary
   */
  getSummary() {
    const current = this.getCurrent();
    const stats = this.getStats();
    
    return {
      current: current ? {
        id: current.id,
        name: current.name,
        health: current.health,
        country: current.country,
      } : null,
      stats,
      proxies: this.getProxyStatus(),
    };
  }

  /**
   * Recover low-health proxies
   */
  recoverProxies() {
    let recovered = 0;
    this.proxies.forEach(p => {
      if (p.health < 50 && p.status === 'error') {
        p.health = 50;
        p.status = 'idle';
        recovered++;
      }
    });
    
    if (recovered > 0) {
      console.log(`${COLORS.green}[ROTATOR]${COLORS.reset} Recovered ${recovered} proxies`);
    }
    
    return recovered;
  }

  /**
   * Reset all proxy statistics
   */
  resetStats() {
    this.proxies.forEach(p => {
      p.requests = 0;
      p.failures = 0;
      p.successes = 0;
      p.health = 100;
      p.lastError = null;
    });
    
    this.stats = {
      totalRotations: 0,
      totalRequests: 0,
      totalFailures: 0,
      uptime: Date.now(),
    };
    
    console.log(`${COLORS.cyan}[ROTATOR]${COLORS.reset} Statistics reset`);
  }
}
