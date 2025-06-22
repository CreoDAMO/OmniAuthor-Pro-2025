import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { BlockchainTransaction } from '../models/BlockchainTransaction';
import { BLOCKCHAIN_CONFIG } from '@omniauthor/shared';
import { logger } from '../utils/logger';


export class BlockchainService {
  private polygonProvider: ethers.providers.JsonRpcProvider;
  private baseProvider: ethers.providers.JsonRpcProvider;
  private solanaConnection: Connection;
  private platformWallet: Keypair;


  constructor() {
    this.polygonProvider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    this.baseProvider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
    this.solanaConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Platform wallet for receiving fees (in production, use secure key management)
    this.platformWallet = Keypair.fromSecretKey(
      Buffer.from(process.env.SOLANA_PRIVATE_KEY || '', 'hex')
    );
  }


  async registerRights(params: {
    manuscriptId: string;
    userId: string;
    chain: string;
    title: string;
    collaborators: any[];
  }): Promise<BlockchainTransaction> {
    const { manuscriptId, userId, chain, title, collaborators } = params;


    try {
      let txHash: string;
      let amount = 0.1; // Registration fee


      if (chain === 'POLYGON' || chain === 'BASE') {
        txHash = await this.registerRightsEVM(manuscriptId, title, collaborators, chain);
      } else if (chain === 'SOLANA') {
        txHash = await this.registerRightsSolana(manuscriptId, title);
      } else {
        throw new Error(`Unsupported blockchain: ${chain}`);
      }


      const transaction = new BlockchainTransaction({
        userId,
        manuscriptId,
        txHash,
        chain,
        type: 'RIGHTS_REGISTRATION',
        amount,
        status: 'PENDING',
      });


      await transaction.save();


      logger.info(`Rights registration initiated: ${txHash} on ${chain}`);


      // Start monitoring transaction
      this.monitorTransaction(transaction.id, txHash, chain);


      return transaction;
    } catch (error) {
      logger.error('Rights registration failed:', error);
      throw new Error('Failed to register rights on blockchain');
    }
  }


  async processRoyaltyPayout(params: {
    manuscriptId: string;
    userId: string;
    amount: number;
    chain: string;
    recipientAddress: string;
    royaltyShare?: number;
  }): Promise<BlockchainTransaction> {
    const { manuscriptId, userId, amount, chain, recipientAddress, royaltyShare = 100 } = params;


    try {
      const platformFee = amount * (BLOCKCHAIN_CONFIG.PLATFORM_FEE / 100);
      const authorAmount = amount - platformFee;


      let txHash: string;


      if (chain === 'POLYGON' || chain === 'BASE') {
        txHash = await this.processPayoutEVM(recipientAddress, authorAmount, platformFee, chain);
      } else if (chain === 'SOLANA') {
        txHash = await this.processPayoutSolana(recipientAddress, authorAmount, platformFee);
      } else {
        throw new Error(`Unsupported blockchain: ${chain}`);
      }


      const transaction = new BlockchainTransaction({
        userId,
        manuscriptId,
        txHash,
        chain,
        type: 'ROYALTY_PAYOUT',
        amount: authorAmount,
        status: 'PENDING',
        metadata: {
          platformFee,
          royaltyShare,
          recipientAddress,
        },
      });


      await transaction.save();


      logger.info(`Royalty payout initiated: ${txHash} on ${chain}`);


      // Start monitoring transaction
      this.monitorTransaction(transaction.id, txHash, chain);


      return transaction;
    } catch (error) {
      logger.error('Royalty payout failed:', error);
      throw new Error('Failed to process royalty payout');
    }
  }


  private async registerRightsEVM(
    manuscriptId: string,
    title: string,
    collaborators: any[],
    chain: string
  ): Promise<string> {
    const provider = chain === 'POLYGON' ? this.polygonProvider : this.baseProvider;
    const contractAddress = chain === 'POLYGON' 
      ? process.env.POLYGON_RIGHTS_CONTRACT 
      : process.env.BASE_RIGHTS_CONTRACT;


    if (!contractAddress) throw new Error('Contract address not configured');


    const signer = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
    
    const contract = new ethers.Contract(
      contractAddress,
      [
        'function registerRights(string memory manuscriptId, string memory title, address[] memory collaborators, uint256[] memory shares) external payable returns (uint256)',
      ],
      signer
    );


    const collaboratorAddresses = collaborators.map(c => c.walletAddress || BLOCKCHAIN_CONFIG.POLYGON_WALLET);
    const shares = collaborators.map(c => c.royaltyShare * 100); // Convert to basis points


    const tx = await contract.registerRights(
      manuscriptId,
      title,
      collaboratorAddresses,
      shares,
      {
        value: ethers.utils.parseEther('0.01'), // Registration fee
        gasLimit: 500000,
      }
    );


    return tx.hash;
  }


  private async registerRightsSolana(manuscriptId: string, title: string): Promise<string> {
    const programId = new PublicKey(process.env.SOLANA_RIGHTS_PROGRAM!);
    const platformPubkey = new PublicKey(BLOCKCHAIN_CONFIG.SOLANA_WALLET);


    const instruction = SystemProgram.transfer({
      fromPubkey: this.platformWallet.publicKey,
      toPubkey: platformPubkey,
      lamports: 100_000_000, // 0.1 SOL registration fee
    });


    const transaction = new Transaction().add(instruction);
    transaction.feePayer = this.platformWallet.publicKey;


    const { blockhash } = await this.solanaConnection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;


    const signature = await this.solanaConnection.sendTransaction(
      transaction,
      [this.platformWallet]
    );


    return signature;
  }


  private async processPayoutEVM(
    recipientAddress: string,
    authorAmount: number,
    platformFee: number,
    chain: string
  ): Promise<string> {
    const provider = chain === 'POLYGON' ? this.polygonProvider : this.baseProvider;
    const signer = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);


    // Split payment: send author amount to recipient, platform fee to platform wallet
    const authorTx = await signer.sendTransaction({
      to: recipientAddress,
      value: ethers.utils.parseEther(authorAmount.toString()),
      gasLimit: 21000,
    });


    const platformTx = await signer.sendTransaction({
      to: BLOCKCHAIN_CONFIG.POLYGON_WALLET,
      value: ethers.utils.parseEther(platformFee.toString()),
      gasLimit: 21000,
    });


    return authorTx.hash; // Return the main transaction hash
  }


  private async processPayoutSolana(
    recipientAddress: string,
    authorAmount: number,
    platformFee: number
  ): Promise<string> {
    const recipientPubkey = new PublicKey(recipientAddress);
    const platformPubkey = new PublicKey(BLOCKCHAIN_CONFIG.SOLANA_WALLET);


    const authorInstruction = SystemProgram.transfer({
      fromPubkey: this.platformWallet.publicKey,
      toPubkey: recipientPubkey,
      lamports: authorAmount * 1_000_000_000, // Convert to lamports
    });


    const platformInstruction = SystemProgram.transfer({
      fromPubkey: this.platformWallet.publicKey,
      toPubkey: platformPubkey,
      lamports: platformFee * 1_000_000_000,
    });


    const transaction = new Transaction()
      .add(authorInstruction)
      .add(platformInstruction);


    transaction.feePayer = this.platformWallet.publicKey;


    const { blockhash } = await this.solanaConnection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;


    const signature = await this.solanaConnection.sendTransaction(
      transaction,
      [this.platformWallet]
    );


    return signature;
  }


  private async monitorTransaction(transactionId: string, txHash: string, chain: string) {
    let attempts = 0;
    const maxAttempts = 30; // Monitor for 5 minutes


    const checkStatus = async () => {
      try {
        let confirmed = false;


        if (chain === 'POLYGON' || chain === 'BASE') {
          const provider = chain === 'POLYGON' ? this.polygonProvider : this.baseProvider;
          const receipt = await provider.getTransactionReceipt(txHash);
          confirmed = receipt && receipt.confirmations > 0;
        } else if (chain === 'SOLANA') {
          const status = await this.solanaConnection.getSignatureStatus(txHash);
          confirmed = status.value?.confirmationStatus === 'confirmed';
        }


        if (confirmed) {
          await BlockchainTransaction.findByIdAndUpdate(transactionId, {
            status: 'CONFIRMED',
          });
          logger.info(`Transaction confirmed: ${txHash}`);
          return;
        }


        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Check every 10 seconds
        } else {
          await BlockchainTransaction.findByIdAndUpdate(transactionId, {
            status: 'FAILED',
          });
          logger.warn(`Transaction timeout: ${txHash}`);
        }
      } catch (error) {
        logger.error(`Transaction monitoring error: ${error}`);
        await BlockchainTransaction.findByIdAndUpdate(transactionId, {
          status: 'FAILED',
        });
      }
    };


    // Start monitoring after 30 seconds
    setTimeout(checkStatus, 30000);
  }
}


export const blockchainService = new BlockchainService();
