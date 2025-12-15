import supabase from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_CREDITS = 3;

export async function createGuestUser() {
    const userId = uuidv4();
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
        .from('users')
        .insert({
            id: userId,
            is_guest: true,
            credits: 0, // No credits for guest without wallet
            plan: 'guest',
            created_at: now,
            last_analysis_date: today,
            daily_analysis_count: 0
        });

    if (error) throw error;

    return {
        id: userId,
        isGuest: true,
        credits: 0,
        plan: 'guest'
    };
}
export async function getUser(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data;
}

export async function getUserByWallet(walletAddress) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data;
}

export async function getUserByEmail(email) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data;
}

export async function createOrGetWalletUser(walletAddress) {
    // Try to find existing user by wallet
    let user = await getUserByWallet(walletAddress);

    if (user) {
        return user;
    }

    // Create new user with wallet
    const userId = uuidv4();
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('users')
        .insert({
            id: userId,
            wallet_address: walletAddress,
            is_guest: false,
            credits: INITIAL_CREDITS, // Give 3 initial credits
            plan: 'free_tier',
            created_at: now,
            last_analysis_date: today,
            daily_analysis_count: 0
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}

// ... (existing linkWalletToUser/updateUserCredits remain same)

export async function checkAndResetDailyLimit(user) {
    // No longer resetting daily limits for free users
    // We keep this function to avoid breaking existing calls, but it just returns user
    // Or we could track daily usage for stats only, but not for limits
    return user;
}

export async function incrementAnalysisCount(userId) {
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('daily_analysis_count')
        .eq('id', userId)
        .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
        .from('users')
        .update({ daily_analysis_count: (user.daily_analysis_count || 0) + 1 })
        .eq('id', userId);

    if (error) throw error;
}

export async function canUserAnalyze(user) {
    if (user.plan === 'unlimited') {
        return { allowed: true, remaining: 999999 };
    }

    // For ALL other plans (free_tier, paid credits), simply check credits balance
    return {
        allowed: (user.credits > 0),
        remaining: user.credits
    };
}

export async function deductCredit(userId, user) {
    if (user.plan === 'unlimited') {
        await incrementAnalysisCount(userId);
        return;
    }

    // Always deduct from credits
    // Fetch-update pattern
    const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
        .from('users')
        .update({ credits: Math.max(0, (userData.credits || 0) - 1) })
        .eq('id', userId);

    if (error) throw error;

    // Also track total count
    await incrementAnalysisCount(userId);
}

export async function addCredits(userId, credits, plan = null) {
    // Fetch-update pattern
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

    if (fetchError) throw fetchError;

    const updates = {
        credits: (user.credits || 0) + credits
    };

    if (plan) {
        updates.plan = plan;
    }

    const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

    if (error) throw error;
}

export async function setUnlimitedPlan(userId, expiresAt) {
    const { error } = await supabase
        .from('users')
        .update({
            plan: 'unlimited',
            plan_expires_at: expiresAt,
            credits: 999999
        })
        .eq('id', userId);

    if (error) throw error;
}
