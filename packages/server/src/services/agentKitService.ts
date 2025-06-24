import { CdpAgentkit } from '@coinbase/agentkit';
import { logger } from '../utils/logger';

export interface AgentKitConfig {
  cdpApiKeyName?: string;
  cdpPrivateKey?: string;
  networkId?: string;
}

export interface AgentAction {
  type: 'transfer' | 'deploy_contract' | 'mint_nft' | 'swap_tokens' | 'stake_tokens';
  parameters: Record<string, any>;
  description: string;
}

export interface AgentResponse {
  success: boolean;
  transactionHash?: string;
  contractAddress?: string;
  error?: string;
  data?: any;
}

export class AgentKitService {
  private agentkit: CdpAgentkit | null = null;
  private initialized = false;

  constructor(config?: AgentKitConfig) {
    this.initialize(config);
  }

  private async initialize(config?: AgentKitConfig): Promise<void> {
    try {
      if (!process.env.CDP_API_KEY_NAME || !process.env.CDP_PRIVATE_KEY) {
        logger.warn('CDP credentials not set, AgentKit will not work');
        return;
      }

      this.agentkit = CdpAgentkit.configureWithWallet({
        cdpApiKeyName: config?.cdpApiKeyName || process.env.CDP_API_KEY_NAME,
        cdpPrivateKey: config?.cdpPrivateKey || process.env.CDP_PRIVATE_KEY,
        networkId: config?.networkId || process.env.CDP_NETWORK_ID || 'base-mainnet',
      });

      this.initialized = true;
      logger.info('AgentKit initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AgentKit', { error });
      this.initialized = false;
    }
  }

  /**
   * Execute a natural language blockchain command
   */
  async executeNaturalLanguageCommand(command: string): Promise<AgentResponse> {
    if (!this.initialized || !this.agentkit) {
      return {
        success: false,
        error: 'AgentKit not initialized',
      };
    }

    try {
      logger.info('Executing natural language command', { command });

      const result = await this.agentkit.run(command);

      logger.info('Natural language command executed successfully', { 
        command,
        result 
      });

      return {
        success: true,
        data: result,
        transactionHash: result.transactionHash || result.hash,
        contractAddress: result.contractAddress,
      };
    } catch (error) {
      logger.error('Failed to execute natural language command', { error, command });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get wallet information
   */
  async getWalletInfo(): Promise<{
    address: string;
    balance: string;
    network: string;
  } | null> {
    if (!this.initialized || !this.agentkit) {
      return null;
    }

    try {
      const result = await this.agentkit.run('Get my wallet address and balance');
      
      return {
        address: result.address,
        balance: result.balance,
        network: result.network || 'base-mainnet',
      };
    } catch (error) {
      logger.error('Failed to get wallet info', { error });
      return null;
    }
  }
}

export const agentKitService = new AgentKitService();
