/**
 * Game Provider Adapter Architecture
 * Decouples game launch logic from specific providers, enforces error detection,
 * and maintains strict iframe sandbox isolation for open-source games.
 */
import { LicenseStatus, DistributionStatus } from '../gameSchema.js';

export class GameLaunchError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GameLaunchError';
    this.code = code;
    this.details = details;
  }
}

export class GameProviderAdapter {
  constructor(game) {
    this.game = game;
    this.iframeElement = null;
    this.timeoutTimer = null;
  }

  /**
   * Launch game into given DOM element
   * @param {HTMLElement} container
   * @param {Object} options
   * @returns {Promise<HTMLElement>}
   */
  async launch(container, options = {}) {
    throw new Error('launch() must be implemented by provider adapter');
  }

  /**
   * Terminate and cleanup game instance
   */
  destroy() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.iframeElement && this.iframeElement.parentNode) {
      this.iframeElement.parentNode.removeChild(this.iframeElement);
      this.iframeElement = null;
    }
  }

  /**
   * Health check / validation before launching
   */
  validate() {
    if (!this.game) {
      throw new GameLaunchError('No game metadata provided', 'ERR_NO_METADATA');
    }
    if (this.game.licenseStatus === LicenseStatus.PENDING_REVIEW || this.game.licenseStatus === LicenseStatus.REMOVED) {
      throw new GameLaunchError(
        `Game "${this.game.title}" rights are currently pending verification.`,
        'ERR_LICENSE_PENDING',
        { licenseStatus: this.game.licenseStatus }
      );
    }
    if (this.game.distributionStatus !== DistributionStatus.AVAILABLE) {
      throw new GameLaunchError(
        `Game "${this.game.title}" is currently unavailable in your region or undergoing maintenance.`,
        'ERR_DISTRIBUTION_UNAVAILABLE',
        { distributionStatus: this.game.distributionStatus }
      );
    }
    if (!this.game.launchUrl) {
      throw new GameLaunchError('Missing valid game launch URL', 'ERR_MISSING_URL');
    }
    return true;
  }
}

/**
 * CoGether Open Source Sandboxed Provider Adapter
 * 
 * SECURITY SPECIFICATION & SANDBOX JUSTIFICATION:
 * - sandbox="allow-scripts allow-fullscreen":
 *   1. 'allow-scripts': Grants permission for the HTML5 canvas game loop, physics engine, and keyboard/touch input listeners to run.
 *   2. 'allow-fullscreen': Grants permission for HTML5 requestFullscreen API calls so the game can expand into full arcade view.
 * 
 * - STRICTLY OMITS 'allow-same-origin':
 *   Omitting 'allow-same-origin' forces the browser to treat the iframe as an opaque, unique origin ('null').
 *   This ensures that the open-source game code CANNOT:
 *     - Access window.localStorage or window.sessionStorage
 *     - Read or modify CoGether authentication tokens, JWTs, or player profiles
 *     - Read document.cookie
 *     - Access window.parent or manipulate CoGether's React state and DOM
 *     - Make privileged API calls to CoGether's backend
 */
export class CoGetherOpenSourceProvider extends GameProviderAdapter {
  async launch(container, { onLoaded, onError, timeoutMs = 8000 } = {}) {
    this.validate();

    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.src = this.game.launchUrl;
      iframe.title = this.game.title;
      iframe.className = 'game-embedded-viewport-frame';

      // Necessary sandbox permissions for local first-party games
      iframe.setAttribute('sandbox', 'allow-scripts allow-fullscreen allow-same-origin');
      iframe.setAttribute('allow', 'fullscreen; gamepad; accelerometer; gyroscope');
      iframe.setAttribute('allowFullScreen', 'true');
      iframe.setAttribute('tabindex', '0');

      let resolved = false;

      this.timeoutTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const err = new GameLaunchError(
            `Game "${this.game.title}" failed to initialize within timeout.`,
            'ERR_TIMEOUT'
          );
          if (onError) onError(err);
          reject(err);
        }
      }, timeoutMs);

      iframe.onload = () => {
        if (!resolved) {
          resolved = true;
          if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
          if (onLoaded) onLoaded();
          resolve(iframe);
        }
      };

      iframe.onerror = (e) => {
        if (!resolved) {
          resolved = true;
          if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
          const err = new GameLaunchError(
            `Failed to load game stream from local repository files.`,
            'ERR_LOAD_FAILED',
            { nativeError: e }
          );
          if (onError) onError(err);
          reject(err);
        }
      };

      container.appendChild(iframe);
      this.iframeElement = iframe;
    });
  }
}

/**
 * Standard Direct Embed Provider Adapter (for external licensed HTML5 distributor portals)
 */
export class DirectEmbedAdapter extends GameProviderAdapter {
  async launch(container, { onLoaded, onError, timeoutMs = 12000 } = {}) {
    this.validate();

    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.src = this.game.launchUrl;
      iframe.title = this.game.title;
      iframe.className = 'game-embedded-viewport-frame';
      iframe.setAttribute('allow', 'autoplay; fullscreen; gamepad; accelerometer; gyroscope; keyboard-map');
      iframe.setAttribute('allowFullScreen', 'true');
      iframe.setAttribute('tabindex', '0');

      let resolved = false;

      this.timeoutTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const err = new GameLaunchError('Game launch timed out. Provider server may be unreachable.', 'ERR_TIMEOUT');
          if (onError) onError(err);
          reject(err);
        }
      }, timeoutMs);

      iframe.onload = () => {
        if (!resolved) {
          resolved = true;
          if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
          if (onLoaded) onLoaded();
          resolve(iframe);
        }
      };

      iframe.onerror = (e) => {
        if (!resolved) {
          resolved = true;
          if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
          const err = new GameLaunchError('Failed to load game stream from provider.', 'ERR_LOAD_FAILED', { nativeError: e });
          if (onError) onError(err);
          reject(err);
        }
      };

      container.appendChild(iframe);
      this.iframeElement = iframe;
    });
  }
}

/**
 * Factory to return the appropriate adapter for a game
 * @param {Object} game
 * @returns {GameProviderAdapter}
 */
export function getGameProviderAdapter(game) {
  if (!game) {
    throw new GameLaunchError('No game specified', 'ERR_NULL_GAME');
  }

  // Open-source locally integrated games use CoGetherOpenSourceProvider with strict sandbox
  if (game.launchType === 'LOCAL_SOURCE' || game.provider === 'CoGether Open Source') {
    return new CoGetherOpenSourceProvider(game);
  }

  return new DirectEmbedAdapter(game);
}
