import supabase from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

// In-memory cache for duplicate transaction prevention
const processingTransactions = new Set();

// Environment configuration
const USDC_MINT_DEVNET = new PublicKey(process.env.USDC_MINT_DEVNET || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const USDC_MINT_MAINNET = new PublicKey(process.env.USDC_MINT_MAINNET || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'devnet';
const RECIPIENT_WALLET = new PublicKey(process.env.SOLANA_RECIPIENT_WALLET || 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX');

const MIN_PAYMENT_USDC = parseFloat(process.env.MIN_PAYMENT_USDC) || 0.01;
const MAX_PAYMENT_USDC = parseFloat(process.env.MAX_PAYMENT_USDC) || 1000;

// Solana connection
const RPC_URL = SOLANA_CLUSTER === 'mainnet'
    ? (process.env.SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com')
    : (process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com');

const connection = new Connection(RPC_URL, 'confirmed');

// Get USDC mint based on cluster
function getUSDCMint() {
    return SOLANA_CLUSTER === 'mainnet' ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;
}

// Get plan pricing
function getPlanPrice(plan) {
    const prices = {
        lite: parseFloat(process.env.PRICE_LITE || '0.49'),
        pro: parseFloat(process.env.PRICE_PRO || '1.49'),
        unlimited: parseFloat(process.env.PRICE_UNLIMITED_MONTHLY || '4.90')
    };
    return prices[plan] || 0;
}

// Get plan credits
function getPlanCredits(plan) {
    const credits = {
        lite: parseInt(process.env.CREDITS_LITE || '20'),
        pro: parseInt(process.env.CREDITS_PRO || '100'),
        unlimited: 999999
    };
    return credits[plan] || 0;
}

/**
 * Create payment quote (x402 response)
 * Returns payment requirements for client
 */
export async function createPaymentQuote(userId, plan) {
    try {
        const priceUsd = getPlanPrice(plan);
        const creditsToAdd = getPlanCredits(plan);

        // Validate amount
        if (priceUsd < MIN_PAYMENT_USDC || priceUsd > MAX_PAYMENT_USDC) {
            throw new Error(`Payment amount must be between $${MIN_PAYMENT_USDC} and $${MAX_PAYMENT_USDC}`);
        }

        // Convert USD to USDC (1:1 for simplicity, in production use oracle)
        const amountUSDC = priceUsd;
        const amountSmallestUnits = Math.floor(amountUSDC * 1_000_000); // USDC has 6 decimals

        // Get recipient's USDC token account
        const usdcMint = getUSDCMint();
        const recipientTokenAccount = await getAssociatedTokenAddress(
            usdcMint,
            RECIPIENT_WALLET
        );

        // Create transaction record
        const transactionId = uuidv4();
        const now = Date.now();

        const { error } = await supabase
            .from('transactions')
            .insert({
                id: transactionId,
                user_id: userId,
                amount_usd: priceUsd,
                amount_x402: amountUSDC,
                plan: plan,
                credits_added: creditsToAdd,
                payment_status: 'pending',
                created_at: now
            });

        if (error) throw error;

        // Return x402 payment requirements
        return {
            transactionId,
            recipientWallet: RECIPIENT_WALLET.toBase58(),
            tokenAccount: recipientTokenAccount.toBase58(),
            mint: usdcMint.toBase58(),
            amount: amountSmallestUnits,
            amountUSDC: amountUSDC,
            cluster: SOLANA_CLUSTER,
            network: SOLANA_CLUSTER === 'mainnet' ? 'solana-mainnet' : 'solana-devnet'
        };
    } catch (error) {
        console.error('Error creating payment quote:', error);
        throw error;
    }
}

/**
 * Verify and process x402 payment
 * Validates transaction, submits to blockchain, confirms, and adds credits
 */
export async function verifyAndProcessPayment(xPaymentHeader, transactionId, userId) {
    let signature = null;

    try {
        // 1. Decode X-Payment header
        const paymentData = JSON.parse(
            Buffer.from(xPaymentHeader, 'base64').toString('utf-8')
        );

        if (paymentData.x402Version !== 1) {
            throw new Error('Unsupported x402 version');
        }

        // 2. Deserialize transaction
        const txBuffer = Buffer.from(paymentData.payload.serializedTransaction, 'base64');
        const tx = Transaction.from(txBuffer);

        // Extract signature safely
        if (tx.signatures && tx.signatures.length > 0 && tx.signatures[0]) {
            const sig = tx.signatures[0];
            if (sig.signature && sig.signature.length > 0) {
                signature = Buffer.from(sig.signature).toString('base64');
            } else {
                throw new Error('Transaction signature is empty');
            }
        } else {
            throw new Error('Transaction is not signed');
        }

        // 3. Check for duplicate processing
        if (processingTransactions.has(signature)) {
            throw new Error('Transaction already being processed');
        }

        processingTransactions.add(signature);

        // 4. Get transaction details from database
        const { data: txRecord, error: fetchError } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !txRecord) {
            throw new Error('Transaction not found');
        }

        if (txRecord.payment_status === 'completed') {
            throw new Error('Transaction already completed');
        }

        const requiredAmount = Math.floor(txRecord.amount_usd * 1_000_000);

        // 5. Verify SPL Token transfer instruction
        const recipientTokenAccount = await getAssociatedTokenAddress(
            getUSDCMint(),
            RECIPIENT_WALLET
        );

        console.log('📍 Payment Verification Details:');
        console.log('   Recipient Wallet:', RECIPIENT_WALLET.toString());
        console.log('   USDC Mint:', getUSDCMint().toString());
        console.log('   Expected Recipient Token Account (ATA):', recipientTokenAccount.toString());
        console.log('   Required Amount:', requiredAmount / 1_000_000, 'USDC');


        let validTransfer = false;
        let transferAmount = 0;

        for (const ix of tx.instructions) {
            if (ix.programId.equals(TOKEN_PROGRAM_ID)) {
                // SPL Token Transfer instruction (type 3)
                if (ix.data.length >= 9 && ix.data[0] === 3) {
                    transferAmount = Number(ix.data.readBigUInt64LE(1));

                    if (ix.keys.length >= 2) {
                        const destAccount = ix.keys[1].pubkey;

                        console.log('   Transaction Destination Account:', destAccount.toString());
                        console.log('   Accounts Match:', destAccount.equals(recipientTokenAccount));

                        if (destAccount.equals(recipientTokenAccount) && transferAmount >= requiredAmount) {
                            validTransfer = true;
                            console.log(`✓ Valid USDC transfer: ${transferAmount / 1_000_000} USDC`);
                            break;
                        }
                    }
                }
            }
        }

        if (!validTransfer) {
            throw new Error(
                transferAmount > 0
                    ? `Insufficient payment: ${transferAmount / 1_000_000} USDC, expected ${requiredAmount / 1_000_000} USDC`
                    : 'No valid USDC transfer instruction found'
            );
        }

        // 6. Simulate transaction
        console.log('Simulating transaction...');
        const simulation = await connection.simulateTransaction(tx);

        if (simulation.value.err) {
            console.error('Simulation failed:', simulation.value.err);
            throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        console.log('✓ Simulation successful');

        // 7. Submit transaction to blockchain
        console.log('Submitting transaction to Solana...');
        const txSignature = await connection.sendRawTransaction(txBuffer, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });
        console.log(`Transaction submitted: ${txSignature}`);

        // 8. Wait for confirmation
        const confirmation = await connection.confirmTransaction(txSignature, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
        }

        // 9. Verify on-chain token balance changes
        const confirmedTx = await connection.getTransaction(txSignature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!confirmedTx) {
            throw new Error('Could not fetch confirmed transaction');
        }

        const postTokenBalances = confirmedTx.meta?.postTokenBalances ?? [];
        const preTokenBalances = confirmedTx.meta?.preTokenBalances ?? [];

        let amountReceived = 0;
        for (let i = 0; i < postTokenBalances.length; i++) {
            const postBal = postTokenBalances[i];
            const preBal = preTokenBalances.find(pre => pre.accountIndex === postBal.accountIndex);

            const accountKey = confirmedTx.transaction.message.staticAccountKeys[postBal.accountIndex];

            if (accountKey && accountKey.equals(recipientTokenAccount)) {
                const postAmount = postBal.uiTokenAmount.amount;
                const preAmount = preBal?.uiTokenAmount.amount ?? '0';
                amountReceived = Number(postAmount) - Number(preAmount);
                break;
            }
        }

        if (amountReceived < requiredAmount) {
            throw new Error(`Insufficient payment received: ${amountReceived}, expected ${requiredAmount}`);
        }

        console.log(`✓ Payment verified: ${amountReceived / 1_000_000} USDC received`);

        // 10. Update transaction status
        const now = Date.now();
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                payment_status: 'completed',
                x402_tx_hash: txSignature,
                completed_at: now
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        // 11. Add credits to user
        if (txRecord.plan === 'unlimited') {
            const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days
            await supabase
                .from('users')
                .update({
                    credits: 999999,
                    plan: 'unlimited',
                    plan_expires_at: expiresAt
                })
                .eq('id', userId);
        } else {
            // Fetch current credits first
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('credits')
                .eq('id', userId)
                .single();

            if (userError) throw userError;

            await supabase
                .from('users')
                .update({
                    credits: (user.credits || 0) + txRecord.credits_added,
                    plan: txRecord.plan
                })
                .eq('id', userId);
        }

        console.log(`✅ Payment processed successfully! Tx: ${txSignature}`);
        console.log(`   Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=${SOLANA_CLUSTER}`);

        return {
            success: true,
            signature: txSignature,
            amount: amountReceived / 1_000_000,
            creditsAdded: txRecord.credits_added,
            explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=${SOLANA_CLUSTER}`
        };

    } catch (error) {
        console.error('❌ Payment verification error:', error);

        // Log failed payment attempt
        if (transactionId) {
            await supabase
                .from('transactions')
                .update({ payment_status: 'failed' })
                .eq('id', transactionId);
        }

        throw error;
    } finally {
        // Remove from processing set
        if (signature) {
            processingTransactions.delete(signature);
        }
    }
}

/**
 * Get transaction by ID
 */
export async function getTransaction(transactionId) {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get user's transaction history
 */
export async function getUserTransactions(userId, limit = 10) {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

/**
 * Get pricing info for all plans
 */
export function getPricing() {
    const priceLite = getPlanPrice('lite');
    const pricePro = getPlanPrice('pro');
    const priceUnlimited = getPlanPrice('unlimited');

    return {
        free: {
            name: 'Free',
            price: 0,
            priceUSDC: 0,
            credits: parseInt(process.env.FREE_DAILY_LIMIT) || 3,
            period: 'day',
            features: [
                '3 analyses per day',
                'Basic SEO analysis',
                'Export results'
            ]
        },
        lite: {
            name: 'Lite',
            price: priceLite,
            priceUSDC: priceLite,
            credits: parseInt(process.env.CREDITS_LITE) || 20,
            period: 'one-time',
            features: [
                '20 analyses',
                'Full SEO analysis',
                'PDF Export',
                'Public share links'
            ]
        },
        pro: {
            name: 'Pro',
            price: pricePro,
            priceUSDC: pricePro,
            credits: parseInt(process.env.CREDITS_PRO) || 100,
            period: 'one-time',
            features: [
                '100 analyses',
                'Advanced analysis',
                'Priority support',
                'API access',
                'PDF Export'
            ]
        },
        unlimited: {
            name: 'Unlimited',
            price: priceUnlimited,
            priceUSDC: priceUnlimited,
            credits: 999999,
            period: 'month',
            features: [
                'Unlimited analyses',
                'All PRO features',
                'Priority support 24/7',
                'Personal API key',
                'White label'
            ]
        }
    };
}
