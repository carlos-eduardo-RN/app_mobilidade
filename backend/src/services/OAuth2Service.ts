/**
 * OAuth2 Service
 * 
 * Handles OAuth2 authentication with Google, Facebook, and Apple
 */

import { Logger } from '../utils/Logger';
import {
  OAuthProvider,
  OAuthProfile,
  OAuthLoginInput,
  OAuthConfig,
  OAuthProviderConfig,
  SecurityEventType,
  SecurityEvent,
} from '../models/Security';

/**
 * OAuth2 Service Configuration
 */
interface OAuth2ServiceConfig {
  oauth: OAuthConfig;
}

/**
 * OAuth2 Token Response
 */
interface OAuth2TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * OAuth2 Service Class
 */
export class OAuth2Service {
  private logger: Logger;
  private config: OAuth2ServiceConfig;
  
  // Mock storage for linked accounts
  private linkedAccounts: Map<string, OAuthProfile> = new Map(); // userId -> OAuthProfile
  private securityEvents: SecurityEvent[] = [];

  constructor(config: OAuth2ServiceConfig) {
    this.logger = new Logger('OAuth2Service');
    this.config = config;
  }

  /**
   * Get Authorization URL
   */
  getAuthorizationUrl(
    provider: OAuthProvider,
    state?: string,
    redirectUri?: string
  ): string {
    this.logger.info(`Getting authorization URL for provider: ${provider}`);

    const providerConfig = this.getProviderConfig(provider);
    const baseUrl = this.getProviderAuthUrl(provider);
    
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri || providerConfig.redirectUri,
      response_type: 'code',
      scope: providerConfig.scopes.join(' '),
      state: state || this.generateState(),
    });

    // Provider-specific parameters
    if (provider === OAuthProvider.GOOGLE) {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    } else if (provider === OAuthProvider.APPLE) {
      params.append('response_mode', 'form_post');
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange Authorization Code for Tokens
   */
  async exchangeCode(input: OAuthLoginInput): Promise<OAuth2TokenResponse> {
    this.logger.info(`Exchanging code for tokens with provider: ${input.provider}`);

    const providerConfig = this.getProviderConfig(input.provider);
    const tokenUrl = this.getProviderTokenUrl(input.provider);

    // In production, make actual HTTP request to provider
    // For now, return mock response
    const mockResponse: OAuth2TokenResponse = {
      access_token: `mock_access_token_${input.provider}_${Date.now()}`,
      refresh_token: `mock_refresh_token_${input.provider}_${Date.now()}`,
      expires_in: 3600,
      token_type: 'Bearer',
      scope: providerConfig.scopes.join(' '),
    };

    this.logger.info('Successfully exchanged code for tokens');
    return mockResponse;
  }

  /**
   * Get User Profile from Provider
   */
  async getUserProfile(
    provider: OAuthProvider,
    accessToken: string
  ): Promise<OAuthProfile> {
    this.logger.info(`Fetching user profile from provider: ${provider}`);

    // In production, make actual HTTP request to provider's user info endpoint
    // For now, return mock profile
    const mockProfile: OAuthProfile = {
      provider,
      providerId: `${provider.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `user_${Date.now()}@${provider.toLowerCase()}.com`,
      name: `${provider} User`,
      picture: `https://i.pravatar.cc/150?u=${Date.now()}`,
      accessToken,
      refreshToken: `refresh_${accessToken}`,
    };

    this.logger.info(`Successfully fetched profile: ${mockProfile.email}`);
    return mockProfile;
  }

  /**
   * Login with OAuth Provider
   */
  async loginWithProvider(input: OAuthLoginInput): Promise<OAuthProfile> {
    this.logger.info(`OAuth login with provider: ${input.provider}`);

    try {
      // 1. Exchange authorization code for tokens
      const tokens = await this.exchangeCode(input);

      // 2. Get user profile
      const profile = await this.getUserProfile(input.provider, tokens.access_token);

      // 3. Store or update linked account (in production, save to DB)
      this.linkedAccounts.set(`${profile.provider}:${profile.providerId}`, profile);

      // 4. Log security event
      await this.logSecurityEvent({
        userId: profile.providerId, // Would be actual userId after mapping
        type: SecurityEventType.OAUTH_LOGIN,
        description: `User logged in via ${input.provider}`,
        metadata: {
          provider: input.provider,
        },
      });

      return profile;
    } catch (error) {
      this.logger.error(`OAuth login failed for provider ${input.provider}:`, error);
      throw new Error(`OAuth login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Link OAuth Account to Existing User
   */
  async linkAccount(userId: string, profile: OAuthProfile): Promise<void> {
    this.logger.info(`Linking ${profile.provider} account to user: ${userId}`);

    // Check if account is already linked
    const existingLink = this.linkedAccounts.get(`${profile.provider}:${profile.providerId}`);
    if (existingLink) {
      throw new Error('This OAuth account is already linked to another user');
    }

    // Store linked account
    this.linkedAccounts.set(`${profile.provider}:${profile.providerId}`, {
      ...profile,
      // In production, would store userId mapping
    });

    this.logger.info('Account linked successfully');
  }

  /**
   * Unlink OAuth Account
   */
  async unlinkAccount(userId: string, provider: OAuthProvider): Promise<void> {
    this.logger.info(`Unlinking ${provider} account from user: ${userId}`);

    // Find and remove linked account
    const entries = Array.from(this.linkedAccounts.entries());
    const entry = entries.find(([key, profile]) => 
      profile.provider === provider
      // In production, would check: profile.userId === userId
    );

    if (!entry) {
      throw new Error('Linked account not found');
    }

    this.linkedAccounts.delete(entry[0]);
    this.logger.info('Account unlinked successfully');
  }

  /**
   * Get Linked Accounts for User
   */
  async getLinkedAccounts(userId: string): Promise<OAuthProfile[]> {
    this.logger.debug(`Fetching linked accounts for user: ${userId}`);

    // In production, filter by userId
    return Array.from(this.linkedAccounts.values());
  }

  /**
   * Refresh OAuth Token
   */
  async refreshToken(
    provider: OAuthProvider,
    refreshToken: string
  ): Promise<OAuth2TokenResponse> {
    this.logger.info(`Refreshing OAuth token for provider: ${provider}`);

    const providerConfig = this.getProviderConfig(provider);
    const tokenUrl = this.getProviderTokenUrl(provider);

    // In production, make actual HTTP request
    const mockResponse: OAuth2TokenResponse = {
      access_token: `refreshed_access_token_${provider}_${Date.now()}`,
      expires_in: 3600,
      token_type: 'Bearer',
    };

    this.logger.info('Successfully refreshed OAuth token');
    return mockResponse;
  }

  /**
   * Revoke OAuth Token
   */
  async revokeToken(provider: OAuthProvider, token: string): Promise<void> {
    this.logger.info(`Revoking OAuth token for provider: ${provider}`);

    const revokeUrl = this.getProviderRevokeUrl(provider);

    // In production, make actual HTTP request to revoke endpoint
    this.logger.info('OAuth token revoked successfully');
  }

  /**
   * Validate OAuth State (CSRF Protection)
   */
  validateState(providedState: string, expectedState: string): boolean {
    return providedState === expectedState;
  }

  /**
   * Get Provider Configuration
   */
  private getProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
    const config = this.config.oauth[provider.toLowerCase() as keyof OAuthConfig];
    
    if (!config) {
      throw new Error(`OAuth provider ${provider} is not configured`);
    }

    return config;
  }

  /**
   * Get Provider Authorization URL
   */
  private getProviderAuthUrl(provider: OAuthProvider): string {
    const urls: Record<OAuthProvider, string> = {
      [OAuthProvider.GOOGLE]: 'https://accounts.google.com/o/oauth2/v2/auth',
      [OAuthProvider.FACEBOOK]: 'https://www.facebook.com/v12.0/dialog/oauth',
      [OAuthProvider.APPLE]: 'https://appleid.apple.com/auth/authorize',
    };

    return urls[provider];
  }

  /**
   * Get Provider Token URL
   */
  private getProviderTokenUrl(provider: OAuthProvider): string {
    const urls: Record<OAuthProvider, string> = {
      [OAuthProvider.GOOGLE]: 'https://oauth2.googleapis.com/token',
      [OAuthProvider.FACEBOOK]: 'https://graph.facebook.com/v12.0/oauth/access_token',
      [OAuthProvider.APPLE]: 'https://appleid.apple.com/auth/token',
    };

    return urls[provider];
  }

  /**
   * Get Provider Revoke URL
   */
  private getProviderRevokeUrl(provider: OAuthProvider): string {
    const urls: Record<OAuthProvider, string> = {
      [OAuthProvider.GOOGLE]: 'https://oauth2.googleapis.com/revoke',
      [OAuthProvider.FACEBOOK]: 'https://graph.facebook.com/v12.0/me/permissions',
      [OAuthProvider.APPLE]: 'https://appleid.apple.com/auth/revoke',
    };

    return urls[provider];
  }

  /**
   * Get Provider User Info URL
   */
  private getProviderUserInfoUrl(provider: OAuthProvider): string {
    const urls: Record<OAuthProvider, string> = {
      [OAuthProvider.GOOGLE]: 'https://www.googleapis.com/oauth2/v2/userinfo',
      [OAuthProvider.FACEBOOK]: 'https://graph.facebook.com/v12.0/me',
      [OAuthProvider.APPLE]: 'https://appleid.apple.com/auth/userinfo',
    };

    return urls[provider];
  }

  /**
   * Generate State for CSRF Protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Log Security Event
   */
  private async logSecurityEvent(
    event: Omit<SecurityEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      timestamp: new Date(),
    };

    this.securityEvents.push(securityEvent);
    this.logger.info(`Security event logged: ${event.type}`);
  }

  /**
   * Get Security Events
   */
  async getSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    return this.securityEvents
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
