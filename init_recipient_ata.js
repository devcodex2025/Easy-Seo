import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'devnet';
const RPC_URL = process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
const USDC_MINT_DEVNET = new PublicKey(process.env.USDC_MINT_DEVNET || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Recipient Wallet
const DEFAULT_WALLET = 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX';
const recipientWalletAddress = process.env.SOLANA_RECIPIENT_WALLET || DEFAULT_WALLET;

async function initializeATA() {
    const connection = new Connection(RPC_URL, 'confirmed');

    try {
        const recipientWallet = new PublicKey(recipientWalletAddress);

        console.log(`Recipient Wallet: ${recipientWalletAddress}`);
        console.log(`Cluster: ${SOLANA_CLUSTER}`);
        console.log(`USDC Mint: ${USDC_MINT_DEVNET.toString()}`);

        const ata = await getAssociatedTokenAddress(USDC_MINT_DEVNET, recipientWallet);
        console.log(`Expected ATA Address: ${ata.toString()}`);

        const accountInfo = await connection.getAccountInfo(ata);

        if (accountInfo) {
            console.log('✅ ATA already exists!');
            console.log('Owner:', accountInfo.owner.toString());
            return;
        }

        console.log('❌ ATA does NOT exist. Creating it now...');
        console.log('\n⚠️  IMPORTANT:');
        console.log('To create the ATA, you need to send a transaction FROM a wallet that has SOL.');
        console.log('The easiest way is to:');
        console.log('1. Open Phantom wallet');
        console.log('2. Switch to Devnet');
        console.log('3. Send ANY amount of USDC to this address:', recipientWalletAddress);
        console.log('   (This will automatically create the ATA)');
        console.log('\nAlternatively, if you have the private key for a funded wallet, you can uncomment');
        console.log('the code below and paste your private key as a JSON array.');

        // Uncomment and use this if you have a funded wallet's private key
        /*
        const payerSecretKey = []; // Paste your secret key array here
        const payer = Keypair.fromSecretKey(new Uint8Array(payerSecretKey));
        
        const instruction = createAssociatedTokenAccountInstruction(
            payer.publicKey,
            ata,
            recipientWallet,
            USDC_MINT_DEVNET,
            TOKEN_PROGRAM_ID
        );

        const transaction = new Transaction().add(instruction);
        const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
        
        console.log('✅ ATA created successfully!');
        console.log('Transaction signature:', signature);
        console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`);
        */

    } catch (error) {
        console.error('Error:', error);
    }
}

initializeATA();
