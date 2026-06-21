// ============================================
// إعدادات Supabase
// ============================================
const SUPABASE_URL = 'https://nrpqukhxfistjizcorpp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycHF1a2h4ZmlzdGppemNvcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzkxNjgsImV4cCI6MjA5Njg1NTE2OH0.64HaEIKhJM-W4WEVrsOEuix1fKUswSHVyMKxyev9nGA';

// ============================================
// المتغيرات العامة
// ============================================
const TRC20_WALLET = "TFScDRAPHVfPdrbnvVmro2pmTkbAgCgNz6";
let currentUser = null;
let countdownInterval = null;
let referralBonusAmount = 25;
let globalAlert = { text: '', link: '', buttonText: '', bgColor: '#fef3c7', enabled: false };
let plans = {};

// ============================================
// دوال Supabase الأساسية
// ============================================
async function supabaseRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ خطأ Supabase:', errorText);
            throw new Error(`خطأ ${response.status}`);
        }
        if (method === 'DELETE') return { success: true };
        return await response.json();
    } catch (error) {
        console.error('❌ Supabase Error:', error);
        throw error;
    }
}

// ============================================
// تحميل البيانات من Supabase
// ============================================
async function loadAllData() {
    try {
        // تحميل الباقات
        const plansData = await supabaseRequest('plans');
        if (plansData && plansData.length > 0) {
            plans = {};
            plansData.forEach(p => {
                plans[p.id] = {
                    id: p.id,
                    name: p.name,
                    price: parseFloat(p.price),
                    dailyProfit: parseFloat(p.dailyprofit),
                    icon: p.icon || 'fas fa-star',
                    color: p.color || '#667eea',
                    withdrawTax: 0
                };
            });
            console.log('✅ تم تحميل الباقات:', Object.keys(plans).length);
        }

        // تحميل الضرائب
        const taxes = await supabaseRequest('plan_taxes');
        if (taxes && taxes.length > 0) {
            taxes.forEach(t => {
                if (plans[t.plan_id]) {
                    plans[t.plan_id].withdrawTax = parseFloat(t.tax_percent) || 0;
                }
            });
            console.log('✅ تم تحميل الضرائب');
        }

        // تحميل الإعدادات
        const settings = await supabaseRequest('settings');
        if (settings && settings.length > 0) {
            const s = settings[0];
            referralBonusAmount = parseFloat(s.referral_bonus) || 25;
            globalAlert = {
                text: s.alert_text || '',
                link: s.alert_link || '',
                buttonText: s.alert_button_text || '',
                bgColor: s.alert_bg_color || '#fef3c7',
                enabled: s.alert_enabled || false
            };
            console.log('✅ تم تحميل الإعدادات');
        }

        // تحميل المستخدمين
        const users = await supabaseRequest('users');
        if (users && users.length > 0) {
            const usersObj = {};
            users.forEach(u => {
                usersObj[u.username] = u;
            });
            localStorage.setItem('investUsers', JSON.stringify(usersObj));
            console.log('✅ تم تحميل المستخدمين:', Object.keys(usersObj).length);
        }

        return true;
    } catch (error) {
        console.error('❌ فشل تحميل البيانات:', error);
        return false;
    }
}

// ============================================
// دوال الحفظ في Supabase
// ============================================
async function saveUser(user) {
    try {
        if (!user || !user.username) {
            console.error('بيانات المستخدم غير صالحة');
            return false;
        }

        const userData = {
            id: user.id || user.username,
            username: user.username,
            fullname: user.fullname || '',
            email: user.email || '',
            password: user.password || '',
            role: user.role || 'user',
            balance: parseFloat(user.balance) || 0,
            totalprofit: parseFloat(user.totalProfit) || 0,
            totalinvested: parseFloat(user.totalInvested) || 0,
            activeplan: user.activePlan || null,
            lastprofitclaim: user.lastProfitClaim || 0,
            subscriptiondate: user.subscriptionDate || null,
            subscriptionhistory: JSON.stringify(user.subscriptionHistory || []),
            depositrequests: JSON.stringify(user.depositRequests || []),
            withdrawrequests: JSON.stringify(user.withdrawRequests || []),
            referralcode: user.referralCode || '',
            referredby: user.referredBy || null,
            referralbonus: parseFloat(user.referralBonus) || 0,
            referredusers: JSON.stringify(user.referredUsers || []),
            referralbonusgiven: user.referralBonusGiven || false,
            restrictwithdraw: user.restrictWithdraw || false,
            restrictprofit: user.restrictProfit || false,
            createdat: user.createdAt || Date.now(),
            transferhistory: JSON.stringify(user.transferHistory || [])
        };

        // التحقق من وجود المستخدم
        const existing = await supabaseRequest(`users?username=eq.${user.username}`);
        
        if (existing && existing.length > 0) {
            await supabaseRequest(`users?username=eq.${user.username}`, 'PATCH', userData);
            console.log(`✅ تم تحديث المستخدم ${user.username}`);
        } else {
            await supabaseRequest('users', 'POST', userData);
            console.log(`✅ تم إدراج المستخدم ${user.username}`);
        }
        return true;
    } catch (error) {
        console.error('❌ فشل حفظ المستخدم:', error);
        return false;
    }
}

async function saveUsers(users) {
    localStorage.setItem('investUsers', JSON.stringify(users));
    for (let [username, user] of Object.entries(users)) {
        await saveUser(user);
    }
    console.log('✅ تم حفظ جميع المستخدمين');
}

async function getUsers() {
    const users = localStorage.getItem('investUsers');
    if (users) {
        try {
            return JSON.parse(users);
        } catch (e) {}
    }
    // تحميل من Supabase
    const data = await supabaseRequest('users');
    if (data && data.length > 0) {
        const usersObj = {};
        data.forEach(u => {
            usersObj[u.username] = u;
        });
        localStorage.setItem('investUsers', JSON.stringify(usersObj));
        return usersObj;
    }
    return {};
}

function getCurrentUserFromLocal() {
    const session = localStorage.getItem('currentSession');
    if (!session) return null;
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    return users[session] || null;
}

async function setCurrentUser(username) {
    if (username) {
        localStorage.setItem('currentSession', username);
        const users = await getUsers();
        currentUser = users[username] || null;
    } else {
        localStorage.removeItem('currentSession');
        currentUser = null;
    }
}

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ============================================
// دوال الواجهة
// ============================================
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const messageEl = toast.querySelector('span');
    if (messageEl) messageEl.innerText = msg;
    toast.style.display = 'flex';
    toast.style.background = isError ? '#ef4444' : '#10b981';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.style.display = 'none', 3000);
}

function validateEnglish(input) {
    const errorEl = document.getElementById('usernameError');
    const englishRegex = /^[a-zA-Z0-9_]*$/;
    if (!englishRegex.test(input.value) && input.value.length > 0) {
        errorEl.style.display = 'block';
        input.style.borderColor = '#ef4444';
    } else {
        errorEl.style.display = 'none';
        input.style.borderColor = '#e2e8f0';
    }
    return englishRegex.test(input.value);
}

// ============================================
// واجهة المصادقة
// ============================================
function initAuth() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            const form = document.getElementById(`${tabName}Form`);
            if (form) form.classList.add('active');
        });
    });

    // ===== تسجيل الدخول =====
    document.getElementById('doLogin').addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            showToast('الرجاء إدخال اسم المستخدم وكلمة المرور', true);
            return;
        }

        try {
            const users = await getUsers();
            const user = users[username];
            
            if (user && user.password === password) {
                await setCurrentUser(username);
                showToast(`مرحباً ${user.fullname || username}`);
                loadMainApp();
            } else {
                showToast('بيانات الدخول غير صحيحة', true);
            }
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            showToast('خطأ في الاتصال بقاعدة البيانات', true);
        }
    });

    // ===== إنشاء حساب جديد =====
    document.getElementById('doRegister').addEventListener('click', async () => {
        const fullname = document.getElementById('regFullname').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const referralCode = document.getElementById('regReferralCode').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirmPassword').value;

        // التحقق من الحقول
        if (!fullname || !username || !email || !password) {
            return showToast('⚠️ املأ جميع الحقول', true);
        }
        if (password !== confirm) {
            return showToast('⚠️ كلمة المرور غير متطابقة', true);
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return showToast('⚠️ اسم المستخدم يجب أن يكون إنجليزي فقط', true);
        }
        if (password.length < 6) {
            return showToast('⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل', true);
        }

        try {
            // جلب المستخدمين الحاليين
            const users = await getUsers();
            
            // التحقق من وجود المستخدم
            if (users[username]) {
                return showToast('⚠️ اسم المستخدم موجود بالفعل', true);
            }

            // إنشاء المستخدم الجديد
            const newUser = {
                id: 'user_' + Date.now(),
                fullname: fullname,
                username: username,
                email: email,
                password: password,
                role: 'user',
                balance: 0,
                totalProfit: 0,
                totalInvested: 0,
                activePlan: null,
                lastProfitClaim: 0,
                subscriptionDate: null,
                subscriptionHistory: [],
                depositRequests: [],
                withdrawRequests: [],
                referralCode: generateReferralCode(),
                referredBy: null,
                referralBonus: 0,
                referredUsers: [],
                referralBonusGiven: false,
                restrictWithdraw: false,
                restrictProfit: false,
                createdAt: Date.now(),
                transferHistory: []
            };

            // إضافة المستخدم
            users[username] = newUser;
            
            // حفظ في localStorage و Supabase
            await saveUsers(users);
            
            // معالجة كود الإحالة
            if (referralCode) {
                await processReferral(username, referralCode);
            }
            
            // تسجيل الدخول
            await setCurrentUser(username);
            
            showToast(`✅ مرحباً ${fullname}! تم إنشاء حسابك بنجاح`);
            
            // تحميل التطبيق
            setTimeout(() => {
                loadMainApp();
            }, 500);

        } catch (error) {
            console.error('❌ خطأ في إنشاء الحساب:', error);
            showToast('❌ فشل إنشاء الحساب. حاول مرة أخرى', true);
        }
    });
}

// ============================================
// دوال الإحالة
// ============================================
async function processReferral(newUsername, referralCode) {
    try {
        const users = await getUsers();
        let referrer = null;
        for (let u of Object.values(users)) {
            if (u.referralCode === referralCode && u.username !== newUsername) {
                referrer = u;
                break;
            }
        }
        if (referrer) {
            users[newUsername].referredBy = referrer.username;
            if (!referrer.referredUsers) referrer.referredUsers = [];
            if (!referrer.referredUsers.includes(newUsername)) {
                referrer.referredUsers.push(newUsername);
            }
            await saveUsers(users);
        }
    } catch (error) {
        console.error('خطأ في معالجة الإحالة:', error);
    }
}

// ============================================
// دوال التطبيق الرئيسية
// ============================================
function loadMainApp() {
    currentUser = getCurrentUserFromLocal();
    if (!currentUser) {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('userPages').style.display = 'none';
        document.getElementById('adminPage').classList.remove('active');
        document.getElementById('bottomNav').style.display = 'none';
        return;
    }
    
    document.getElementById('loginPage').classList.remove('active');
    
    if (currentUser.role === 'admin') {
        document.getElementById('userPages').style.display = 'none';
        document.getElementById('adminPage').classList.add('active');
        document.getElementById('bottomNav').style.display = 'none';
        loadAdminPanel();
    } else {
        document.getElementById('userPages').style.display = 'block';
        document.getElementById('adminPage').classList.remove('active');
        document.getElementById('bottomNav').style.display = 'flex';
        loadUserPanel();
        document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active'));
        const homePage = document.getElementById('homePage');
        if (homePage) homePage.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navHome = document.querySelector('.nav-item[data-page="home"]');
        if (navHome) navHome.classList.add('active');
        showGlobalAlert();
        checkUserRestrictions();
    }
}

// ============================================
// دوال المستخدم (يجب إكمالها)
// ============================================
function loadUserPanel() {
    // ... دوال المستخدم
    updateUserUI();
    renderPlans();
    updateSubscriptionPage();
    updateProfitPage();
    updateAccountPage();
    updateDepositPage();
    updateWithdrawPage();
    updateTransferPage();
    // ... باقي الدوال
}

function loadAdminPanel() {
    // ... دوال الأدمن
}

// ============================================
// دوال مساعدة (يجب إكمالها)
// ============================================
function showGlobalAlert() {
    // ... 
}

function checkUserRestrictions() {
    // ...
}

function updateUserUI() {
    // ...
}

function renderPlans() {
    // ...
}

function updateSubscriptionPage() {
    // ...
}

function updateProfitPage() {
    // ...
}

function updateAccountPage() {
    // ...
}

function updateDepositPage() {
    // ...
}

function updateWithdrawPage() {
    // ...
}

function updateTransferPage() {
    // ...
}

// ============================================
// تشغيل التطبيق
// ============================================
async function initApp() {
    try {
        await loadAllData();
        console.log('✅ تم تهيئة التطبيق بنجاح');

        const session = localStorage.getItem('currentSession');
        if (session) {
            const users = await getUsers();
            currentUser = users[session] || null;
        }

        initAuth();
        
        if (currentUser) {
            loadMainApp();
        } else {
            document.getElementById('loginPage').classList.add('active');
            document.getElementById('userPages').style.display = 'none';
            document.getElementById('adminPage').classList.remove('active');
            document.getElementById('bottomNav').style.display = 'none';
        }
    } catch (error) {
        console.error('❌ فشل تهيئة التطبيق:', error);
        document.getElementById('loginPage').classList.add('active');
    }
}

// بدء التطبيق
initApp();

// تصدير الدوال للاستخدام في Console
window.saveUser = saveUser;
window.saveUsers = saveUsers;
window.getUsers = getUsers;
window.testSave = async function() {
    const testUser = {
        id: 'test_' + Date.now(),
        username: 'test_' + Date.now().toString().slice(-6),
        fullname: 'مستخدم اختبار',
        email: 'test@test.com',
        password: '123456',
        role: 'user',
        balance: 0,
        totalProfit: 0,
        totalInvested: 0,
        activePlan: null,
        lastProfitClaim: 0,
        subscriptionDate: null,
        subscriptionHistory: [],
        depositRequests: [],
        withdrawRequests: [],
        referralCode: 'TEST' + Date.now().toString().slice(-6),
        referredBy: null,
        referralBonus: 0,
        referredUsers: [],
        referralBonusGiven: false,
        restrictWithdraw: false,
        restrictProfit: false,
        createdAt: Date.now(),
        transferHistory: []
    };
    const result = await saveUser(testUser);
    console.log('✅ نتيجة الحفظ:', result ? 'نجاح' : 'فشل');
    return result;
};
