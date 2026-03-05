// ===================================
// supabase.js - Elite Capital (نسخة محدثة بالكامل مع جميع الإصلاحات)
// ===================================

const SUPABASE_URL = 'https://macbjaiunubocfyhvbvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hY2JqYWl1bnVib2NmeWh2YnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjc2OTcsImV4cCI6MjA4NzYwMzY5N30.s7s6xhgkbfLFubffKeilZwkAJuttu_GKPo8xJPNUe-M';

let supabaseClient = null;

// ========== حل مشكلة LockManager ==========
(function fixLockManager() {
    if (navigator && navigator.locks) {
        try {
            const originalLocks = navigator.locks;
            Object.defineProperty(navigator, 'locks', {
                get: () => undefined,
                configurable: true
            });
            
            setTimeout(() => {
                Object.defineProperty(navigator, 'locks', {
                    get: () => originalLocks,
                    configurable: true
                });
            }, 5000);
        } catch (e) {}
    }
})();

// ========== دوال مساعدة للوقت ==========

// دالة لتحويل التوقيت المحلي إلى توقيت UTC (للحفظ في قاعدة البيانات)
function convertToUTC(dateString) {
    const localDate = new Date(dateString);
    // نطرح فرق التوقيت المحلي للحصول على UTC
    return new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
}

// دالة لعرض الوقت حسب المنطقة المحلية (للعرض في الواجهة)
function formatLocalTime(dateString) {
    const date = new Date(dateString);
    // نضيف فرق التوقيت المحلي
    const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    
    const day = localDate.getDate().toString().padStart(2, '0');
    const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const year = localDate.getFullYear();
    
    let hours = localDate.getHours();
    const minutes = localDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${year}/${month}/${day} ${hours}:${minutes} ${ampm}`;
}

// دالة لحساب الوقت المتبقي للمباراة (مع مراعاة فرق التوقيت)
function getMatchTimeRemaining(matchDateString) {
    const matchDate = new Date(matchDateString);
    const now = new Date();
    
    // الفرق بالدقائق
    const diffMinutes = (matchDate - now) / (1000 * 60);
    
    return {
        diffMinutes,
        canBet: diffMinutes > 5,
        minutesLeft: Math.floor(diffMinutes),
        matchDate: matchDate,
        nowUTC: now
    };
}

// ========== تهيئة الاتصال ==========
function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('❌ مكتبة Supabase غير محملة');
        return null;
    }
    
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: window.sessionStorage,
                storageKey: 'elite_capital_auth_' + Date.now()
            }
        });
        console.log('✅ تم الاتصال بـ Supabase');
        return supabaseClient;
    } catch (error) {
        console.error('❌ فشل الاتصال:', error);
        return null;
    }
}

// ========== دوال المساعدة ==========
function generateReferralCode(username) {
    if (!username) username = 'USER';
    const cleanUsername = username.toString().toUpperCase().replace(/\s/g, '').substring(0, 5);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanUsername}${random}${timestamp}`.substring(0, 12);
}

// ========== المستخدمين ==========
async function registerUser(userData) {
    try {
        console.log('بدء تسجيل مستخدم جديد:', userData.email);
        
        const { data: existing, error: checkError } = await supabaseClient
            .from('users')
            .select('id')
            .or(`email.eq.${userData.email},username.eq.${userData.username}`)
            .maybeSingle();
        
        if (existing) {
            throw new Error('البريد الإلكتروني أو اسم المستخدم مستخدم مسبقاً');
        }
        
        const referralCode = generateReferralCode(userData.username);
        
        let referredBy = null;
        if (userData.referralCode) {
            const { data: referrer } = await supabaseClient
                .from('users')
                .select('referral_code')
                .eq('referral_code', userData.referralCode)
                .maybeSingle();
            
            if (referrer) {
                referredBy = userData.referralCode;
            }
        }
        
        const newUserData = {
            name: userData.name,
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            password: userData.password,
            referral_code: referralCode,
            referred_by: referredBy,
            balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
            status: 'active',
            is_admin: false,
            joined_date: new Date().toISOString(),
            last_login: new Date().toISOString(),
            created_at: new Date().toISOString(),
            wallet_address: '',
            last_claim_time: null,
            referral_earnings: 0,
            referral_count: 0,
            violation_count: 0,
            is_suspended: false,
            suspension_reason: null,
            suspended_until: null
        };
        
        const { data: newUser, error } = await supabaseClient
            .from('users')
            .insert([newUserData])
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, data: newUser };
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        return { success: false, error: error.message };
    }
}

async function loginUser(usernameOrEmail, password) {
    try {
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .or(`email.eq.${usernameOrEmail},username.eq.${usernameOrEmail}`)
            .maybeSingle();
        
        if (error) throw error;
        if (!user) throw new Error('المستخدم غير موجود');
        if (user.password !== password) throw new Error('كلمة المرور غير صحيحة');
        
        // التحقق من حالة التعليق
        if (user.is_suspended) {
            if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
                throw new Error(`حسابك معلق حتى ${new Date(user.suspended_until).toLocaleDateString('ar-SA')}`);
            } else {
                // إعادة تنشيط الحساب إذا انتهت مدة التعليق
                await supabaseClient
                    .from('users')
                    .update({ 
                        is_suspended: false, 
                        suspension_reason: null,
                        suspended_until: null 
                    })
                    .eq('id', user.id);
            }
        }
        
        if (user.status === 'banned') throw new Error('حسابك محظور');
        
        await supabaseClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
        
        await addLoginActivity(user.id);
        
        return { success: true, data: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserById(id) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateUser(id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getAllUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateUserStatus(id, status, reason = null) {
    try {
        const updates = { 
            status,
            updated_at: new Date().toISOString()
        };
        
        if (reason) {
            updates.status_reason = reason;
        }
        
        const { error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== نظام مخالفات المطالبة المزدوجة ==========
async function handleDoubleClaimViolation(userId) {
    try {
        // جلب المستخدم
        const { data: user } = await supabaseClient
            .from('users')
            .select('violation_count, is_suspended')
            .eq('id', userId)
            .single();
        
        const newViolationCount = (user.violation_count || 0) + 1;
        
        // تعليق الحساب فوراً
        const suspendUntil = new Date();
        suspendUntil.setDate(suspendUntil.getDate() + (newViolationCount * 7)); // أسبوع لكل مخالفة
        
        await supabaseClient
            .from('users')
            .update({
                violation_count: newViolationCount,
                is_suspended: true,
                suspension_reason: `محاولة مطالبة مزدوجة (المخالفة رقم ${newViolationCount})`,
                suspended_until: suspendUntil.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        // تسجيل النشاط
        await addActivity({
            userId: userId,
            type: 'violation',
            title: '⚠️ مخالفة نظام',
            description: `محاولة مطالبة مزدوجة - تم تعليق الحساب حتى ${suspendUntil.toLocaleDateString('ar-SA')}`,
            status: 'suspended'
        });
        
        return { 
            success: true, 
            data: {
                violation_count: newViolationCount,
                suspended_until: suspendUntil
            }
        };
    } catch (error) {
        console.error('خطأ في معالجة المخالفة:', error);
        return { success: false, error: error.message };
    }
}

// ========== الباقات ==========
async function getAllPackages() {
    try {
        const { data, error } = await supabaseClient
            .from('packages')
            .select('*')
            .eq('status', 'active')
            .order('price', { ascending: true });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getPackageById(id) {
    try {
        const { data, error } = await supabaseClient
            .from('packages')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createPackage(packageData) {
    try {
        const profitPercentage = (packageData.dailyProfit / packageData.price) * 100;
        
        const { data, error } = await supabaseClient
            .from('packages')
            .insert([{
                name: packageData.name,
                price: packageData.price,
                daily_profit: packageData.dailyProfit,
                profit_percentage: profitPercentage,
                duration: packageData.duration || 30,
                duration_type: packageData.durationType || 'day',
                category: packageData.category || 'standard',
                description: packageData.description || '',
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updatePackage(id, updates) {
    try {
        const { error } = await supabaseClient
            .from('packages')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deletePackage(id) {
    try {
        const { error } = await supabaseClient
            .from('packages')
            .update({ status: 'deleted' })
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== طلبات الاشتراك ==========
async function createPendingPackage(pendingData) {
    try {
        const { data: user } = await supabaseClient
            .from('users')
            .select('id, name, email, phone, referred_by')
            .eq('id', pendingData.userId)
            .single();
        
        const { data: pkg } = await supabaseClient
            .from('packages')
            .select('id, name, category, duration, duration_type, daily_profit, price')
            .eq('id', pendingData.packageId)
            .single();
        
        const insertData = {
            user_id: user.id,
            user_name: user.name || 'مستخدم',
            user_email: user.email || '',
            user_phone: user.phone || '',
            package_id: pkg.id,
            package_name: pkg.name || 'باقة',
            package_category: pkg.category || 'standard',
            package_duration: pkg.duration || 30,
            package_duration_type: pkg.duration_type || 'day',
            package_daily_profit: pkg.daily_profit || 0,
            amount: pkg.price,
            payment_proof: pendingData.paymentProof || null,
            wallet_address: pendingData.walletAddress || 'TYmk60K9JvCqS7Fqy6BpWpZp8hLpVHw7D',
            network: 'TRC20',
            transaction_hash: pendingData.paymentProof ? 'PROOF_' + Date.now() : null,
            referred_by: user.referred_by || null,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseClient
            .from('pending_packages')
            .insert([insertData])
            .select()
            .single();
        
        if (error) throw error;
        
        await addSubscriptionActivity(user.id, pkg.price, pkg.name, 'pending');
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getPendingPackages() {
    try {
        const { data, error } = await supabaseClient
            .from('pending_packages')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function approvePendingPackage(id, adminId) {
    try {
        const { data: pending, error: fetchError } = await supabaseClient
            .from('pending_packages')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError) throw fetchError;
        
        const { data: pkg } = await supabaseClient
            .from('packages')
            .select('duration, duration_type, daily_profit')
            .eq('id', pending.package_id)
            .single();
        
        const startDate = new Date();
        const endDate = new Date();
        
        if (pkg) {
            const duration = pkg.duration || 30;
            const durationType = pkg.duration_type || 'day';
            
            if (durationType === 'day') {
                endDate.setDate(endDate.getDate() + duration);
            } else if (durationType === 'month') {
                endDate.setDate(endDate.getDate() + (duration * 30));
            } else if (durationType === 'year') {
                endDate.setDate(endDate.getDate() + (duration * 365));
            }
        } else {
            endDate.setDate(endDate.getDate() + 30);
        }
        
        await supabaseClient
            .from('pending_packages')
            .update({ 
                status: 'approved',
                processed_by: adminId,
                processed_at: new Date().toISOString()
            })
            .eq('id', id);
        
        const { data: subscription, error: subError } = await supabaseClient
            .from('subscriptions')
            .insert([{
                user_id: pending.user_id,
                package_id: pending.package_id,
                package_name: pending.package_name,
                package_category: pending.package_category || 'standard',
                amount: pending.amount,
                daily_profit: pending.package_daily_profit || (pending.amount * 0.025),
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                last_claim_date: null,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (subError) throw subError;
        
        await supabaseClient
            .from('users')
            .update({ 
                current_subscription_id: subscription.id,
                has_active_subscription: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', pending.user_id);
        
        await supabaseClient
            .from('transactions')
            .insert([{
                user_id: pending.user_id,
                type: 'اشتراك',
                amount: pending.amount,
                description: `اشتراك في باقة ${pending.package_name}`,
                status: 'completed',
                subscription_id: subscription.id,
                created_at: new Date().toISOString()
            }]);
        
        if (pending.referred_by) {
            await processReferralRewards(pending.user_id, pending.referred_by);
        }
        
        await addSubscriptionActivity(pending.user_id, pending.amount, pending.package_name, 'approved');
        
        return { success: true, data: subscription };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function rejectPendingPackage(id, reason, adminId) {
    try {
        const { error } = await supabaseClient
            .from('pending_packages')
            .update({ 
                status: 'rejected',
                rejection_reason: reason,
                processed_by: adminId,
                processed_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== نظام المطالبة بالأرباح اليومية ==========
async function claimDailyProfit(userId) {
    try {
        // التحقق من حالة المستخدم
        const { data: user } = await supabaseClient
            .from('users')
            .select('is_suspended, violation_count')
            .eq('id', userId)
            .single();
        
        if (user.is_suspended) {
            throw new Error('حسابك معلق مؤقتاً');
        }
        
        const { data: subscription, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (subError || !subscription) {
            throw new Error('لا يوجد اشتراك نشط');
        }
        
        const now = new Date();
        const lastClaim = subscription.last_claim_date ? new Date(subscription.last_claim_date) : null;
        
        if (lastClaim) {
            const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
            
            // إذا حاول المستخدم المطالبة قبل 24 ساعة
            if (hoursSinceLastClaim < 24) {
                // تسجيل مخالفة
                await handleDoubleClaimViolation(userId);
                throw new Error('⚠️ تم تسجيل مخالفة! لا يمكنك المطالبة إلا مرة واحدة كل 24 ساعة');
            }
        }
        
        const profitAmount = subscription.daily_profit;
        
        const { data: userBalance } = await supabaseClient
            .from('users')
            .select('balance, total_earned')
            .eq('id', userId)
            .single();
        
        await supabaseClient
            .from('users')
            .update({ 
                balance: (userBalance.balance || 0) + profitAmount,
                total_earned: (userBalance.total_earned || 0) + profitAmount
            })
            .eq('id', userId);
        
        await supabaseClient
            .from('subscriptions')
            .update({ 
                last_claim_date: now.toISOString()
            })
            .eq('id', subscription.id);
        
        const { data: profit } = await supabaseClient
            .from('daily_profits')
            .insert([{
                user_id: userId,
                subscription_id: subscription.id,
                amount: profitAmount,
                profit_date: now.toISOString().split('T')[0],
                created_at: now.toISOString()
            }])
            .select()
            .single();
        
        await supabaseClient
            .from('transactions')
            .insert([{
                user_id: userId,
                type: 'ربح يومي',
                amount: profitAmount,
                description: `مطالبة بأرباح يومية من باقة ${subscription.package_name}`,
                status: 'completed',
                subscription_id: subscription.id,
                created_at: now.toISOString()
            }]);
        
        await addProfitActivity(userId, profitAmount, subscription.package_name);
        
        return { 
            success: true, 
            data: {
                amount: profitAmount,
                nextClaimTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getClaimStatus(userId) {
    try {
        const { data: subscription, error } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error || !subscription) {
            return { success: true, data: { canClaim: false, reason: 'no_subscription' } };
        }
        
        const now = new Date();
        const lastClaim = subscription.last_claim_date ? new Date(subscription.last_claim_date) : null;
        
        if (!lastClaim) {
            return { 
                success: true, 
                data: { 
                    canClaim: true, 
                    dailyProfit: subscription.daily_profit,
                    packageName: subscription.package_name
                }
            };
        }
        
        const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
        
        if (hoursSinceLastClaim >= 24) {
            return { 
                success: true, 
                data: { 
                    canClaim: true, 
                    dailyProfit: subscription.daily_profit,
                    packageName: subscription.package_name
                }
            };
        } else {
            const hoursLeft = 24 - hoursSinceLastClaim;
            const nextClaimTime = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
            
            return { 
                success: true, 
                data: { 
                    canClaim: false, 
                    hoursLeft: Math.ceil(hoursLeft),
                    nextClaimTime: nextClaimTime.toISOString(),
                    dailyProfit: subscription.daily_profit,
                    packageName: subscription.package_name
                }
            };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== الإحالة ==========
async function processReferralRewards(newUserId, referralCode) {
    try {
        const { data: referrer } = await supabaseClient
            .from('users')
            .select('*')
            .eq('referral_code', referralCode)
            .single();
        
        if (!referrer) return { success: false };
        
        const REFERRER_REWARD = 50;
        const REFEREE_REWARD = 20;
        
        const { data: newUser } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', newUserId)
            .single();
        
        await supabaseClient
            .from('users')
            .update({ 
                balance: (newUser.balance || 0) + REFEREE_REWARD,
                referral_reward_paid: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', newUserId);
        
        await supabaseClient
            .from('users')
            .update({ 
                balance: (referrer.balance || 0) + REFERRER_REWARD,
                referral_earnings: (referrer.referral_earnings || 0) + REFERRER_REWARD,
                referral_count: (referrer.referral_count || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', referrer.id);
        
        const transactions = [
            {
                user_id: newUserId,
                type: 'مكافأة إحالة',
                amount: REFEREE_REWARD,
                description: `🎁 مكافأة تسجيل عن طريق كود الإحالة من ${referrer.name}`,
                status: 'completed',
                referral_code: referralCode,
                referrer_name: referrer.name,
                created_at: new Date().toISOString()
            },
            {
                user_id: referrer.id,
                type: 'مكافأة إحالة',
                amount: REFERRER_REWARD,
                description: `💰 مكافأة إحالة: ${newUser.name}`,
                status: 'completed',
                referred_user_id: newUserId,
                referred_user_name: newUser.name,
                created_at: new Date().toISOString()
            }
        ];
        
        await supabaseClient.from('transactions').insert(transactions);
        
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

async function getReferralStats(userId) {
    try {
        const { data: user } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        const { data: referredUsers } = await supabaseClient
            .from('users')
            .select('id, name, email, joined_date, has_active_subscription, referral_reward_paid')
            .eq('referred_by', user.referral_code);
        
        const totalEarned = user.referral_earnings || 0;
        const activeReferrals = referredUsers?.filter(u => u.has_active_subscription).length || 0;
        
        return {
            success: true,
            data: {
                referralCode: user.referral_code,
                totalReferrals: referredUsers?.length || 0,
                activeReferrals: activeReferrals,
                pendingReferrals: (referredUsers?.length || 0) - activeReferrals,
                totalEarned: totalEarned,
                referredUsers: referredUsers || []
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== الاشتراكات ==========
async function getUserSubscription(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== طلبات السحب ==========
async function createWithdrawal(withdrawalData) {
    try {
        const { data: user } = await supabaseClient
            .from('users')
            .select('balance')
            .eq('id', withdrawalData.userId)
            .single();
        
        const totalAmount = withdrawalData.amount + withdrawalData.fee;
        if (user.balance < totalAmount) {
            throw new Error('الرصيد غير كافي');
        }
        
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .insert([{
                user_id: withdrawalData.userId,
                amount: withdrawalData.amount,
                wallet: withdrawalData.wallet,
                network: withdrawalData.network,
                fee: withdrawalData.fee,
                total: totalAmount,
                status: 'pending',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        await supabaseClient
            .from('users')
            .update({ 
                balance: user.balance - totalAmount,
                total_withdrawn: (user.total_withdrawn || 0) + withdrawalData.amount
            })
            .eq('id', withdrawalData.userId);
        
        await supabaseClient
            .from('transactions')
            .insert([{
                user_id: withdrawalData.userId,
                type: 'سحب',
                amount: -totalAmount,
                description: `طلب سحب ${withdrawalData.amount}$ (رسوم ${withdrawalData.fee}$)`,
                status: 'pending',
                withdrawal_id: data.id,
                created_at: new Date().toISOString()
            }]);
        
        await addWithdrawalActivity(withdrawalData.userId, withdrawalData.amount, 'pending');
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserWithdrawals(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getAllWithdrawals(status = null) {
    try {
        let query = supabaseClient
            .from('withdrawals')
            .select('*, users(name, email)')
            .order('created_at', { ascending: false });
        
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getPendingWithdrawals() {
    return getAllWithdrawals('pending');
}

async function updateWithdrawalStatus(id, status, adminId, txHash = null) {
    try {
        const updates = { 
            status: status,
            processed_by: adminId,
            processed_at: new Date().toISOString()
        };
        
        if (txHash) updates.transaction_hash = txHash;
        
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        if (status === 'rejected') {
            const { data: user } = await supabaseClient
                .from('users')
                .select('balance')
                .eq('id', data.user_id)
                .single();
            
            await supabaseClient
                .from('users')
                .update({ balance: user.balance + data.total })
                .eq('id', data.user_id);
        }
        
        await addWithdrawalActivity(data.user_id, data.amount, status);
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== المعاملات ==========
async function getUserTransactions(userId, limit = 50) {
    try {
        const { data, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getAllTransactions() {
    try {
        const { data, error } = await supabaseClient
            .from('transactions')
            .select('*, users(name, email)')
            .order('created_at', { ascending: false })
            .limit(500);
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== نظام الهدايا ==========
async function sendGift(giftData) {
    try {
        const giftRecord = {
            title: giftData.title,
            message: giftData.message,
            amount: giftData.amount,
            type: giftData.type,
            target_type: giftData.targetType,
            target_user_id: giftData.targetUserId || null,
            created_by: giftData.createdBy,
            status: 'active',
            created_at: new Date().toISOString()
        };
        
        const { data: gift, error } = await supabaseClient
            .from('gifts')
            .insert([giftRecord])
            .select()
            .single();
        
        if (error) throw error;
        
        if (giftData.targetType === 'all') {
            const { data: users } = await supabaseClient
                .from('users')
                .select('id');
            
            for (const user of users) {
                await supabaseClient
                    .from('user_gifts')
                    .insert([{
                        user_id: user.id,
                        gift_id: gift.id,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    }]);
            }
        } else if (giftData.targetType === 'single' && giftData.targetUserId) {
            await supabaseClient
                .from('user_gifts')
                .insert([{
                    user_id: giftData.targetUserId,
                    gift_id: gift.id,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }]);
        }
        
        return { success: true, data: gift };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserGifts(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('user_gifts')
            .select(`
                *,
                gifts:gift_id (*)
            `)
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function claimGift(userGiftId) {
    try {
        const { data: userGift } = await supabaseClient
            .from('user_gifts')
            .select('*, gifts:gift_id(*)')
            .eq('id', userGiftId)
            .single();
        
        if (!userGift) throw new Error('الهدية غير موجودة');
        
        const amount = userGift.gifts.amount;
        
        const { data: user } = await supabaseClient
            .from('users')
            .select('balance')
            .eq('id', userGift.user_id)
            .single();
        
        await supabaseClient
            .from('users')
            .update({ balance: (user.balance || 0) + amount })
            .eq('id', userGift.user_id);
        
        await supabaseClient
            .from('user_gifts')
            .update({ 
                status: 'claimed',
                claimed_at: new Date().toISOString()
            })
            .eq('id', userGiftId);
        
        await supabaseClient
            .from('transactions')
            .insert([{
                user_id: userGift.user_id,
                type: 'هدية',
                amount: amount,
                description: userGift.gifts.message || 'هدية من الإدارة',
                status: 'completed',
                created_at: new Date().toISOString()
            }]);
        
        return { success: true, data: { amount } };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getAllGifts() {
    try {
        const { data, error } = await supabaseClient
            .from('gifts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== إحصائيات لوحة التحكم ==========
async function getDashboardStats() {
    try {
        const [
            usersRes,
            packagesRes,
            pendingPackagesRes,
            subscriptionsRes,
            withdrawalsRes,
            giftsRes,
            matchesRes,
            betsRes
        ] = await Promise.all([
            supabaseClient.from('users').select('*', { count: 'exact', head: false }),
            supabaseClient.from('packages').select('*').eq('status', 'active'),
            supabaseClient.from('pending_packages').select('*').eq('status', 'pending'),
            supabaseClient.from('subscriptions').select('*').eq('status', 'active'),
            supabaseClient.from('withdrawals').select('*'),
            supabaseClient.from('gifts').select('*'),
            supabaseClient.from('matches').select('*').eq('status', 'upcoming'),
            supabaseClient.from('bets').select('*').eq('status', 'pending')
        ]);
        
        const users = usersRes.data || [];
        const packages = packagesRes.data || [];
        const pendingPackages = pendingPackagesRes.data || [];
        const subscriptions = subscriptionsRes.data || [];
        const withdrawals = withdrawalsRes.data || [];
        const gifts = giftsRes.data || [];
        const matches = matchesRes.data || [];
        const pendingBets = betsRes.data || [];
        
        const totalDeposits = users.reduce((sum, u) => sum + (u.total_earned || 0), 0);
        const totalWithdrawals = withdrawals
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + w.amount, 0);
        
        const activeUsers = users.filter(u => u.status === 'active' || !u.status).length;
        const suspendedUsers = users.filter(u => u.is_suspended).length;
        const bannedUsers = users.filter(u => u.status === 'banned').length;
        
        const pendingGifts = gifts.filter(g => g.status === 'active').length;
        
        return {
            success: true,
            data: {
                totalUsers: users.length,
                activeUsers,
                suspendedUsers,
                bannedUsers,
                totalDeposits,
                totalWithdrawals,
                activeSubscriptions: subscriptions.length,
                pendingPackages: pendingPackages.length,
                pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
                packagesCount: packages.length,
                pendingGifts: pendingGifts,
                upcomingMatches: matches.length,
                pendingBets: pendingBets.length
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== نظام الصور في الدردشة (Base64) ==========
async function uploadChatImage(file, userId) {
    try {
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('حجم الصورة كبير جداً (الحد الأقصى 5MB)');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64 = reader.result;
                    
                    const { data, error } = await supabaseClient
                        .from('chat_images')
                        .insert([{
                            user_id: userId,
                            image_data: base64,
                            created_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (error) throw error;

                    resolve({ 
                        success: true, 
                        data: {
                            id: data.id,
                            url: `image:${data.id}`
                        }
                    });
                } catch (error) {
                    reject({ success: false, error: error.message });
                }
            };
            reader.onerror = () => reject({ success: false, error: 'فشل قراءة الملف' });
            reader.readAsDataURL(file);
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getChatImage(imageId) {
    try {
        const { data, error } = await supabaseClient
            .from('chat_images')
            .select('image_data')
            .eq('id', imageId)
            .single();

        if (error) throw error;

        return { success: true, data: data.image_data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== نظام الدردشة المباشرة ==========
async function startLiveChat(userId) {
    try {
        const { data: existingChat } = await supabaseClient
            .from('live_chats')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();
        
        if (existingChat) {
            return { success: true, data: existingChat, isNew: false };
        }
        
        const { data: newChat, error: createError } = await supabaseClient
            .from('live_chats')
            .insert([{
                user_id: userId,
                status: 'active',
                started_at: new Date().toISOString(),
                last_message_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (createError) throw createError;
        
        return { success: true, data: newChat, isNew: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sendChatMessage(chatId, userId, message, imageRef = null) {
    try {
        if ((!message || !message.trim()) && !imageRef) {
            throw new Error('الرسالة أو الصورة مطلوبة');
        }
        
        const { data: newMessage, error: msgError } = await supabaseClient
            .from('chat_messages')
            .insert([{
                chat_id: chatId,
                user_id: userId,
                message: message || null,
                image_url: imageRef,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (msgError) throw msgError;
        
        await supabaseClient
            .from('live_chats')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', chatId);
        
        return { success: true, data: newMessage };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getChatMessages(chatId) {
    try {
        const { data, error } = await supabaseClient
            .from('chat_messages')
            .select(`
                *,
                users:user_id (
                    id,
                    name,
                    is_admin
                )
            `)
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function markMessagesAsRead(chatId, userId) {
    try {
        const { error } = await supabaseClient
            .from('chat_messages')
            .update({ 
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('chat_id', chatId)
            .neq('user_id', userId)
            .eq('is_read', false);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteChatMessage(messageId, adminId) {
    try {
        const { error } = await supabaseClient
            .from('chat_messages')
            .update({ 
                is_deleted: true,
                deleted_by: adminId,
                deleted_at: new Date().toISOString()
            })
            .eq('id', messageId);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getActiveChats() {
    try {
        const { data, error } = await supabaseClient
            .from('live_chats')
            .select(`
                *,
                users:user_id (
                    id,
                    name,
                    email,
                    phone
                )
            `)
            .eq('status', 'active')
            .order('last_message_at', { ascending: false });
        
        if (error) throw error;
        
        for (let chat of data || []) {
            const { data: lastMessage } = await supabaseClient
                .from('chat_messages')
                .select('*')
                .eq('chat_id', chat.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            chat.last_message = lastMessage;
            
            const { count } = await supabaseClient
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('chat_id', chat.id)
                .eq('is_read', false)
                .eq('is_deleted', false)
                .neq('user_id', chat.admin_id);
            
            chat.unread_count = count || 0;
        }
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function joinChat(chatId, adminId) {
    try {
        const { error } = await supabaseClient
            .from('live_chats')
            .update({ 
                admin_id: adminId,
                updated_at: new Date().toISOString()
            })
            .eq('id', chatId);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function closeChat(chatId) {
    try {
        const { error } = await supabaseClient
            .from('live_chats')
            .update({ 
                status: 'closed',
                ended_at: new Date().toISOString()
            })
            .eq('id', chatId);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserActiveChat(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('live_chats')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== نظام سجل النشاطات ==========
async function addActivity(activityData) {
    try {
        const { data, error } = await supabaseClient
            .from('activity_log')
            .insert([{
                user_id: activityData.userId,
                type: activityData.type,
                title: activityData.title,
                description: activityData.description,
                amount: activityData.amount || null,
                status: activityData.status || null,
                package_name: activityData.packageName || null,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function addProfitActivity(userId, amount, packageName) {
    return addActivity({
        userId: userId,
        type: 'profit',
        title: '💰 ربح يومي',
        description: `تم إضافة ${amount}$ أرباح يومية من ${packageName}`,
        amount: amount,
        status: 'completed',
        packageName: packageName
    });
}

async function addWithdrawalActivity(userId, amount, status) {
    let title, description;
    
    if (status === 'pending') {
        title = '💰 طلب سحب';
        description = `طلب سحب بقيمة ${amount}$ قيد المراجعة`;
    } else if (status === 'completed') {
        title = '✅ تم اكتمال السحب';
        description = `تم اكتمال طلب السحب بقيمة ${amount}$ بنجاح`;
    } else if (status === 'approved') {
        title = '✅ تمت الموافقة على السحب';
        description = `تمت الموافقة على طلب السحب بقيمة ${amount}$`;
    } else if (status === 'rejected') {
        title = '❌ رفض طلب السحب';
        description = `تم رفض طلب السحب بقيمة ${amount}$`;
    }
    
    return addActivity({
        userId: userId,
        type: 'withdrawal',
        title: title,
        description: description,
        amount: amount,
        status: status
    });
}

async function addSubscriptionActivity(userId, amount, packageName, status) {
    let title, description;
    
    if (status === 'pending') {
        title = '📦 طلب اشتراك';
        description = `طلب اشتراك في باقة ${packageName} بقيمة ${amount}$ قيد المراجعة`;
    } else if (status === 'approved') {
        title = '✅ تمت الموافقة على الاشتراك';
        description = `تمت الموافقة على اشتراكك في باقة ${packageName}`;
    } else if (status === 'rejected') {
        title = '❌ رفض طلب الاشتراك';
        description = `تم رفض طلب اشتراكك في باقة ${packageName}`;
    }
    
    return addActivity({
        userId: userId,
        type: 'subscription',
        title: title,
        description: description,
        amount: amount,
        status: status,
        packageName: packageName
    });
}

async function addLoginActivity(userId) {
    return addActivity({
        userId: userId,
        type: 'login',
        title: '🔐 تسجيل دخول',
        description: 'تم تسجيل الدخول إلى حسابك'
    });
}

async function getUserActivities(userId, limit = 50) {
    try {
        const { data, error } = await supabaseClient
            .from('activity_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserActivitiesByType(userId, type, limit = 50) {
    try {
        const { data, error } = await supabaseClient
            .from('activity_log')
            .select('*')
            .eq('user_id', userId)
            .eq('type', type)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== نظام التنبيهات العامة ==========
async function addGlobalAlert(alertData) {
    try {
        const { data, error } = await supabaseClient
            .from('global_alerts')
            .insert([{
                title: alertData.title,
                message: alertData.message,
                type: alertData.type || 'info',
                created_by: alertData.createdBy,
                expires_at: alertData.expiresAt || null,
                is_active: true,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getActiveAlerts() {
    try {
        const now = new Date().toISOString();
        
        const { data, error } = await supabaseClient
            .from('global_alerts')
            .select('*')
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${now}`)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function disableAlert(alertId) {
    try {
        const { error } = await supabaseClient
            .from('global_alerts')
            .update({ is_active: false })
            .eq('id', alertId);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteAlert(alertId) {
    try {
        const { error } = await supabaseClient
            .from('global_alerts')
            .delete()
            .eq('id', alertId);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== نظام المراهنات (محدث ومصحح) ==========

// الحصول على جميع المباريات
async function getAllMatches() {
    try {
        const { data, error } = await supabaseClient
            .from('matches')
            .select('*')
            .order('match_date', { ascending: true });
        
        if (error) throw error;
        
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('خطأ في تحميل المباريات:', error);
        return { success: false, error: error.message };
    }
}

// إضافة مباراة جديدة
async function addMatch(matchData) {
    try {
        const matchDate = new Date(matchData.match_date);
        
        const { data, error } = await supabaseClient
            .from('matches')
            .insert([{
                team1: matchData.team1,
                team2: matchData.team2,
                league: matchData.league || '',
                match_date: matchDate.toISOString(),
                status: 'upcoming'
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// إضافة مباريات تجريبية
async function addSampleMatches() {
    try {
        const now = new Date();
        
        const sampleMatches = [
            { team1: 'الأهلي', team2: 'الزمالك', league: 'الدوري المصري', hours: 2 },
            { team1: 'برشلونة', team2: 'ريال مدريد', league: 'الدوري الإسباني', hours: 5 },
            { team1: 'ليفربول', team2: 'مانشستر سيتي', league: 'الدوري الإنجليزي', hours: 8 },
            { team1: 'بايرن ميونخ', team2: 'بوروسيا دورتموند', league: 'الدوري الألماني', hours: 12 },
            { team1: 'يوفنتوس', team2: 'ميلان', league: 'الدوري الإيطالي', hours: 24 },
            { team1: 'باريس سان جيرمان', team2: 'مارسيليا', league: 'الدوري الفرنسي', hours: 30 },
            { team1: 'الهلال', team2: 'النصر', league: 'الدوري السعودي', hours: 36 },
            { team1: 'الأهلي', team2: 'الوداد', league: 'دوري أبطال إفريقيا', hours: 48 }
        ];
        
        for (const match of sampleMatches) {
            const matchDate = new Date(now.getTime() + match.hours * 60 * 60 * 1000);
            
            await supabaseClient
                .from('matches')
                .insert([{
                    team1: match.team1,
                    team2: match.team2,
                    league: match.league,
                    match_date: matchDate.toISOString(),
                    status: 'upcoming'
                }]);
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// تقديم رهان جديد
async function placeBet(betData) {
    try {
        console.log('تقديم رهان جديد:', betData);
        
        // التحقق من المباراة
        const { data: match, error: matchError } = await supabaseClient
            .from('matches')
            .select('*')
            .eq('id', betData.matchId)
            .single();
        
        if (matchError || !match) throw new Error('المباراة غير موجودة');
        
        // التحقق من وقت المباراة
        const now = new Date();
        const matchTime = new Date(match.match_date);
        const diffMinutes = (matchTime - now) / (1000 * 60);
        
        if (diffMinutes < 5) {
            throw new Error('لا يمكن الرهان قبل 5 دقائق من المباراة');
        }
        
        // التحقق من رصيد المستخدم
        const { data: user, error: userError } = await supabaseClient
            .from('users')
            .select('balance')
            .eq('id', betData.userId)
            .single();
        
        if (userError || !user) throw new Error('المستخدم غير موجود');
        
        if (user.balance < betData.amount) {
            throw new Error('الرصيد غير كافي');
        }
        
        const possibleWin = betData.amount * betData.odds;
        
        // إنشاء الرهان
        const { data: bet, error: betError } = await supabaseClient
            .from('bets')
            .insert([{
                user_id: betData.userId,
                match_id: betData.matchId,
                bet_value: betData.betValue,
                odds: betData.odds,
                amount: betData.amount,
                possible_win: possibleWin,
                status: 'pending',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (betError) {
            console.error('خطأ في إنشاء الرهان:', betError);
            throw betError;
        }
        
        // خصم المبلغ من رصيد المستخدم
        await supabaseClient
            .from('users')
            .update({
                balance: user.balance - betData.amount,
                updated_at: new Date().toISOString()
            })
            .eq('id', betData.userId);
        
        // تسجيل النشاط
        await supabaseClient
            .from('activity_log')
            .insert([{
                user_id: betData.userId,
                type: 'bet',
                title: '🎯 رهان جديد',
                description: `رهان بمبلغ ${betData.amount}$ على ${match.team1} vs ${match.team2}`,
                amount: -betData.amount,
                created_at: new Date().toISOString()
            }]);
        
        return { success: true, data: bet };
    } catch (error) {
        console.error('خطأ في تقديم الرهان:', error);
        return { success: false, error: error.message };
    }
}

// الحصول على رهانات المستخدم
async function getUserBets(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('bets')
            .select(`
                *,
                matches:match_id (*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('خطأ في جلب رهانات المستخدم:', error);
        return { success: false, error: error.message };
    }
}

// الحصول على جميع الرهانات (للمشرف) - نسخة مصححة
async function getAllBets() {
    try {
        console.log('جاري جلب جميع الرهانات...');
        
        // جلب الرهانات مع معلومات المستخدم والمباراة
        const { data, error } = await supabaseClient
            .from('bets')
            .select(`
                *,
                users:user_id (
                    id, 
                    name, 
                    email
                ),
                matches:match_id (
                    id,
                    team1, 
                    team2, 
                    league,
                    match_date,
                    status,
                    result_team1,
                    result_team2
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('خطأ في جلب الرهانات:', error);
            throw error;
        }
        
        console.log('تم جلب الرهانات بنجاح:', data?.length || 0);
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('خطأ في getAllBets:', error);
        return { success: false, error: error.message };
    }
}

// تحديث نتيجة مباراة ومعالجة الرهانات
async function updateMatchResult(matchId, resultTeam1, resultTeam2) {
    try {
        console.log('تحديث نتيجة المباراة:', matchId, resultTeam1, resultTeam2);
        
        // جلب المباراة
        const { data: match, error: matchError } = await supabaseClient
            .from('matches')
            .select('*')
            .eq('id', matchId)
            .single();
        
        if (matchError) throw matchError;
        
        // تحديث حالة المباراة
        const { error: updateError } = await supabaseClient
            .from('matches')
            .update({
                status: 'finished',
                result_team1: resultTeam1,
                result_team2: resultTeam2,
                updated_at: new Date().toISOString()
            })
            .eq('id', matchId);
        
        if (updateError) throw updateError;
        
        // جلب جميع الرهانات لهذه المباراة
        const { data: bets, error: betsError } = await supabaseClient
            .from('bets')
            .select('*, users:user_id(id, balance)')
            .eq('match_id', matchId)
            .eq('status', 'pending');
        
        if (betsError) throw betsError;
        
        console.log('عدد الرهانات للمعالجة:', bets?.length || 0);
        
        const result = `${resultTeam1}-${resultTeam2}`;
        let winner = 'X';
        if (resultTeam1 > resultTeam2) winner = '1';
        else if (resultTeam2 > resultTeam1) winner = '2';
        
        // معالجة كل رهان
        for (const bet of bets || []) {
            let betStatus = 'lost';
            let paidAmount = 0;
            
            // التحقق من الفوز
            if (bet.bet_value === winner || bet.bet_value === result) {
                betStatus = 'won';
                paidAmount = bet.amount * bet.odds;
            }
            
            // تحديث الرهان
            await supabaseClient
                .from('bets')
                .update({
                    status: betStatus,
                    paid_amount: paidAmount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', bet.id);
            
            if (betStatus === 'won' && paidAmount > 0) {
                // إضافة الأرباح للمستخدم
                const { data: user } = await supabaseClient
                    .from('users')
                    .select('balance')
                    .eq('id', bet.user_id)
                    .single();
                
                await supabaseClient
                    .from('users')
                    .update({
                        balance: (user.balance || 0) + paidAmount,
                        total_earned: (user.total_earned || 0) + paidAmount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', bet.user_id);
                
                // تسجيل النشاط
                await supabaseClient
                    .from('activity_log')
                    .insert([{
                        user_id: bet.user_id,
                        type: 'profit',
                        title: '🏆 فوز في الرهان',
                        description: `ربح ${paidAmount}$ من الرهان على المباراة`,
                        amount: paidAmount,
                        created_at: new Date().toISOString()
                    }]);
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في تحديث النتيجة:', error);
        return { success: false, error: error.message };
    }
}

// ========== التهيئة ==========
initSupabase();

// ========== تصدير الدوال ==========
window.supabaseClient = supabaseClient;
window.supabaseHelpers = {
    // المستخدمين
    registerUser,
    loginUser,
    getUserById,
    updateUser,
    getAllUsers,
    updateUserStatus,
    
    // الباقات
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    
    // طلبات الاشتراك
    createPendingPackage,
    getPendingPackages,
    approvePendingPackage,
    rejectPendingPackage,
    
    // الإحالة
    generateReferralCode,
    getReferralStats,
    
    // الاشتراكات
    getUserSubscription,
    
    // نظام المطالبة بالأرباح
    claimDailyProfit,
    getClaimStatus,
    handleDoubleClaimViolation,
    
    // السحب
    createWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    getPendingWithdrawals,
    updateWithdrawalStatus,
    
    // المعاملات
    getUserTransactions,
    getAllTransactions,
    
    // الهدايا
    sendGift,
    getUserGifts,
    claimGift,
    getAllGifts,
    
    // الإحصائيات
    getDashboardStats,
    
    // الصور
    uploadChatImage,
    getChatImage,
    
    // نظام الدردشة
    startLiveChat,
    sendChatMessage,
    getChatMessages,
    markMessagesAsRead,
    deleteChatMessage,
    getActiveChats,
    joinChat,
    closeChat,
    getUserActiveChat,
    
    // نظام سجل النشاطات
    addActivity,
    addProfitActivity,
    addWithdrawalActivity,
    addSubscriptionActivity,
    addLoginActivity,
    getUserActivities,
    getUserActivitiesByType,
    
    // نظام التنبيهات العامة
    addGlobalAlert,
    getActiveAlerts,
    disableAlert,
    deleteAlert,
    
    // نظام المراهنات (محدث)
    getAllMatches,
    addMatch,
    addSampleMatches,
    placeBet,
    getUserBets,
    getAllBets,
    updateMatchResult,
    
    // دوال الوقت المساعدة
    formatLocalTime,
    getMatchTimeRemaining,
    convertToUTC
};

console.log('✅ تم تحميل جميع دوال Supabase مع نظام المراهنات');
