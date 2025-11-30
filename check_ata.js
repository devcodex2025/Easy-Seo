import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'devnet';
const RPC_URL = process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
const USDC_MINT_DEVNET = new PublicKey(process.env.USDC_MINT_DEVNET || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Recipient Wallet
const DEFAULT_WALLET = 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX';
const walletAddress = process.env.SOLANA_RECIPIENT_WALLET || DEFAULT_WALLET;

async function checkATA() {
    const connection = new Connection(RPC_URL, 'confirmed');

    try {
        const wallet = new PublicKey(walletAddress);

        console.log(`Checking ATA for wallet: ${walletAddress}`);
        console.log(`Cluster: ${SOLANA_CLUSTER}`);
        console.log(`USDC Mint: ${USDC_MINT_DEVNET.toString()}`);

        const ata = await getAssociatedTokenAddress(USDC_MINT_DEVNET, wallet);
        console.log(`Expected ATA Address: ${ata.toString()}`);

        const accountInfo = await connection.getAccountInfo(ata);

        if (accountInfo) {
            console.log('✅ ATA exists!');
            console.log('Owner:', accountInfo.owner.toString());
            console.log('Data Length:', accountInfo.data.length);
        } else {
            console.log('❌ ATA does NOT exist.');
            console.log('This is likely the cause of "InvalidAccountData".');
            console.log('Solution: The recipient wallet must have a USDC token account initialized.');
            console.log('You can initialize it by sending a small amount of USDC to this address on Devnet.');
        }

    } catch (error) {
        console.error('Error checking ATA:', error);
    }
}

checkATA();
