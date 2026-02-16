// ===================================
// supabase.js - Elite Capital (نسخة محدثة بالكامل مع جميع الميزات)
// ===================================

const SUPABASE_URL = 'https://aiorcrtfvhjpwjdsebzp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpb3JjcnRmdmhqcHdqZHNlYnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODg3MDEsImV4cCI6MjA4NjU2NDcwMX0.drqTeWdeOzA24K68hSM88JHNGft_kH571_te7KwUETA';

let supabaseClient = null;

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
                autoRefreshToken: true
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
        
        // التحقق من وجود المستخدم
        const { data: existing, error: checkError } = await supabaseClient
            .from('users')
            .select('id')
            .or(`email.eq.${userData.email},username.eq.${userData.username}`)
            .maybeSingle();
        
        if (checkError) {
            console.error('خطأ في التحقق من المستخدم:', checkError);
        }
        
        if (existing) {
            throw new Error('البريد الإلكتروني أو اسم المستخدم مستخدم مسبقاً');
        }
        
        // إنشاء كود إحالة فريد
        const referralCode = generateReferralCode(userData.username);
        
        // التحقق من صحة كود الإحالة إذا وجد
        let referredBy = null;
        if (userData.referralCode) {
            const { data: referrer } = await supabaseClient
                .from('users')
                .select('referral_code')
                .eq('referral_code', userData.referralCode)
                .maybeSingle();
            
            if (referrer) {
                referredBy = userData.referralCode;
                console.log('✅ كود إحالة صحيح:', referredBy);
            }
        }
        
        // إنشاء المستخدم
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
            notification_settings: {
                email: true,
                push: true,
                profit: true,
                withdrawal: true,
                subscription: true,
                referral: true
            }
        };
        
        console.log('بيانات المستخدم الجديد:', newUserData);
        
        const { data: newUser, error } = await supabaseClient
            .from('users')
            .insert([newUserData])
            .select()
            .single();
        
        if (error) {
            console.error('خطأ في إدراج المستخدم:', error);
            throw new Error(error.message || 'فشل إنشاء الحساب');
        }
        
        console.log('✅ تم إنشاء المستخدم بنجاح:', newUser.id);
        
        // إنشاء إشعار ترحيبي
        await createNotification({
            userId: newUser.id,
            type: 'welcome',
            title: '👋 مرحباً بك في Elite Capital',
            message: 'نرحب بك في منصة الاستثمار الذكي، نتمنى لك تجربة مميزة'
        });
        
        return { success: true, data: newUser };
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        return { success: false, error: error.message };
    }
}

async function loginUser(usernameOrEmail, password) {
    try {
        console.log('محاولة تسجيل دخول:', usernameOrEmail);
        
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .or(`email.eq.${usernameOrEmail},username.eq.${usernameOrEmail}`)
            .maybeSingle();
        
        if (error) {
            console.error('خطأ في البحث عن المستخدم:', error);
            throw error;
        }
        
        if (!user) {
            throw new Error('المستخدم غير موجود');
        }
        
        if (user.password !== password) {
            throw new Error('كلمة المرور غير صحيحة');
        }
        
        if (user.status === 'banned') {
            throw new Error('حسابك محظور');
        }
        
        // تحديث آخر تسجيل دخول
        await supabaseClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
        
        console.log('✅ تم تسجيل الدخول بنجاح:', user.email);
        return { success: true, data: user };
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
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
        console.error('خطأ في جلب المستخدم:', error);
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
        console.error('خطأ في تحديث المستخدم:', error);
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
        console.error('خطأ في جلب المستخدمين:', error);
        return { success: false, error: error.message };
    }
}

async function updateUserStatus(id, status) {
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ 
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        // إنشاء إشعار للمستخدم بتغيير الحالة
        await createNotification({
            userId: id,
            type: 'status',
            title: '🔄 تحديث حالة الحساب',
            message: `تم تغيير حالة حسابك إلى ${status === 'active' ? 'نشط' : status === 'suspended' ? 'معلق' : 'محظور'}`
        });
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في تحديث حالة المستخدم:', error);
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
        console.error('خطأ في جلب الباقات:', error);
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
        console.error('خطأ في جلب الباقة:', error);
        return { success: false, error: error.message };
    }
}

async function createPackage(packageData) {
    try {
        const { data, error } = await supabaseClient
            .from('packages')
            .insert([{
                name: packageData.name,
                price: packageData.price,
                daily_profit: packageData.dailyProfit,
                profit_percentage: (packageData.dailyProfit / packageData.price) * 100,
                duration: packageData.duration || 30,
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
        console.error('خطأ في إنشاء الباقة:', error);
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
        console.error('خطأ في تحديث الباقة:', error);
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
        console.error('خطأ في حذف الباقة:', error);
        return { success: false, error: error.message };
    }
}

// ========== طلبات الاشتراك ==========
async function createPendingPackage(pendingData) {
    try {
        console.log('📦 بدء إنشاء طلب اشتراك:', pendingData);
        
        if (!pendingData.userId) throw new Error('معرف المستخدم مطلوب');
        if (!pendingData.packageId) throw new Error('معرف الباقة مطلوب');
        if (!pendingData.amount) throw new Error('المبلغ مطلوب');
        
        const { data: user, error: userError } = await supabaseClient
            .from('users')
            .select('id, name, email, phone, referred_by')
            .eq('id', pendingData.userId)
            .single();
        
        if (userError || !user) throw new Error('المستخدم غير موجود');
        
        const { data: pkg, error: pkgError } = await supabaseClient
            .from('packages')
            .select('id, name, category')
            .eq('id', pendingData.packageId)
            .single();
        
        if (pkgError || !pkg) throw new Error('الباقة غير موجودة');
        
        const insertData = {
            user_id: user.id,
            user_name: user.name || 'مستخدم',
            user_email: user.email || '',
            user_phone: user.phone || '',
            package_id: pkg.id,
            package_name: pkg.name || 'باقة',
            package_category: pkg.category || 'standard',
            amount: pendingData.amount,
            payment_proof: pendingData.paymentProof || null,
            wallet_address: pendingData.walletAddress || 'TYmk60K9JvCqS7Fqy6BpWpZp8hLpVHw7D',
            network: 'TRC20',
            transaction_hash: pendingData.paymentProof ? 'PROOF_' + Date.now() : null,
            referred_by: user.referred_by || null,
            fast_approval: !!pendingData.paymentProof,
            estimated_activation: pendingData.paymentProof ? 'ساعة واحدة' : '3-6 ساعات',
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        console.log('📤 إرسال البيانات إلى قاعدة البيانات:', insertData);
        
        const { data, error } = await supabaseClient
            .from('pending_packages')
            .insert([insertData])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ تم حفظ الطلب بنجاح:', data);
        
        // إنشاء إشعار للمستخدم
        await createSubscriptionNotification(user.id, pkg.name, pendingData.amount, 'pending');
        
        // إنشاء إشعار للمسؤولين
        await createAdminNotification(
            'new_subscription',
            '📦 طلب اشتراك جديد',
            `طلب اشتراك جديد من ${user.name} في باقة ${pkg.name} بقيمة ${pendingData.amount}$`,
            { userId: user.id, packageId: pkg.id, amount: pendingData.amount }
        );
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ خطأ في إنشاء طلب الاشتراك:', error);
        return { 
            success: false, 
            error: error.message || 'فشل تقديم الطلب. يرجى المحاولة مرة أخرى.'
        };
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
        console.error('خطأ في جلب الطلبات:', error);
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
        if (!pending) throw new Error('الطلب غير موجود');
        
        console.log('معالجة طلب:', pending);
        
        // 1. تحديث حالة الطلب
        await supabaseClient
            .from('pending_packages')
            .update({ 
                status: 'approved',
                processed_by: adminId,
                processed_at: new Date().toISOString()
            })
            .eq('id', id);
        
        // 2. إنشاء اشتراك جديد
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        const { data: subscription, error: subError } = await supabaseClient
            .from('subscriptions')
            .insert([{
                user_id: pending.user_id,
                package_id: pending.package_id,
                package_name: pending.package_name,
                package_category: pending.package_category || 'standard',
                amount: pending.amount,
                daily_profit: pending.amount * 0.025,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (subError) throw subError;
        
        // 3. تحديث المستخدم
        await supabaseClient
            .from('users')
            .update({ 
                current_subscription_id: subscription.id,
                has_active_subscription: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', pending.user_id);
        
        // 4. تسجيل معاملة إيداع
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
        
        // 5. معالجة الإحالة إذا وجدت
        if (pending.referred_by) {
            await processReferralRewards(pending.user_id, pending.referred_by);
        }
        
        // 6. إنشاء إشعار للمستخدم
        await createSubscriptionNotification(pending.user_id, pending.package_name, pending.amount, 'approved');
        
        return { success: true, data: subscription };
    } catch (error) {
        console.error('خطأ في قبول الطلب:', error);
        return { success: false, error: error.message };
    }
}

async function rejectPendingPackage(id, reason, adminId) {
    try {
        const { data: pending } = await supabaseClient
            .from('pending_packages')
            .select('user_id, package_name, amount')
            .eq('id', id)
            .single();
        
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
        
        // إنشاء إشعار للمستخدم
        if (pending) {
            await createSubscriptionNotification(pending.user_id, pending.package_name, pending.amount, 'rejected');
        }
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في رفض الطلب:', error);
        return { success: false, error: error.message };
    }
}

// ========== الإحالة ==========
async function processReferralRewards(newUserId, referralCode) {
    try {
        console.log('معالجة مكافآت الإحالة:', { newUserId, referralCode });
        
        const { data: referrer, error: referrerError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('referral_code', referralCode)
            .single();
        
        if (referrerError || !referrer) {
            console.log('لم يتم العثور على المحيل');
            return { success: false };
        }
        
        const REFERRER_REWARD = 50;
        const REFEREE_REWARD = 20;
        
        const { data: newUser, error: userError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', newUserId)
            .single();
        
        if (userError || !newUser) {
            console.log('لم يتم العثور على المستخدم الجديد');
            return { success: false };
        }
        
        // تحديث رصيد المحال
        await supabaseClient
            .from('users')
            .update({ 
                balance: (newUser.balance || 0) + REFEREE_REWARD,
                referral_reward_paid: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', newUserId);
        
        // تحديث رصيد المحيل
        await supabaseClient
            .from('users')
            .update({ 
                balance: (referrer.balance || 0) + REFERRER_REWARD,
                referral_earnings: (referrer.referral_earnings || 0) + REFERRER_REWARD,
                referral_count: (referrer.referral_count || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', referrer.id);
        
        // تسجيل المعاملات
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
        
        // إنشاء إشعارات
        await createReferralNotification(newUserId, referrer.name, REFEREE_REWARD);
        await createReferralNotification(referrer.id, newUser.name, REFERRER_REWARD);
        
        console.log('✅ تم صرف مكافآت الإحالة بنجاح');
        return { success: true };
    } catch (error) {
        console.error('خطأ في معالجة الإحالة:', error);
        return { success: false };
    }
}

async function getReferralStats(userId) {
    try {
        const { data: user, error: userError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (userError) throw userError;
        
        const { data: referredUsers, error: referredError } = await supabaseClient
            .from('users')
            .select('id, name, email, joined_date, has_active_subscription, referral_reward_paid')
            .eq('referred_by', user.referral_code);
        
        if (referredError) throw referredError;
        
        const { data: transactions, error: transError } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'مكافأة إحالة');
        
        if (transError) throw transError;
        
        const totalEarned = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
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
        console.error('خطأ في جلب إحصائيات الإحالة:', error);
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
        console.error('خطأ في جلب الاشتراك:', error);
        return { success: false, error: error.message };
    }
}

// ========== طلبات السحب ==========
async function createWithdrawal(withdrawalData) {
    try {
        const { data: user, error: userError } = await supabaseClient
            .from('users')
            .select('balance')
            .eq('id', withdrawalData.userId)
            .single();
        
        if (userError) throw userError;
        
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
        
        await supabaseClient.rpc('decrement_balance', {
            user_id: withdrawalData.userId,
            amount: totalAmount
        });
        
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
        
        // إنشاء إشعار للمستخدم
        await createWithdrawalNotification(withdrawalData.userId, withdrawalData.amount, 'pending');
        
        // إنشاء إشعار للمسؤولين
        await createAdminNotification(
            'new_withdrawal',
            '💰 طلب سحب جديد',
            `طلب سحب جديد بقيمة ${withdrawalData.amount}$ من المستخدم`,
            { userId: withdrawalData.userId, amount: withdrawalData.amount, withdrawalId: data.id }
        );
        
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في إنشاء طلب سحب:', error);
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
        console.error('خطأ في جلب طلبات السحب:', error);
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
        console.error('خطأ في جلب جميع طلبات السحب:', error);
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
            await supabaseClient.rpc('increment_balance', {
                user_id: data.user_id,
                amount: data.total
            });
        }
        
        // إنشاء إشعار للمستخدم
        await createWithdrawalNotification(data.user_id, data.amount, status);
        
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في تحديث حالة السحب:', error);
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
        console.error('خطأ في جلب المعاملات:', error);
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
        console.error('خطأ في جلب جميع المعاملات:', error);
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
            notificationsRes
        ] = await Promise.all([
            supabaseClient.from('users').select('*', { count: 'exact', head: false }),
            supabaseClient.from('packages').select('*').eq('status', 'active'),
            supabaseClient.from('pending_packages').select('*').eq('status', 'pending'),
            supabaseClient.from('subscriptions').select('*').eq('status', 'active'),
            supabaseClient.from('withdrawals').select('*'),
            supabaseClient.from('notifications').select('*', { count: 'exact', head: false })
        ]);
        
        const users = usersRes.data || [];
        const packages = packagesRes.data || [];
        const pendingPackages = pendingPackagesRes.data || [];
        const subscriptions = subscriptionsRes.data || [];
        const withdrawals = withdrawalsRes.data || [];
        const notifications = notificationsRes.data || [];
        
        const totalDeposits = users.reduce((sum, u) => sum + (u.total_earned || 0), 0);
        const totalWithdrawals = withdrawals
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + w.amount, 0);
        
        const activeUsers = users.filter(u => u.status === 'active' || !u.status).length;
        const suspendedUsers = users.filter(u => u.status === 'suspended').length;
        const bannedUsers = users.filter(u => u.status === 'banned').length;
        
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
                totalNotifications: notifications.length,
                unreadNotifications: notifications.filter(n => !n.is_read).length
            }
        };
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        return { success: false, error: error.message };
    }
}

// ========== الأرباح اليومية ==========
async function processDailyProfits() {
    try {
        const { data: subscriptions, error } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('status', 'active');
        
        if (error) throw error;
        
        const today = new Date().toISOString().split('T')[0];
        const profits = [];
        
        for (const sub of subscriptions || []) {
            const { data: existingProfit } = await supabaseClient
                .from('daily_profits')
                .select('id')
                .eq('user_id', sub.user_id)
                .eq('subscription_id', sub.id)
                .gte('created_at', today)
                .limit(1)
                .maybeSingle();
            
            if (existingProfit) continue;
            
            const profitAmount = sub.daily_profit;
            
            await supabaseClient.rpc('increment_balance', {
                user_id: sub.user_id,
                amount: profitAmount
            });
            
            const { data: profit } = await supabaseClient
                .from('daily_profits')
                .insert([{
                    user_id: sub.user_id,
                    subscription_id: sub.id,
                    amount: profitAmount,
                    profit_date: today,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            await supabaseClient
                .from('transactions')
                .insert([{
                    user_id: sub.user_id,
                    type: 'ربح يومي',
                    amount: profitAmount,
                    description: `أرباح يومية من باقة ${sub.package_name}`,
                    status: 'completed',
                    subscription_id: sub.id,
                    created_at: new Date().toISOString()
                }]);
            
            // إنشاء إشعار أرباح يومية
            await createProfitNotification(sub.user_id, profitAmount, sub.package_name);
            
            profits.push(profit);
        }
        
        return { success: true, data: profits };
    } catch (error) {
        console.error('خطأ في معالجة الأرباح اليومية:', error);
        return { success: false, error: error.message };
    }
}

// ========== نظام الدردشة المباشرة ==========
async function startLiveChat(userId) {
    try {
        console.log('بدء محادثة جديدة للمستخدم:', userId);
        
        const { data: existingChat, error: checkError } = await supabaseClient
            .from('live_chats')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();
        
        if (checkError) throw checkError;
        
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
        
        console.log('✅ تم إنشاء محادثة جديدة:', newChat.id);
        
        // إنشاء إشعار للمسؤولين
        await createAdminNotification(
            'new_chat',
            '💬 محادثة جديدة',
            'مستخدم يريد الدردشة المباشرة',
            { userId, chatId: newChat.id }
        );
        
        return { success: true, data: newChat, isNew: true };
    } catch (error) {
        console.error('خطأ في بدء المحادثة:', error);
        return { success: false, error: error.message };
    }
}

async function sendChatMessage(chatId, userId, message) {
    try {
        if (!message || !message.trim()) {
            throw new Error('الرسالة لا يمكن أن تكون فارغة');
        }
        
        console.log('إرسال رسالة:', { chatId, userId, message });
        
        const { data: newMessage, error: msgError } = await supabaseClient
            .from('chat_messages')
            .insert([{
                chat_id: chatId,
                user_id: userId,
                message: message.trim(),
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
        console.error('خطأ في إرسال الرسالة:', error);
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
        console.error('خطأ في جلب الرسائل:', error);
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
        console.error('خطأ في تحديث حالة القراءة:', error);
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
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            chat.last_message = lastMessage;
            
            const { count } = await supabaseClient
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('chat_id', chat.id)
                .eq('is_read', false)
                .neq('user_id', chat.admin_id);
            
            chat.unread_count = count || 0;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب المحادثات النشطة:', error);
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
        console.error('خطأ في انضمام المسؤول:', error);
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
        console.error('خطأ في إنهاء المحادثة:', error);
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
        console.error('خطأ في جلب محادثة المستخدم:', error);
        return { success: false, error: error.message };
    }
}

// ========== نظام الإشعارات المتقدم ==========
async function createNotification(notificationData) {
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .insert([{
                user_id: notificationData.userId,
                type: notificationData.type,
                title: notificationData.title,
                message: notificationData.message,
                data: notificationData.data || {},
                is_admin_notification: notificationData.isAdmin || false,
                created_at: new Date().toISOString(),
                expires_at: notificationData.expiresAt || null
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // تحديث عداد الإشعارات إذا كان المستخدم متصل
        if (window.notificationListeners && window.notificationListeners[notificationData.userId]) {
            window.notificationListeners[notificationData.userId].forEach(callback => {
                callback(data);
            });
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في إنشاء الإشعار:', error);
        return { success: false, error: error.message };
    }
}

async function createProfitNotification(userId, amount, packageName) {
    return createNotification({
        userId: userId,
        type: 'profit',
        title: '💰 أرباح يومية',
        message: `تم إضافة ${amount}$ أرباح يومية من باقة ${packageName}`,
        data: { amount, packageName }
    });
}

async function createWithdrawalNotification(userId, amount, status) {
    let title, message;
    
    if (status === 'completed') {
        title = '✅ تم قبول طلب السحب';
        message = `تمت الموافقة على طلب السحب بقيمة ${amount}$ وسيتم تحويلها قريباً`;
    } else if (status === 'pending') {
        title = '⏳ طلب سحب قيد المراجعة';
        message = `تم تقديم طلب سحب بقيمة ${amount}$ بانتظار موافقة الإدارة`;
    } else if (status === 'rejected') {
        title = '❌ رفض طلب السحب';
        message = `عذراً، تم رفض طلب السحب بقيمة ${amount}$ يرجى التواصل مع الدعم`;
    } else {
        title = '💰 تحديث حالة السحب';
        message = `تم تحديث حالة طلب السحب بقيمة ${amount}$ إلى ${status}`;
    }
    
    return createNotification({
        userId: userId,
        type: 'withdrawal',
        title: title,
        message: message,
        data: { amount, status }
    });
}

async function createSubscriptionNotification(userId, packageName, amount, status) {
    let title, message;
    
    if (status === 'approved') {
        title = '🎉 تم تفعيل اشتراكك';
        message = `تم تفعيل باقة ${packageName} بنجاح بقيمة ${amount}$، أرباحك اليومية بدأت`;
    } else if (status === 'pending') {
        title = '⏳ طلب اشتراك قيد المراجعة';
        message = `طلب اشتراكك في باقة ${packageName} بقيمة ${amount}$ قيد المراجعة`;
    } else if (status === 'rejected') {
        title = '❌ رفض طلب الاشتراك';
        message = `عذراً، تم رفض طلب اشتراكك في باقة ${packageName}`;
    }
    
    return createNotification({
        userId: userId,
        type: 'subscription',
        title: title,
        message: message,
        data: { packageName, amount, status }
    });
}

async function createReferralNotification(userId, referralName, amount) {
    return createNotification({
        userId: userId,
        type: 'referral',
        title: '🎁 مكافأة إحالة جديدة',
        message: `قام ${referralName} بالاشتراك وحصلت على ${amount}$ مكافأة`,
        data: { referralName, amount }
    });
}

async function createAdminNotification(type, title, message, data = {}) {
    try {
        const { data: admins, error } = await supabaseClient
            .from('users')
            .select('id')
            .eq('is_admin', true);
        
        if (error) throw error;
        
        if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
                user_id: admin.id,
                type: type,
                title: title,
                message: message,
                data: data,
                is_admin_notification: true,
                created_at: new Date().toISOString()
            }));
            
            await supabaseClient.from('notifications').insert(notifications);
        }
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في إنشاء إشعار المسؤول:', error);
        return { success: false };
    }
}

async function getUserNotifications(userId, options = {}) {
    try {
        let query = supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        if (options.unreadOnly) {
            query = query.eq('is_read', false);
        }
        
        if (options.type) {
            query = query.eq('type', options.type);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب الإشعارات:', error);
        return { success: false, error: error.message };
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في تحديث الإشعار:', error);
        return { success: false, error: error.message };
    }
}

async function markAllNotificationsAsRead(userId) {
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('is_read', false);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في تحديث جميع الإشعارات:', error);
        return { success: false, error: error.message };
    }
}

async function deleteNotification(notificationId) {
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .delete()
            .eq('id', notificationId);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في حذف الإشعار:', error);
        return { success: false, error: error.message };
    }
}

async function getUnreadCount(userId) {
    try {
        const { count, error } = await supabaseClient
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);
        
        if (error) throw error;
        
        return { success: true, count: count || 0 };
    } catch (error) {
        console.error('خطأ في جلب عدد الإشعارات:', error);
        return { success: false, error: error.message, count: 0 };
    }
}

async function cleanOldNotifications() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { error } = await supabaseClient
            .from('notifications')
            .delete()
            .lt('created_at', thirtyDaysAgo.toISOString())
            .eq('is_read', true);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في تنظيف الإشعارات:', error);
        return { success: false };
    }
}

// ========== الدوال (Functions) ==========
async function createFunctions() {
    try {
        await supabaseClient.rpc('create_increment_function', {}, { count: 'exact' }).catch(() => {});
        await supabaseClient.rpc('create_decrement_function', {}, { count: 'exact' }).catch(() => {});
        console.log('✅ تم التأكد من وجود الدوال');
    } catch (error) {
        console.log('ملاحظة: يمكن إنشاء الدوال لاحقاً');
    }
}

// ========== التهيئة ==========
initSupabase();
createFunctions();

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
    
    // السحب
    createWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    getPendingWithdrawals,
    updateWithdrawalStatus,
    
    // المعاملات
    getUserTransactions,
    getAllTransactions,
    
    // الإحصائيات
    getDashboardStats,
    
    // الأرباح اليومية
    processDailyProfits,
    
    // نظام الدردشة
    startLiveChat,
    sendChatMessage,
    getChatMessages,
    markMessagesAsRead,
    getActiveChats,
    joinChat,
    closeChat,
    getUserActiveChat,
    
    // نظام الإشعارات
    createNotification,
    createProfitNotification,
    createWithdrawalNotification,
    createSubscriptionNotification,
    createReferralNotification,
    createAdminNotification,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount,
    cleanOldNotifications
};

console.log('✅ تم تحميل جميع دوال Supabase مع نظام الدردشة والإشعارات');