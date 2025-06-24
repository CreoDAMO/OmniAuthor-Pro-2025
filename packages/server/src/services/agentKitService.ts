import { CdpAgentkit } from '@coinbase/agentkit-core';
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
   * Execute an AI-powered blockchain action
   */
  async executeAction(action: AgentAction): Promise<AgentResponse> {
    if (!this.initialized || !this.agentkit) {
      return {
        success: false,
        error: 'AgentKit not initialized',
      };
    }

    try {
      logger.info('Executing AgentKit action', { action });

      let result: any;

      switch (action.type) {
        case 'transfer':
          result = await this.executeTransfer(action.parameters);
          break;
        case 'deploy_contract':
          result = await this.deployContract(action.parameters);
          break;
        case 'mint_nft':
          result = await this.mintNFT(action.parameters);
          break;
        case 'swap_tokens':
          result = await this.swapTokens(action.parameters);
          break;
        case 'stake_tokens':
          result = await this.stakeTokens(action.parameters);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      logger.info('AgentKit action executed successfully', { 
        actionType: action.type,
        result 
      });

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      logger.error('Failed to execute AgentKit action', { error, action });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a token transfer
   */
  private async executeTransfer(params: {
    to: string;
    amount: string;
    asset?: string;
  }): Promise<{ transactionHash: string }> {
    if (!this.agentkit) throw new Error('AgentKit not initialized');

    const result = await this.agentkit.run(
      `Transfer ${params.amount} ${params.asset || 'ETH'} to ${params.to}`
    );

    return {
      transactionHash: result.transactionHash || result.hash,
    };
  }

  /**
   * Deploy a smart contract
   */
  private async deployContract(params: {
    contractType: string;
    name?: string;
    symbol?: string;
    initialSupply?: string;
  }): Promise<{ contractAddress: string; transactionHash: string }> {
    if (!this.agentkit) throw new Error('AgentKit not initialized');

    let prompt = `Deploy a ${params.contractType} contract`;
    
    if (params.name) prompt += ` with name "${params.name}"`;
    if (params.symbol) prompt += ` and symbol "${params.symbol}"`;
    if (params.initialSupply) prompt += ` with initial supply of ${params.initialSupply}`;

    const result = await this.agentkit.run(prompt);

    return {
      contractAddress: result.contractAddress,
      transactionHash: result.transactionHash || result.hash,
    };
  }

  /**
   * Mint an NFT
   */
  private async mintNFT(params: {
    contractAddress: string;
    to: string;
    tokenId?: string;
    metadata?: string;
  }): Promise<{ transactionHash: string }> {
    if (!this.agentkit) throw new Error('AgentKit not initialized');

    let prompt = `Mint NFT from contract ${params.contractAddress} to ${params.to}`;
    
    if (params.tokenId) prompt += ` with token ID ${params.tokenId}`;
    if (params.metadata) prompt += ` and metadata ${params.metadata}`;

    const result = await this.agentkit.run(prompt);

    return {
      transactionHash: result.transactionHash || result.hash,
    };
  }

  /**
   * Swap tokens
   */
  private async swapTokens(params: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippage?: number;
  }): Promise<{ transactionHash: string }> {
    if (!this.agentkit) throw new Error('AgentKit not initialized');

    const slippage = params.slippage || 0.5;
    const prompt = `Swap ${params.amount} ${params.fromToken} for ${params.toToken} with ${slippage}% slippage`;

    const result = await this.agentkit.run(prompt);

    return {
      transactionHash: result.transactionHash || result.hash,
    };
  }

  /**
   * Stake tokens
   */
  private async stakeTokens(params: {
    token: string;
    amount: string;
    validator?: string;
  }): Promise<{ transactionHash: string }> {
    if (!this.agentkit) throw new Error('AgentKit not initialized');

    let prompt = `Stake ${params.amount} ${params.token}`;
    
    if (params.validator) prompt += ` with validator ${params.validator}`;

    const result = await this.agentkit.run(prompt);

    return {
      transactionHash: result.transactionHash || result.hash,
    };
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
}

export const agentKitService = new AgentKitService();
