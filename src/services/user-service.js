import supabase from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT) || 3;

export async function createGuestUser() {
    const userId = uuidv4();
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
        .from('users')
        .insert({
            id: userId,
            is_guest: true,
            credits: FREE_DAILY_LIMIT,
            plan: 'free',
            created_at: now,
            last_analysis_date: today,
            daily_analysis_count: 0
        });

    if (error) throw error;

    return {
        id: userId,
        isGuest: true,
        credits: FREE_DAILY_LIMIT,
        plan: 'free'
    };
}

export async function getUser(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        throw error;
    }

    return data;
}

export async function getUserByEmail(email) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return data;
}

export async function updateUserCredits(userId, credits) {
    const { error } = await supabase
        .from('users')
        .update({ credits: credits })
        .eq('id', userId);

    if (error) throw error;
}

export async function checkAndResetDailyLimit(user) {
    const today = new Date().toISOString().split('T')[0];
    let updatedUser = { ...user };

    if (user.plan === 'free') {
        if (user.last_analysis_date !== today) {
            // Reset daily counter for free users
            const { data, error } = await supabase
                .from('users')
                .update({
                    daily_analysis_count: 0,
                    last_analysis_date: today
                })
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;
            updatedUser = data || { ...user, daily_analysis_count: 0, last_analysis_date: today };
        }
        // Always add the 'remaining' property for free users
        updatedUser.remaining = Math.max(0, FREE_DAILY_LIMIT - (updatedUser.daily_analysis_count || 0));
    }

    return updatedUser;
}

export async function incrementAnalysisCount(userId) {
    // Supabase doesn't have a direct atomic increment via JS SDK easily without RPC or raw SQL.
    // However, we can use the rpc() method if we created a function, or fetch-modify-update.
    // For simplicity and since we don't have RPCs set up, we'll fetch first.
    // BETTER: Use the .rpc() if possible, but we can't create functions easily from here.
    // ALTERNATIVE: Use raw SQL if supabase client supports it (it doesn't directly expose query).
    // We will do fetch-update for now. Concurrency might be an issue but acceptable for this scale.

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
    user = await checkAndResetDailyLimit(user);

    if (user.plan === 'unlimited') {
        return { allowed: true, remaining: 999999 };
    }

    if (user.plan === 'free') {
        const remaining = FREE_DAILY_LIMIT - user.daily_analysis_count;
        return {
            allowed: remaining > 0,
            remaining: Math.max(0, remaining)
        };
    }

    // Paid plans (lite, pro)
    return {
        allowed: user.credits > 0,
        remaining: user.credits
    };
}

export async function deductCredit(userId, user) {
    if (user.plan === 'unlimited') {
        await incrementAnalysisCount(userId);
        return;
    }

    if (user.plan === 'free') {
        await incrementAnalysisCount(userId);
    } else {
        // Deduct from credits for paid plans
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
    }
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
