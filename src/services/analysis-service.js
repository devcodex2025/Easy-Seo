import supabase from '../database.js';
import { v4 as uuidv4 } from 'uuid';

export async function saveAnalysis(userId, url, seoResult, isPublic = false) {
    const id = uuidv4();
    const publicToken = isPublic ? uuidv4() : null;
    const now = Date.now();

    const { error } = await supabase
        .from('analyses')
        .insert({
            id,
            user_id: userId,
            url,
            screenshot_url: seoResult.screenshot || null,
            title: seoResult.title,
            title_length: seoResult.titleLength,
            meta_description: seoResult.metaDescription,
            meta_description_length: seoResult.metaDescriptionLength,
            h1_count: seoResult.h1Count,
            h2_count: seoResult.h2Count,
            h3_count: seoResult.h3Count,
            has_canonical: seoResult.hasCanonical,
            canonical_url: seoResult.canonicalUrl,
            og_title: seoResult.ogTitle,
            og_description: seoResult.ogDescription,
            og_image: seoResult.ogImage,
            twitter_card: seoResult.twitterCard,
            http_status: seoResult.httpStatus,
            final_url: seoResult.finalUrl,
            redirect_count: seoResult.redirectCount,
            ttfb: seoResult.ttfb,
            load_time: seoResult.loadTime,
            has_viewport: seoResult.hasViewport,
            is_https: seoResult.isHttps,
            security_headers: seoResult.securityHeaders, // Supabase handles JSON automatically
            seo_score: seoResult.seoScore,
            warnings: seoResult.warnings,
            recommendations: seoResult.recommendations,
            is_public: isPublic,
            public_token: publicToken,
            created_at: now
        });

    if (error) throw error;

    return { id, publicToken };
}

export async function getAnalysis(analysisId) {
    const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Supabase JS automatically parses JSON columns, so we don't need manual JSON.parse
    return data;
}

export async function getAnalysisByPublicToken(token) {
    const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('public_token', token)
        .eq('is_public', true)
        .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data;
}

export async function getUserAnalyses(userId, limit = 20) {
    const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;

    return data;
}

export async function makeAnalysisPublic(analysisId, userId) {
    const publicToken = uuidv4();

    const { error } = await supabase
        .from('analyses')
        .update({
            is_public: true,
            public_token: publicToken
        })
        .eq('id', analysisId)
        .eq('user_id', userId);

    if (error) throw error;

    return publicToken;
}

export async function deleteAnalysis(analysisId, userId) {
    const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', userId);

    if (error) throw error;
}

export async function getGlobalStats() {
    // Get total analyses count
    const { count, error: countError } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Supabase JS doesn't support AVG aggregation directly in .select() easily without RPC.
    // We can fetch all load_time and seo_score (might be heavy) OR use a stored procedure.
    // For now, to avoid creating RPCs, we will fetch a limited set or just return 0 if too heavy.
    // Actually, for "Global Stats" usually we want real numbers.
    // Let's try to fetch just the columns needed, but if there are 10k rows, it's bad.
    // Ideally user should create an RPC 'get_global_stats'.
    // Since I cannot create RPC via JS, I will implement a simplified version:
    // Fetch last 100 analyses to calculate average (approximation).

    const { data: recentAnalyses, error: statsError } = await supabase
        .from('analyses')
        .select('load_time, seo_score')
        .gt('load_time', 0)
        .order('created_at', { ascending: false })
        .limit(100);

    if (statsError) throw statsError;

    let totalLoadTime = 0;
    let totalScore = 0;
    let validCount = recentAnalyses.length;

    recentAnalyses.forEach(a => {
        totalLoadTime += a.load_time || 0;
        totalScore += a.seo_score || 0;
    });

    const avgLoadTime = validCount > 0 ? totalLoadTime / validCount : 0;
    const avgScore = validCount > 0 ? totalScore / validCount : 0;

    return {
        totalAnalyses: count || 0,
        avgLoadTime: Math.round(avgLoadTime),
        avgScore: Math.round(avgScore)
    };
}
