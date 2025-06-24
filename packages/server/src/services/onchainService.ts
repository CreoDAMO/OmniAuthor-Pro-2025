import { 
  getOnchainKitConfig,
  buildSwapTransaction,
  buildMintTransaction 
} from '@coinbase/onchainkit/core';
import { base, mainnet } from 'viem/chains';
import { createPublicClient, http, Address } from 'viem';
import { logger } from '../utils/logger';

// Initialize clients for different chains
const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'),
});

export interface SwapParams {
  fromAddress: Address;
  toAddress: Address;
  fromToken: Address;
  toToken: Address;
  amount: string;
  slippage?: number;
}

export interface MintParams {
  contractAddress: Address;
  toAddress: Address;
  tokenId?: string;
  amount?: string;
}

export interface OnchainTransactionResult {
  transactionHash?: string;
  success: boolean;
  error?: string;
  gasEstimate?: string;
}

export class OnchainService {
  private config: any;

  constructor() {
    this.config = getOnchainKitConfig({
      apiKey: process.env.COINBASE_API_KEY,
      chain: base,
    });
  }

  /**
   * Build a swap transaction using OnchainKit
   */
  async buildSwap(params: SwapParams): Promise<OnchainTransactionResult> {
    try {
      logger.info('Building swap transaction', { params });

      const swapTransaction = await buildSwapTransaction({
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
        slippage: params.slippage || 0.5, // 0.5% default slippage
      });

      logger.info('Swap transaction built successfully', { 
        transactionHash: swapTransaction.transaction?.hash 
      });

      return {
        success: true,
        transactionHash: swapTransaction.transaction?.hash,
        gasEstimate: swapTransaction.transaction?.gas?.toString(),
      };
    } catch (error) {
      logger.error('Failed to build swap transaction', { error, params });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build a mint transaction for NFTs
   */
  async buildMint(params: MintParams): Promise<OnchainTransactionResult> {
    try {
      logger.info('Building mint transaction', { params });

      const mintTransaction = await buildMintTransaction({
        contractAddress: params.contractAddress,
        toAddress: params.toAddress,
        tokenId: params.tokenId,
        amount: params.amount || '1',
      });

      logger.info('Mint transaction built successfully', { 
        transactionHash: mintTransaction.transaction?.hash 
      });

      return {
        success: true,
        transactionHash: mintTransaction.transaction?.hash,
        gasEstimate: mintTransaction.transaction?.gas?.toString(),
      };
    } catch (error) {
      logger.error('Failed to build mint transaction', { error, params });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress: Address, walletAddress: Address, chainId: number = base.id): Promise<string> {
    try {
      const client = chainId === base.id ? baseClient : mainnetClient;
      
      // ERC-20 balanceOf function signature
      const balance = await client.readContract({
        address: tokenAddress,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      return balance.toString();
    } catch (error) {
      logger.error('Failed to get token balance', { error, tokenAddress, walletAddress });
      throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionHash: string, chainId: number = base.id): Promise<{
    status: 'pending' | 'success' | 'failed';
    blockNumber?: number;
    gasUsed?: string;
  }> {
    try {
      const client = chainId === base.id ? baseClient : mainnetClient;
      
      const receipt = await client.getTransactionReceipt({
        hash: transactionHash as `0x${string}`,
      });

      return {
        status: receipt.status === 'success' ? 'success' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error('Failed to get transaction status', { error, transactionHash });
      return { status: 'pending' };
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: any, chainId: number = base.id): Promise<string> {
    try {
      const client = chainId === base.id ? baseClient : mainnetClient;
      
      const gasEstimate = await client.estimateGas(transaction);
      return gasEstimate.toString();
    } catch (error) {
      logger.error('Failed to estimate gas', { error, transaction });
      throw new Error(`Failed to estimate gas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const onchainService = new OnchainService();
