// ========== إعدادات Supabase ==========
const SUPABASE_URL = 'https://nrpqukhxfistjizcorpp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycHF1a2h4ZmlzdGppemNvcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzkxNjgsImV4cCI6MjA5Njg1NTE2OH0.64HaEIKhJM-W4WEVrsOEuix1fKUswSHVyMKxyev9nGA';

// ========== دوال Supabase ==========
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
            const error = await response.json();
            throw new Error(error.message || 'حدث خطأ في الاتصال');
        }
        return await response.json();
    } catch (error) {
        console.error('Supabase Error:', error);
        throw error;
    }
}

// الباقات الافتراضية
let plans = {
    vip1: { id: 'vip1', name: 'VIP 1', price: 25, dailyProfit: 2, icon: 'fas fa-star', color: '#ecc94b', withdrawTax: 0 },
    vip2: { id: 'vip2', name: 'VIP 2', price: 50, dailyProfit: 4.5, icon: 'fas fa-gem', color: '#9f7aea', withdrawTax: 0 },
    vip3: { id: 'vip3', name: 'VIP 3', price: 100, dailyProfit: 10, icon: 'fas fa-crown', color: '#ed64a6', withdrawTax: 0 },
    vip4: { id: 'vip4', name: 'VIP 4', price: 200, dailyProfit: 15, icon: 'fas fa-star-of-life', color: '#fbbf24', withdrawTax: 0 }
};

const TRC20_WALLET = "TFScDRAPHVfPdrbnvVmro2pmTkbAgCgNz6";
let currentUser = null;
let countdownInterval = null;

// إعدادات النظام
let referralBonusAmount = 25;
let globalAlert = { text: '', link: '', buttonText: '', bgColor: '#fef3c7', enabled: false };

// ========== تحميل البيانات من Supabase ==========
async function loadAllData() {
    try {
        console.log('🔄 Loading data from Supabase...');
        
        // تحميل المستخدمين
        const users = await supabaseRequest('users');
        if (users && users.length > 0) {
            const usersObj = {};
            users.forEach(u => {
                usersObj[u.username] = u;
            });
            localStorage.setItem('investUsers', JSON.stringify(usersObj));
            console.log('✅ Users loaded:', Object.keys(usersObj).length);
        } else {
            console.log('⚠️ No users in Supabase, creating default...');
            await createDefaultUsers();
        }
        
        // تحميل الباقات
        const plansData = await supabaseRequest('plans');
        if (plansData && plansData.length > 0) {
            const plansObj = {};
            plansData.forEach(p => {
                plansObj[p.id] = p;
            });
            plans = plansObj;
            localStorage.setItem('plansSettings', JSON.stringify(plans));
            console.log('✅ Plans loaded:', Object.keys(plansObj).length);
        } else {
            console.log('⚠️ No plans in Supabase, creating default...');
            await createDefaultPlans();
        }
        
        // تحميل الإعدادات
        const settings = await supabaseRequest('settings');
        if (settings && settings.length > 0) {
            const s = settings[0];
            referralBonusAmount = s.referral_bonus || 25;
            globalAlert = {
                text: s.alert_text || '',
                link: s.alert_link || '',
                buttonText: s.alert_button_text || '',
                bgColor: s.alert_bg_color || '#fef3c7',
                enabled: s.alert_enabled || false
            };
            localStorage.setItem('systemSettings', JSON.stringify({
                referralBonusAmount: referralBonusAmount,
                globalAlert: globalAlert
            }));
            console.log('✅ Settings loaded');
        } else {
            console.log('⚠️ No settings in Supabase, creating default...');
            await createDefaultSettings();
        }
        
        // تحميل ضرائب الباقات
        const taxes = await supabaseRequest('plan_taxes');
        if (taxes && taxes.length > 0) {
            taxes.forEach(t => {
                if (plans[t.plan_id]) {
                    plans[t.plan_id].withdrawTax = t.tax_percent || 0;
                }
            });
            console.log('✅ Taxes loaded');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error loading data from Supabase:', error);
        loadLocalData();
        return false;
    }
}

// ========== إنشاء البيانات الافتراضية ==========
async function createDefaultUsers() {
    const defaultUsers = {
        admin: { 
            id: 'admin', fullname: 'مدير النظام', username: 'admin', email: 'admin@finzo.com', 
            password: '123456', role: 'admin', balance: 0, totalProfit: 0, totalInvested: 0, 
            activePlan: null, lastProfitClaim: 0, subscriptionDate: null, subscriptionHistory: [], 
            depositRequests: [], withdrawRequests: [], referralCode: 'ADMIN123', 
            referredBy: null, referralBonus: 0, referredUsers: [], referralBonusGiven: false,
            restrictWithdraw: false, restrictProfit: false, createdAt: Date.now(), transferHistory: []
        }
    };
    localStorage.setItem('investUsers', JSON.stringify(defaultUsers));
    try {
        await saveAllUsersToSupabase(defaultUsers);
    } catch (e) {
        console.log('Could not save users to Supabase, using local only');
    }
}

async function createDefaultPlans() {
    localStorage.setItem('plansSettings', JSON.stringify(plans));
    try {
        await savePlansToSupabase();
    } catch (e) {
        console.log('Could not save plans to Supabase, using local only');
    }
}

async function createDefaultSettings() {
    const settings = {
        id: 1,
        referral_bonus: 25,
        alert_text: '',
        alert_link: '',
        alert_button_text: '',
        alert_bg_color: '#fef3c7',
        alert_enabled: false
    };
    localStorage.setItem('systemSettings', JSON.stringify({
        referralBonusAmount: 25,
        globalAlert: { text: '', link: '', buttonText: '', bgColor: '#fef3c7', enabled: false }
    }));
    try {
        await supabaseRequest('settings', 'POST', settings);
    } catch (e) {
        console.log('Could not save settings to Supabase, using local only');
    }
}

function loadLocalData() {
    console.log('📂 Loading local data...');
    loadSettings();
    loadPlans();
    loadLocalUsers();
}

function loadLocalUsers() {
    const users = localStorage.getItem('investUsers');
    if (users) {
        const parsed = JSON.parse(users);
        if (Object.keys(parsed).length > 0) {
            return parsed;
        }
    }
    const defaultUsers = {
        admin: { 
            id: 'admin', fullname: 'مدير النظام', username: 'admin', email: 'admin@finzo.com', 
            password: '123456', role: 'admin', balance: 0, totalProfit: 0, totalInvested: 0, 
            activePlan: null, lastProfitClaim: 0, subscriptionDate: null, subscriptionHistory: [], 
            depositRequests: [], withdrawRequests: [], referralCode: 'ADMIN123', 
            referredBy: null, referralBonus: 0, referredUsers: [], referralBonusGiven: false,
            restrictWithdraw: false, restrictProfit: false, createdAt: Date.now(), transferHistory: []
        }
    };
    localStorage.setItem('investUsers', JSON.stringify(defaultUsers));
}

// ========== حفظ البيانات إلى Supabase ==========
async function saveUserToSupabase(user) {
    try {
        console.log('📤 Saving user to Supabase:', user.username);
        // محاولة التحديث أولاً
        const result = await supabaseRequest(`users?username=eq.${user.username}`, 'PATCH', user);
        console.log('✅ User updated in Supabase:', user.username);
        return true;
    } catch (error) {
        try {
            // إذا فشل التحديث، حاول الإضافة
            await supabaseRequest('users', 'POST', user);
            console.log('✅ User created in Supabase:', user.username);
            return true;
        } catch (err) {
            console.error('❌ Error saving user to Supabase:', err);
            // حفظ محلياً فقط
            return false;
        }
    }
}

async function saveAllUsersToSupabase(users) {
    try {
        console.log('📤 Saving all users to Supabase...');
        for (let [username, user] of Object.entries(users)) {
            try {
                await supabaseRequest(`users?username=eq.${username}`, 'PATCH', user);
            } catch {
                await supabaseRequest('users', 'POST', user);
            }
        }
        console.log('✅ All users saved to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving users to Supabase:', error);
        return false;
    }
}

async function savePlansToSupabase() {
    try {
        console.log('📤 Saving plans to Supabase...');
        for (let [key, plan] of Object.entries(plans)) {
            try {
                await supabaseRequest(`plans?id=eq.${key}`, 'PATCH', plan);
            } catch {
                await supabaseRequest('plans', 'POST', plan);
            }
        }
        console.log('✅ Plans saved to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving plans to Supabase:', error);
        return false;
    }
}

// ========== دوال التخزين المحلي ==========
function loadSettings() {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        referralBonusAmount = settings.referralBonusAmount || 25;
        globalAlert = settings.globalAlert || { text: '', link: '', buttonText: '', bgColor: '#fef3c7', enabled: false };
    }
    for (let key of Object.keys(plans)) {
        const savedTax = localStorage.getItem(`tax_${key}`);
        if (savedTax !== null) plans[key].withdrawTax = parseFloat(savedTax);
    }
}

function saveSettings() {
    localStorage.setItem('systemSettings', JSON.stringify({
        referralBonusAmount: referralBonusAmount,
        globalAlert: globalAlert
    }));
    // محاولة حفظ في Supabase
    try {
        const settings = {
            id: 1,
            referral_bonus: referralBonusAmount,
            alert_text: globalAlert.text || '',
            alert_link: globalAlert.link || '',
            alert_button_text: globalAlert.buttonText || '',
            alert_bg_color: globalAlert.bgColor || '#fef3c7',
            alert_enabled: globalAlert.enabled || false
        };
        supabaseRequest('settings?id=eq.1', 'PATCH', settings).catch(() => {
            supabaseRequest('settings', 'POST', settings);
        });
    } catch (e) {}
}

function loadPlans() {
    const saved = localStorage.getItem('plansSettings');
    if (saved) {
        const savedPlans = JSON.parse(saved);
        for (let [key, plan] of Object.entries(savedPlans)) {
            if (plans[key]) {
                plan.withdrawTax = plans[key].withdrawTax || 0;
            }
            plans[key] = plan;
        }
    }
}

function savePlansSettings() {
    localStorage.setItem('plansSettings', JSON.stringify(plans));
    savePlansToSupabase();
}

function savePlanTax(planKey) {
    localStorage.setItem(`tax_${planKey}`, plans[planKey].withdrawTax);
    try {
        const data = { plan_id: planKey, tax_percent: plans[planKey].withdrawTax };
        supabaseRequest(`plan_taxes?plan_id=eq.${planKey}`, 'PATCH', data).catch(() => {
            supabaseRequest('plan_taxes', 'POST', data);
        });
    } catch (e) {}
}

// ========== دوال المستخدمين ==========
function loadUsers() {
    const users = localStorage.getItem('investUsers');
    if (users) {
        const parsed = JSON.parse(users);
        if (Object.keys(parsed).length > 0) {
            return parsed;
        }
    }
    const defaultUsers = {
        admin: { 
            id: 'admin', fullname: 'مدير النظام', username: 'admin', email: 'admin@finzo.com', 
            password: '123456', role: 'admin', balance: 0, totalProfit: 0, totalInvested: 0, 
            activePlan: null, lastProfitClaim: 0, subscriptionDate: null, subscriptionHistory: [], 
            depositRequests: [], withdrawRequests: [], referralCode: 'ADMIN123', 
            referredBy: null, referralBonus: 0, referredUsers: [], referralBonusGiven: false,
            restrictWithdraw: false, restrictProfit: false, createdAt: Date.now(), transferHistory: []
        }
    };
    localStorage.setItem('investUsers', JSON.stringify(defaultUsers));
    return defaultUsers;
}

function saveUsers(users) {
    localStorage.setItem('investUsers', JSON.stringify(users));
    saveAllUsersToSupabase(users);
}

function saveUser(user) {
    const users = loadUsers();
    users[user.username] = user;
    localStorage.setItem('investUsers', JSON.stringify(users));
    saveUserToSupabase(user);
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.querySelector('span').innerText = msg;
    toast.style.display = 'flex';
    toast.style.background = isError ? '#ef4444' : '#10b981';
    setTimeout(() => toast.style.display = 'none', 3000);
}

function generateReferralCode() { 
    return Math.random().toString(36).substring(2, 10).toUpperCase(); 
}

function getCurrentUser() {
    const session = localStorage.getItem('currentSession');
    if (!session) return null;
    const users = loadUsers();
    return users[session] || null;
}

function setCurrentUser(username) { 
    if (username) localStorage.setItem('currentSession', username); 
    else localStorage.removeItem('currentSession'); 
    currentUser = getCurrentUser(); 
}

function validateEnglish(input) {
    const errorEl = document.getElementById('usernameError');
    const englishRegex = /^[a-zA-Z0-9_]*$/;
    if (!englishRegex.test(input.value) && input.value.length > 0) {
        if (errorEl) errorEl.style.display = 'block';
        input.style.borderColor = '#ef4444';
    } else {
        if (errorEl) errorEl.style.display = 'none';
        input.style.borderColor = '#e2e8f0';
    }
    return englishRegex.test(input.value);
}

function processReferral(newUsername, referralCode) {
    if (!referralCode) return;
    const users = loadUsers();
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
        saveUsers(users);
    }
}

function checkAndGiveReferralBonus(username) {
    const users = loadUsers();
    const user = users[username];
    if (!user || user.referralBonusGiven) return;
    if (user.referredBy) {
        const referrer = users[user.referredBy];
        if (referrer && !referrer.referralBonusGivenFor?.includes(username)) {
            referrer.balance += referralBonusAmount;
            referrer.referralBonus = (referrer.referralBonus || 0) + referralBonusAmount;
            if (!referrer.referralBonusGivenFor) referrer.referralBonusGivenFor = [];
            referrer.referralBonusGivenFor.push(username);
            saveUsers(users);
            showToast(`مبروك! حصلت على ${referralBonusAmount}$ من مكافأة الإحالة`);
        }
    }
    user.referralBonusGiven = true;
    saveUsers(users);
}

// ========== التنبيه العالمي ==========
function showGlobalAlert() {
    const alertDiv = document.getElementById('globalAlert');
    if (!alertDiv) return;
    if (globalAlert.enabled && globalAlert.text && globalAlert.text.trim() !== '') {
        document.getElementById('alertMessage').innerHTML = globalAlert.text;
        alertDiv.style.background = globalAlert.bgColor;
        alertDiv.style.display = 'flex';
        const btn = document.getElementById('alertButton');
        if (globalAlert.link && globalAlert.buttonText) {
            btn.style.display = 'inline-block';
            btn.href = globalAlert.link;
            btn.textContent = globalAlert.buttonText;
        } else {
            btn.style.display = 'none';
        }
    } else {
        alertDiv.style.display = 'none';
    }
}

window.closeGlobalAlert = function() {
    document.getElementById('globalAlert').style.display = 'none';
};

function checkUserRestrictions() {
    if (!currentUser) return;
    const alertDiv = document.getElementById('restrictionAlert');
    if (!alertDiv) return;
    const messageEl = document.getElementById('restrictionMessage');
    let messages = [];
    if (currentUser.restrictWithdraw) messages.push('🚫 السحب مقيد حالياً');
    if (currentUser.restrictProfit) messages.push('⛔ جني الأرباح مقيد حالياً');
    if (messages.length > 0) {
        alertDiv.style.display = 'block';
        messageEl.innerHTML = messages.join(' | ');
    } else {
        alertDiv.style.display = 'none';
    }
}

// ========== دوال التحويل ==========
function calculateTransferDetails() {
    const amount = parseFloat(document.getElementById('transferAmount')?.value);
    const recipientCode = document.getElementById('transferRecipientCode')?.value.trim();
    const detailsDiv = document.getElementById('transferDetails');
    
    if (!detailsDiv) return;
    if (!amount || amount < 1 || !recipientCode) {
        detailsDiv.style.display = 'none';
        return;
    }
    
    const taxPercent = 0.10;
    const taxAmount = amount * taxPercent;
    const totalDeduction = amount + taxAmount;
    
    const el1 = document.getElementById('transferAmountDisplay');
    const el2 = document.getElementById('transferTaxDisplay');
    const el3 = document.getElementById('transferTotalDisplay');
    const el4 = document.getElementById('transferRecipientDisplay');
    if (el1) el1.innerText = amount.toFixed(2);
    if (el2) el2.innerText = taxAmount.toFixed(2);
    if (el3) el3.innerText = totalDeduction.toFixed(2);
    if (el4) el4.innerText = amount.toFixed(2);
    detailsDiv.style.display = 'block';
}

async function transferBalance() {
    if (!currentUser) {
        showToast('الرجاء تسجيل الدخول أولاً', true);
        return;
    }
    
    const recipientCode = document.getElementById('transferRecipientCode')?.value.trim();
    const amount = parseFloat(document.getElementById('transferAmount')?.value);
    
    if (!recipientCode) {
        showToast('الرجاء إدخال كود الإحالة للمستلم', true);
        return;
    }
    
    if (!amount || amount < 1) {
        showToast('الرجاء إدخال مبلغ صحيح (1$ كحد أدنى)', true);
        return;
    }
    
    if (recipientCode === currentUser.referralCode) {
        showToast('لا يمكن التحويل لنفس المستخدم', true);
        return;
    }
    
    const users = loadUsers();
    
    let recipient = null;
    let recipientUsername = null;
    for (let [username, user] of Object.entries(users)) {
        if (user.referralCode === recipientCode) {
            recipient = user;
            recipientUsername = username;
            break;
        }
    }
    
    if (!recipient) {
        showToast('المستخدم غير موجود. تأكد من كود الإحالة', true);
        return;
    }
    
    const taxPercent = 0.10;
    const taxAmount = amount * taxPercent;
    const totalDeduction = amount + taxAmount;
    
    if (currentUser.balance < totalDeduction) {
        showToast(`رصيد غير كافٍ! تحتاج ${totalDeduction.toFixed(2)}$`, true);
        return;
    }
    
    if (!confirm(`تأكيد تحويل ${amount}$ إلى المستخدم ${recipient.fullname}?
    
📌 تفاصيل العملية:
• المبلغ: ${amount}$
• الضريبة (10%): ${taxAmount.toFixed(2)}$
• إجمالي الخصم: ${totalDeduction.toFixed(2)}$
• سيستلم المستلم: ${amount}$
    
هل أنت متأكد؟`)) {
        return;
    }
    
    // تنفيذ التحويل
    currentUser.balance -= totalDeduction;
    recipient.balance += amount;
    
    // تسجيل التحويل للمرسل
    if (!currentUser.transferHistory) currentUser.transferHistory = [];
    currentUser.transferHistory.unshift({
        type: 'outgoing',
        amount: amount,
        tax: taxAmount,
        total: totalDeduction,
        recipient: recipient.fullname,
        recipientCode: recipient.referralCode,
        recipientUsername: recipientUsername,
        date: Date.now(),
        status: 'مكتمل'
    });
    
    // تسجيل التحويل للمستلم
    if (!recipient.transferHistory) recipient.transferHistory = [];
    recipient.transferHistory.unshift({
        type: 'incoming',
        amount: amount,
        sender: currentUser.fullname,
        senderCode: currentUser.referralCode,
        senderUsername: currentUser.username,
        date: Date.now(),
        status: 'مكتمل'
    });
    
    // حفظ التغييرات
    users[currentUser.username] = currentUser;
    users[recipientUsername] = recipient;
    saveUsers(users);
    
    setCurrentUser(currentUser.username);
    showToast(`✅ تم تحويل ${amount}$ إلى ${recipient.fullname} بنجاح`);
    loadUserPanel();
    updateTransferPage();
    if (document.getElementById('transferRecipientCode')) document.getElementById('transferRecipientCode').value = '';
    if (document.getElementById('transferAmount')) document.getElementById('transferAmount').value = '';
    if (document.getElementById('transferDetails')) document.getElementById('transferDetails').style.display = 'none';
}

function updateTransferPage() {
    if (!currentUser) {
        const el = document.getElementById('transferBalance');
        if (el) el.innerText = '0';
        const list = document.getElementById('transferHistoryList');
        if (list) list.innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">الرجاء تسجيل الدخول</div>';
        return;
    }
    
    const el = document.getElementById('transferBalance');
    if (el) el.innerText = currentUser.balance.toFixed(2);
    
    const history = currentUser.transferHistory || [];
    const list = document.getElementById('transferHistoryList');
    if (!list) return;
    
    if (history.length === 0) {
        list.innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">لا توجد تحويلات</div>';
    } else {
        list.innerHTML = history.slice(0, 10).map(t => {
            const isOutgoing = t.type === 'outgoing';
            const icon = isOutgoing ? '📤' : '📥';
            const color = isOutgoing ? '#dc2626' : '#10b981';
            const label = isOutgoing ? `إلى ${t.recipient}` : `من ${t.sender}`;
            const amount = isOutgoing ? `-${t.total}` : `+${t.amount}`;
            const taxInfo = isOutgoing && t.tax ? ` (ضريبة ${t.tax.toFixed(2)}$)` : '';
            
            return `<div class="transfer-item">
                <div class="transfer-icon" style="color:${color}">${icon}</div>
                <div class="transfer-info">
                    <strong>${label}</strong>
                    <small>${new Date(t.date).toLocaleString()}</small>
                </div>
                <div class="transfer-amount" style="color:${color}">
                    ${amount}$ ${taxInfo}
                </div>
            </div>`;
        }).join('');
    }
}

// ========== واجهة المصادقة ==========
function initAuth() {
    console.log('🔐 Initializing auth...');
    
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            const form = document.getElementById(`${tabName}Form`);
            if (form) form.classList.add('active');
        });
    });
    
    const loginBtn = document.getElementById('doLogin');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('🔑 Login clicked');
            const username = document.getElementById('loginUsername')?.value.trim();
            const password = document.getElementById('loginPassword')?.value;
            const users = loadUsers();
            const user = users[username];
            if (user && user.password === password) { 
                setCurrentUser(username); 
                showToast(`مرحباً ${user.fullname || username}`);
                loadMainApp();
                if (user.role !== 'admin') {
                    setTimeout(() => {
                        document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active'));
                        const home = document.getElementById('homePage');
                        if (home) home.classList.add('active');
                        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                        const navHome = document.querySelector('.nav-item[data-page="home"]');
                        if (navHome) navHome.classList.add('active');
                        showGlobalAlert();
                        checkUserRestrictions();
                    }, 100);
                }
            }
            else showToast('بيانات الدخول غير صحيحة', true);
        });
    }
    
    const registerBtn = document.getElementById('doRegister');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            console.log('📝 Register clicked');
            const fullname = document.getElementById('regFullname')?.value.trim();
            const username = document.getElementById('regUsername')?.value.trim();
            const email = document.getElementById('regEmail')?.value.trim();
            const referralCode = document.getElementById('regReferralCode')?.value.trim();
            const password = document.getElementById('regPassword')?.value;
            const confirm = document.getElementById('regConfirmPassword')?.value;
            
            if (!fullname || !username || !email || !password) return showToast('املأ جميع الحقول', true);
            if (password !== confirm) return showToast('كلمة المرور غير متطابقة', true);
            
            const englishRegex = /^[a-zA-Z0-9_]+$/;
            if (!englishRegex.test(username)) {
                return showToast('اسم المستخدم يجب أن يكون إنجليزي فقط (a-z, A-Z, 0-9, _)', true);
            }
            
            const users = loadUsers();
            if (users[username]) return showToast('اسم المستخدم موجود', true);
            
            const newUser = { 
                id: Date.now().toString(), 
                fullname, 
                username, 
                email, 
                password, 
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
            
            users[username] = newUser;
            
            // حفظ في localStorage و Supabase
            localStorage.setItem('investUsers', JSON.stringify(users));
            await saveUserToSupabase(newUser);
            
            processReferral(username, referralCode);
            setCurrentUser(username);
            showToast(`تم إنشاء الحساب بنجاح`);
            loadMainApp();
            setTimeout(() => {
                document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active'));
                const home = document.getElementById('homePage');
                if (home) home.classList.add('active');
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                const navHome = document.querySelector('.nav-item[data-page="home"]');
                if (navHome) navHome.classList.add('active');
                showGlobalAlert();
                checkUserRestrictions();
            }, 100);
        });
    }
}

function loadMainApp() {
    console.log('📱 Loading main app...');
    currentUser = getCurrentUser();
    if (!currentUser) {
        const loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.classList.add('active');
        const userPages = document.getElementById('userPages');
        if (userPages) userPages.style.display = 'none';
        const adminPage = document.getElementById('adminPage');
        if (adminPage) adminPage.classList.remove('active');
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.style.display = 'none';
        return;
    }
    const loginPage = document.getElementById('loginPage');
    if (loginPage) loginPage.classList.remove('active');
    if (currentUser.role === 'admin') {
        const userPages = document.getElementById('userPages');
        if (userPages) userPages.style.display = 'none';
        const adminPage = document.getElementById('adminPage');
        if (adminPage) adminPage.classList.add('active');
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.style.display = 'none';
        loadAdminPanel();
    } else {
        const userPages = document.getElementById('userPages');
        if (userPages) userPages.style.display = 'block';
        const adminPage = document.getElementById('adminPage');
        if (adminPage) adminPage.classList.remove('active');
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.style.display = 'flex';
        loadUserPanel();
        document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active'));
        const home = document.getElementById('homePage');
        if (home) home.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navHome = document.querySelector('.nav-item[data-page="home"]');
        if (navHome) navHome.classList.add('active');
        showGlobalAlert();
        checkUserRestrictions();
    }
}

// ========== صفحات المستخدم ==========
function loadUserPanel() {
    console.log('👤 Loading user panel...');
    updateUserUI(); 
    renderPlans(); 
    updateSubscriptionPage(); 
    updateProfitPage(); 
    updateAccountPage(); 
    updateDepositPage(); 
    updateWithdrawPage(); 
    updateTransferPage();
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active'));
            const page = document.getElementById(pageId + 'Page');
            if (page) page.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            if (pageId === 'transfer') {
                updateTransferPage();
            }
        });
    });
    
    const collectBtn = document.getElementById('collectProfitBtn');
    if (collectBtn) collectBtn.addEventListener('click', collectProfit);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    const depositBtn = document.getElementById('depositBtn');
    if (depositBtn) {
        depositBtn.addEventListener('click', () => { 
            document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active')); 
            const page = document.getElementById('depositRequestPage');
            if (page) page.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const nav = document.querySelector('.nav-item[data-page="depositRequest"]');
            if (nav) nav.classList.add('active');
        });
    }
    
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', () => { 
            document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active')); 
            const page = document.getElementById('withdrawRequestPage');
            if (page) page.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const nav = document.querySelector('.nav-item[data-page="withdrawRequest"]');
            if (nav) nav.classList.add('active');
        });
    }
    
    const copyCodeBtn = document.getElementById('copyReferralCode');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => { 
            if (currentUser) {
                navigator.clipboard.writeText(currentUser.referralCode); 
                showToast('تم نسخ كود الإحالة'); 
            }
        });
    }
    
    const copyWalletBtn = document.getElementById('copyWalletAddress');
    if (copyWalletBtn) {
        copyWalletBtn.addEventListener('click', () => { 
            navigator.clipboard.writeText(TRC20_WALLET); 
            showToast('تم نسخ عنوان المحفظة'); 
        });
    }
    
    const depositReqBtn = document.getElementById('submitDepositRequest');
    if (depositReqBtn) depositReqBtn.addEventListener('click', submitDepositRequest);
    
    const withdrawReqBtn = document.getElementById('submitWithdrawRequest');
    if (withdrawReqBtn) withdrawReqBtn.addEventListener('click', submitWithdrawRequest);
    
    const transferBtn = document.getElementById('submitTransfer');
    if (transferBtn) transferBtn.addEventListener('click', transferBalance);
    
    const transferAmount = document.getElementById('transferAmount');
    if (transferAmount) transferAmount.addEventListener('input', calculateTransferDetails);
    
    const transferCode = document.getElementById('transferRecipientCode');
    if (transferCode) transferCode.addEventListener('input', calculateTransferDetails);
}

function updateUserUI() { 
    if (!currentUser) return;
    const el1 = document.getElementById('username');
    if (el1) el1.innerText = currentUser.fullname || currentUser.username;
    const el2 = document.getElementById('balance');
    if (el2) el2.innerText = currentUser.balance.toFixed(2);
    const el3 = document.getElementById('myReferralCode');
    if (el3) el3.innerText = currentUser.referralCode;
    const el4 = document.getElementById('referralBonusAmount');
    if (el4) el4.innerText = referralBonusAmount;
}

function renderPlans() {
    const container = document.getElementById('plansContainer');
    if (!container) return;
    container.innerHTML = '';
    for (let [key, plan] of Object.entries(plans)) {
        const card = document.createElement('div');
        card.className = 'plan-card';
        const taxDisplay = plan.withdrawTax > 0 ? `<div class="plan-tax">💰 ضريبة سحب: ${plan.withdrawTax}%</div>` : '';
        card.innerHTML = `<div class="plan-info"><h3><i class="${plan.icon}" style="color:${plan.color}"></i> ${plan.name}</h3><div class="plan-price"><span class="price-value"><i class="fas fa-tag"></i> ${plan.price} $</span></div><div class="plan-profit"><span class="profit-value"><i class="fas fa-chart-line"></i> الربح اليومي: ${plan.dailyProfit} $</span></div><div class="plan-roi">عائد: ${((plan.dailyProfit/plan.price)*100).toFixed(1)}% يومياً</div>${taxDisplay}</div><button id="buy-${key}" ${currentUser && currentUser.activePlan ? 'disabled' : ''}><i class="fas fa-shopping-cart"></i> اشتراك</button>`;
        container.appendChild(card);
        const buyBtn = document.getElementById(`buy-${key}`);
        if (buyBtn) buyBtn.addEventListener('click', () => buyPlan(key));
    }
}

function buyPlan(planKey) {
    if (!currentUser) return showToast('الرجاء تسجيل الدخول أولاً', true);
    if (currentUser.activePlan) return showToast('لديك باقة نشطة بالفعل', true);
    const plan = plans[planKey];
    if (currentUser.balance >= plan.price) {
        if (confirm(`شراء باقة ${plan.name} بـ ${plan.price}$؟`)) {
            currentUser.balance -= plan.price;
            currentUser.activePlan = planKey;
            currentUser.lastProfitClaim = Date.now();
            currentUser.subscriptionDate = Date.now();
            currentUser.totalInvested = (currentUser.totalInvested || 0) + plan.price;
            if (!currentUser.subscriptionHistory) currentUser.subscriptionHistory = [];
            currentUser.subscriptionHistory.unshift({ planName: plan.name, price: plan.price, date: Date.now() });
            saveUser(currentUser);
            checkAndGiveReferralBonus(currentUser.username);
            showToast(`تم الاشتراك في ${plan.name}`); 
            loadUserPanel();
        }
    } else showToast(`رصيد غير كافٍ`, true);
}

function collectProfit() {
    if (!currentUser) return showToast('الرجاء تسجيل الدخول أولاً', true);
    if (!currentUser.activePlan) return showToast('لا توجد باقة نشطة', true);
    if (currentUser.restrictProfit) {
        return showToast('⛔ جني الأرباح مقيد حالياً من قبل الإدارة', true);
    }
    const now = Date.now();
    if ((now - (currentUser.lastProfitClaim || 0)) >= (24 * 3600 * 1000)) {
        const profit = plans[currentUser.activePlan].dailyProfit;
        currentUser.balance += profit; 
        currentUser.totalProfit = (currentUser.totalProfit || 0) + profit; 
        currentUser.lastProfitClaim = now;
        saveUser(currentUser);
        showToast(`تم جني ${profit}$`); 
        loadUserPanel(); 
        confettiEffect();
    } else showToast('لم يحن وقت جني الربح بعد', true);
}

function updateProfitPage() {
    if (!currentUser) return;
    const el1 = document.getElementById('totalProfitAmount');
    if (el1) el1.innerText = (currentUser.totalProfit || 0).toFixed(2);
    let todayProfit = 0;
    if (currentUser.activePlan && currentUser.lastProfitClaim && new Date(currentUser.lastProfitClaim).toDateString() === new Date().toDateString()) {
        todayProfit = plans[currentUser.activePlan].dailyProfit;
    }
    const el2 = document.getElementById('todayProfit');
    if (el2) el2.innerText = todayProfit.toFixed(2);
    if (currentUser.activePlan) {
        const el3 = document.getElementById('nextProfitAmount');
        if (el3) el3.innerText = plans[currentUser.activePlan].dailyProfit;
        updateTimer();
    }
}

function updateTimer() {
    const btn = document.getElementById('collectProfitBtn');
    if (!btn) return;
    if (!currentUser || !currentUser.activePlan) { 
        btn.disabled = true; 
        return; 
    }
    if (currentUser.restrictProfit) {
        btn.disabled = true;
        const el = document.getElementById('nextProfitInfo');
        if (el) el.innerText = '🔒 مقيد';
        return;
    }
    const remaining = (currentUser.lastProfitClaim + 24*3600*1000) - Date.now();
    if (remaining <= 0) { 
        btn.disabled = false; 
        const el = document.getElementById('nextProfitInfo');
        if (el) el.innerText = 'جاهز!'; 
    }
    else { 
        btn.disabled = true; 
        if (countdownInterval) clearInterval(countdownInterval); 
        let ms = remaining; 
        const update = () => { 
            if (ms <= 0) { 
                clearInterval(countdownInterval); 
                const el = document.getElementById('nextProfitInfo');
                if (el) el.innerText = 'جاهز!'; 
                btn.disabled = false; 
                return; 
            } 
            const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000); 
            const el = document.getElementById('nextProfitInfo');
            if (el) el.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; 
            ms -= 1000; 
        }; 
        update(); 
        countdownInterval = setInterval(update, 1000); 
    }
}

function updateSubscriptionPage() {
    if (!currentUser) return;
    const container = document.getElementById('subscriptionCard');
    if (!container) return;
    if (!currentUser.activePlan) { 
        container.innerHTML = `<div style="text-align:center;padding:2rem"><i class="fas fa-ticket-alt" style="font-size:3rem"></i><p>لا توجد باقة نشطة</p></div>`; 
        return; 
    }
    const plan = plans[currentUser.activePlan];
    const taxDisplay = plan.withdrawTax > 0 ? `<p style="color:#f59e0b">💰 ضريبة السحب: ${plan.withdrawTax}%</p>` : '';
    container.innerHTML = `<div style="text-align:center"><i class="${plan.icon}" style="font-size:3rem;color:${plan.color}"></i><h2>${plan.name}</h2><p style="color:#dc2626">💰 ${plan.price}$</p><p style="color:#10b981">📈 ${plan.dailyProfit}$/يوم</p>${taxDisplay}</div>`;
    const historyEl = document.getElementById('subscriptionHistory');
    if (historyEl) {
        historyEl.innerHTML = (currentUser.subscriptionHistory || []).map(h => 
            `<div class="info-row"><span>${h.planName}</span><span>${h.price}$</span><span>${new Date(h.date).toLocaleDateString()}</span></div>`
        ).join('') || '<div>لا يوجد سجل</div>';
    }
}

function updateAccountPage() {
    if (!currentUser) return;
    const elements = {
        accountName: currentUser.fullname,
        accountUsername: currentUser.username,
        accountEmail: currentUser.email,
        accountBalance: currentUser.balance.toFixed(2),
        accountTotalProfit: (currentUser.totalProfit || 0).toFixed(2),
        accountCurrentPlan: currentUser.activePlan ? plans[currentUser.activePlan]?.name : 'لا توجد',
        referralBonus: (currentUser.referralBonus || 0).toFixed(2)
    };
    for (let [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    }
    
    const users = loadUsers();
    const refEl = document.getElementById('referredByDisplay');
    if (refEl) {
        if (currentUser.referredBy) {
            const referrer = users[currentUser.referredBy];
            refEl.innerHTML = referrer ? `<span style="color:#8b5cf6;font-weight:700;">${referrer.fullname}</span> (@${referrer.username})` : '--';
        } else {
            refEl.innerText = '--';
        }
    }
}

function updateDepositPage() { 
    if (!currentUser) return;
    const history = currentUser.depositRequests || [];
    const el = document.getElementById('depositHistoryList');
    if (!el) return;
    el.innerHTML = history.map(r => {
        let statusClass = '';
        let statusIcon = '';
        if (r.status === 'مكتمل') { statusClass = 'color: #10b981'; statusIcon = '✅'; }
        else if (r.status === 'مرفوض') { statusClass = 'color: #ef4444'; statusIcon = '❌'; }
        else { statusClass = 'color: #f59e0b'; statusIcon = '⏳'; }
        return `<div class="info-row"><span>${r.amount}$</span><span style="${statusClass}">${statusIcon} ${r.status}</span><span>${new Date(r.date).toLocaleString()}</span></div>`;
    }).join('') || '<div>لا توجد طلبات</div>';
}

function updateWithdrawPage() { 
    if (!currentUser) return;
    const el1 = document.getElementById('withdrawBalance');
    if (el1) el1.innerText = currentUser.balance.toFixed(2);
    const history = currentUser.withdrawRequests || [];
    const el2 = document.getElementById('withdrawHistoryList');
    if (!el2) return;
    el2.innerHTML = history.map(r => {
        let statusClass = '';
        let statusIcon = '';
        if (r.status === 'مكتمل') { statusClass = 'color: #10b981'; statusIcon = '✅'; }
        else if (r.status === 'مرفوض') { statusClass = 'color: #ef4444'; statusIcon = '❌'; }
        else { statusClass = 'color: #f59e0b'; statusIcon = '⏳'; }
        return `<div class="info-row"><span>${r.amount}$</span><span>${r.walletAddress.substring(0,15)}...</span><span style="${statusClass}">${statusIcon} ${r.status}</span><span>${new Date(r.date).toLocaleString()}</span></div>`;
    }).join('') || '<div>لا توجد طلبات</div>';
}

function submitDepositRequest() {
    if (!currentUser) return showToast('الرجاء تسجيل الدخول أولاً', true);
    const amount = parseFloat(document.getElementById('depositAmountRequest')?.value);
    const txid = document.getElementById('depositTxid')?.value.trim();
    if (!amount || amount < 10) return showToast('المبلغ 10$ كحد أدنى', true);
    if (!txid) return showToast('أدخل معرف المعاملة', true);
    if (!currentUser.depositRequests) currentUser.depositRequests = [];
    currentUser.depositRequests.unshift({ amount, txid, date: Date.now(), status: 'قيد المراجعة' });
    saveUser(currentUser);
    showToast('تم تقديم طلب الإيداع، سيتم مراجعته');
    if (document.getElementById('depositAmountRequest')) document.getElementById('depositAmountRequest').value = '';
    if (document.getElementById('depositTxid')) document.getElementById('depositTxid').value = '';
    updateDepositPage();
}

function submitWithdrawRequest() {
    if (!currentUser) return showToast('الرجاء تسجيل الدخول أولاً', true);
    const amount = parseFloat(document.getElementById('withdrawAmountRequest')?.value);
    const walletAddress = document.getElementById('withdrawWalletAddress')?.value.trim();
    if (!amount || amount < 10) return showToast('المبلغ 10$ كحد أدنى', true);
    if (amount > currentUser.balance) return showToast('رصيد غير كافٍ', true);
    if (!walletAddress) return showToast('أدخل عنوان محفظة TRC20', true);
    
    if (currentUser.restrictWithdraw) {
        return showToast('🚫 السحب مقيد حالياً من قبل الإدارة', true);
    }
    
    let taxPercent = 0;
    if (currentUser.activePlan && plans[currentUser.activePlan]) {
        taxPercent = plans[currentUser.activePlan].withdrawTax || 0;
    }
    const taxAmount = (amount * taxPercent) / 100;
    const netAmount = amount - taxAmount;
    
    if (taxPercent > 0) {
        if (!confirm(`سيتم خصم ${taxPercent}% ضريبة سحب (${taxAmount.toFixed(2)}$) وسيصلك ${netAmount.toFixed(2)}$. متابعة؟`)) return;
    }
    
    if (!currentUser.withdrawRequests) currentUser.withdrawRequests = [];
    currentUser.withdrawRequests.unshift({ 
        amount: amount, taxAmount: taxAmount, netAmount: netAmount, taxPercent: taxPercent,
        walletAddress, date: Date.now(), status: 'قيد المراجعة' 
    });
    saveUser(currentUser);
    showToast('تم تقديم طلب السحب، سيتم مراجعته');
    if (document.getElementById('withdrawAmountRequest')) document.getElementById('withdrawAmountRequest').value = '';
    if (document.getElementById('withdrawWalletAddress')) document.getElementById('withdrawWalletAddress').value = '';
    updateWithdrawPage();
}

// ========== لوحة الادمن ==========
function loadAdminPanel() {
    console.log('👑 Loading admin panel...');
    const nameEl = document.getElementById('adminName');
    if (nameEl) nameEl.innerHTML = `مرحباً ${currentUser.fullname}`;
    updateAdminStats(); 
    renderUsersList(); 
    renderDepositsList(); 
    renderWithdrawalsList(); 
    renderPlansSettings(); 
    loadSettingsToAdmin();
    
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById(`admin${capitalize(btn.dataset.adminSection)}Section`);
            if (section) section.classList.add('active');
        });
    });
    
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    const addPlanBtn = document.getElementById('showAddPlanModal');
    if (addPlanBtn) addPlanBtn.addEventListener('click', () => openAddPlanModal());
    
    const saveBonusBtn = document.getElementById('saveReferralBonus');
    if (saveBonusBtn) saveBonusBtn.addEventListener('click', saveReferralBonusSettings);
    
    const saveTaxBtn = document.getElementById('saveTaxSettings');
    if (saveTaxBtn) saveTaxBtn.addEventListener('click', saveTaxSettings);
    
    const saveAlertBtn = document.getElementById('saveAlertSettings');
    if (saveAlertBtn) saveAlertBtn.addEventListener('click', saveAlertSettings);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function updateAdminStats() {
    const users = loadUsers();
    let totalUsers = 0, totalInvested = 0, totalProfit = 0, pending = 0;
    Object.values(users).forEach(u => {
        if (u.role !== 'admin') { totalUsers++; totalInvested += u.totalInvested || 0; totalProfit += u.totalProfit || 0; }
        (u.depositRequests || []).forEach(r => { if(r.status === 'قيد المراجعة') pending++; });
        (u.withdrawRequests || []).forEach(r => { if(r.status === 'قيد المراجعة') pending++; });
    });
    const els = {
        adminTotalUsers: totalUsers,
        adminTotalInvested: totalInvested,
        adminTotalProfit: totalProfit,
        adminPendingRequests: pending
    };
    for (let [id, value] of Object.entries(els)) {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    }
}

function renderUsersList(search = '') {
    const users = loadUsers(); 
    const container = document.getElementById('usersList'); 
    if (!container) return;
    container.innerHTML = '';
    
    Object.entries(users).forEach(([username, user]) => {
        if (user.role === 'admin') return;
        const searchLower = search.toLowerCase();
        const match = !search || username.toLowerCase().includes(searchLower) || 
                     (user.fullname || '').toLowerCase().includes(searchLower) || 
                     (user.email || '').toLowerCase().includes(searchLower);
        if (!match) return;
        
        const div = document.createElement('div'); 
        div.className = 'user-item';
        const planName = user.activePlan ? plans[user.activePlan]?.name : 'لا توجد';
        const planColor = user.activePlan && plans[user.activePlan] ? plans[user.activePlan].color : '#718096';
        
        let restrictionStatus = '';
        if (user.restrictWithdraw || user.restrictProfit) {
            restrictionStatus = '<span class="restriction-badge active">🔒 مقيد</span>';
        } else {
            restrictionStatus = '<span class="restriction-badge inactive">✅ نشط</span>';
        }
        
        let referredByDisplay = '--';
        if (user.referredBy) {
            const referrer = users[user.referredBy];
            referredByDisplay = referrer ? `${referrer.fullname} (@${referrer.username})` : '--';
        }
        
        div.innerHTML = `
            <div class="user-info">
                <strong>${user.fullname}</strong>
                ${restrictionStatus}
                <small>@${username} | الرصيد: ${user.balance}$</small>
                <span class="user-plan" style="background:${planColor}20;color:${planColor}">${planName}</span>
                <small>👤 أضافه: ${referredByDisplay}</small>
                <small class="wallet-address" onclick="copyToClipboard('${user.referralCode}')">📋 كود الإحالة: ${user.referralCode}</small>
                <small>📅 تاريخ التسجيل: ${new Date(user.createdAt).toLocaleDateString()}</small>
            </div>
            <div class="user-actions">
                <button class="details-btn" onclick="showUserDetails('${username}')"><i class="fas fa-info-circle"></i></button>
                <button class="restrict-btn" onclick="openRestrictModal('${username}')"><i class="fas fa-ban"></i></button>
                <button class="btn-upgrade-plan" onclick="openUpgradePlanModal('${username}')"><i class="fas fa-arrow-up"></i></button>
                <button class="btn-edit-balance" onclick="openEditBalanceModal('${username}')"><i class="fas fa-dollar-sign"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
    
    if (container.innerHTML === '') {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#718096;">لا يوجد مستخدمين مطابقين للبحث</div>';
    }
    
    const searchInput = document.getElementById('searchUserInput');
    if (searchInput) {
        searchInput.oninput = (e) => renderUsersList(e.target.value);
    }
}

function showUserDetails(username) {
    const users = loadUsers();
    const user = users[username];
    if (!user) return;
    
    const body = document.getElementById('userDetailsBody');
    if (!body) return;
    const planName = user.activePlan ? plans[user.activePlan]?.name : 'لا توجد';
    const planColor = user.activePlan && plans[user.activePlan] ? plans[user.activePlan].color : '#718096';
    
    let referredByDisplay = '--';
    if (user.referredBy) {
        const referrer = users[user.referredBy];
        referredByDisplay = referrer ? `${referrer.fullname} (@${referrer.username})` : '--';
    }
    
    let referredUsersDisplay = '--';
    if (user.referredUsers && user.referredUsers.length > 0) {
        referredUsersDisplay = user.referredUsers.map(u => {
            const refUser = users[u];
            return refUser ? `${refUser.fullname} (@${refUser.username})` : u;
        }).join(', ');
    }
    
    body.innerHTML = `
        <div class="detail-row"><span class="label">👤 الاسم الكامل</span><span class="value">${user.fullname}</span></div>
        <div class="detail-row"><span class="label">🔑 اسم المستخدم</span><span class="value">@${user.username}</span></div>
        <div class="detail-row"><span class="label">📧 البريد الإلكتروني</span><span class="value">${user.email || '--'}</span></div>
        <div class="detail-row"><span class="label">💰 الرصيد</span><span class="value">${user.balance.toFixed(2)}$</span></div>
        <div class="detail-row"><span class="label">📈 إجمالي الأرباح</span><span class="value">${(user.totalProfit || 0).toFixed(2)}$</span></div>
        <div class="detail-row"><span class="label">💎 الباقة الحالية</span><span class="value" style="color:${planColor}">${planName}</span></div>
        <div class="detail-row"><span class="label">📅 تاريخ الاشتراك</span><span class="value">${user.subscriptionDate ? new Date(user.subscriptionDate).toLocaleDateString() : '--'}</span></div>
        <div class="detail-row"><span class="label">📋 كود الإحالة</span><span class="value">${user.referralCode}</span></div>
        <div class="detail-row"><span class="label">👤 أضافه</span><span class="value">${referredByDisplay}</span></div>
        <div class="detail-row"><span class="label">👥 أضافهم</span><span class="value">${referredUsersDisplay}</span></div>
        <div class="detail-row"><span class="label">🎁 مكافآت الإحالة</span><span class="value">${(user.referralBonus || 0).toFixed(2)}$</span></div>
        <div class="detail-row"><span class="label">🔒 تقييد السحب</span><span class="value" style="color:${user.restrictWithdraw ? '#dc2626' : '#16a34a'}">${user.restrictWithdraw ? '✅ مقيد' : '❌ غير مقيد'}</span></div>
        <div class="detail-row"><span class="label">🔒 تقييد الربح</span><span class="value" style="color:${user.restrictProfit ? '#dc2626' : '#16a34a'}">${user.restrictProfit ? '✅ مقيد' : '❌ غير مقيد'}</span></div>
        <div class="detail-row"><span class="label">📅 تاريخ التسجيل</span><span class="value">${new Date(user.createdAt).toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="label">📊 عدد طلبات الإيداع</span><span class="value">${(user.depositRequests || []).length}</span></div>
        <div class="detail-row"><span class="label">📊 عدد طلبات السحب</span><span class="value">${(user.withdrawRequests || []).length}</span></div>
        <div class="detail-row"><span class="label">📊 عدد التحويلات</span><span class="value">${(user.transferHistory || []).length}</span></div>
    `;
    
    const modal = document.getElementById('userDetailsModal');
    if (modal) modal.style.display = 'flex';
}

function openRestrictModal(username) {
    const users = loadUsers();
    const user = users[username];
    if (!user) return;
    
    const usernameEl = document.getElementById('restrictUsername');
    if (usernameEl) usernameEl.value = username;
    const withdrawEl = document.getElementById('restrictWithdraw');
    if (withdrawEl) withdrawEl.value = user.restrictWithdraw ? '1' : '0';
    const profitEl = document.getElementById('restrictProfit');
    if (profitEl) profitEl.value = user.restrictProfit ? '1' : '0';
    
    const modal = document.getElementById('restrictUserModal');
    if (modal) modal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmRestrict');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const users2 = loadUsers();
            const user2 = users2[username];
            const wEl = document.getElementById('restrictWithdraw');
            const pEl = document.getElementById('restrictProfit');
            if (wEl) user2.restrictWithdraw = wEl.value === '1';
            if (pEl) user2.restrictProfit = pEl.value === '1';
            saveUsers(users2);
            showToast(`تم تحديث تقييد المستخدم ${username}`);
            closeModals();
            renderUsersList();
            if (currentUser.username === username) {
                setCurrentUser(username);
                checkUserRestrictions();
            }
        };
    }
}

function renderDepositsList() {
    const users = loadUsers(); 
    const pendingContainer = document.getElementById('depositsRequestsList'); 
    const completedContainer = document.getElementById('depositsCompletedList');
    if (!pendingContainer || !completedContainer) return;
    pendingContainer.innerHTML = ''; 
    completedContainer.innerHTML = '';
    
    Object.entries(users).forEach(([username, user]) => {
        (user.depositRequests || []).forEach((req, idx) => {
            let statusHtml = '';
            if (req.status === 'قيد المراجعة') {
                statusHtml = `<div class="request-actions"><button class="btn-approve" onclick="adminApproveDeposit('${username}',${idx})">قبول</button><button class="btn-reject" onclick="adminRejectDeposit('${username}',${idx})">رفض</button></div>`;
            } else if (req.status === 'مكتمل') {
                statusHtml = `<div class="request-status" style="color:#10b981">✅ مكتمل</div>`;
            } else if (req.status === 'مرفوض') {
                statusHtml = `<div class="request-status" style="color:#ef4444">❌ مرفوض</div>`;
            }
            const div = document.createElement('div'); 
            div.className = 'request-item';
            div.innerHTML = `<div><strong>${user.fullname}</strong><br><small>@${username}</small><br><small>📧 ${user.email || '--'}</small><br>💰 ${req.amount}$<br>🆔 ${req.txid}<br>📅 ${new Date(req.date).toLocaleString()}</div>${statusHtml}`;
            if (req.status === 'قيد المراجعة') pendingContainer.appendChild(div);
            else completedContainer.appendChild(div);
        });
    });
    if (pendingContainer.innerHTML === '') pendingContainer.innerHTML = '<div style="padding:1rem;text-align:center">✨ لا توجد طلبات قيد المراجعة</div>';
    if (completedContainer.innerHTML === '') completedContainer.innerHTML = '<div style="padding:1rem;text-align:center">📋 لا توجد طلبات منتهية</div>';
}

function renderWithdrawalsList() {
    const users = loadUsers(); 
    const pendingContainer = document.getElementById('withdrawalsRequestsList'); 
    const completedContainer = document.getElementById('withdrawalsCompletedList');
    if (!pendingContainer || !completedContainer) return;
    pendingContainer.innerHTML = ''; 
    completedContainer.innerHTML = '';
    
    Object.entries(users).forEach(([username, user]) => {
        (user.withdrawRequests || []).forEach((req, idx) => {
            let statusHtml = '';
            if (req.status === 'قيد المراجعة') {
                statusHtml = `<div class="request-actions"><button class="btn-approve" onclick="adminApproveWithdraw('${username}',${idx})">قبول</button><button class="btn-reject" onclick="adminRejectWithdraw('${username}',${idx})">رفض</button></div>`;
            } else if (req.status === 'مكتمل') {
                statusHtml = `<div class="request-status" style="color:#10b981">✅ مكتمل</div>`;
            } else if (req.status === 'مرفوض') {
                statusHtml = `<div class="request-status" style="color:#ef4444">❌ مرفوض</div>`;
            }
            const div = document.createElement('div'); 
            div.className = 'request-item';
            const taxInfo = req.taxPercent > 0 ? ` (ضريبة ${req.taxPercent}% = ${req.taxAmount.toFixed(2)}$)` : '';
            div.innerHTML = `<div><strong>${user.fullname}</strong><br><small>@${username}</small><br><small>📧 ${user.email || '--'}</small><br>💰 ${req.amount}$ ${taxInfo}<br>🏦 <span class="wallet-address" onclick="copyToClipboard('${req.walletAddress}')">📋 ${req.walletAddress.substring(0,20)}...</span><br>📅 ${new Date(req.date).toLocaleString()}</div>${statusHtml}`;
            if (req.status === 'قيد المراجعة') pendingContainer.appendChild(div);
            else completedContainer.appendChild(div);
        });
    });
    if (pendingContainer.innerHTML === '') pendingContainer.innerHTML = '<div style="padding:1rem;text-align:center">✨ لا توجد طلبات سحب قيد المراجعة</div>';
    if (completedContainer.innerHTML === '') completedContainer.innerHTML = '<div style="padding:1rem;text-align:center">📋 لا توجد طلبات سحب منتهية</div>';
}

function renderPlansSettings() {
    const container = document.getElementById('plansSettingsContainer'); 
    if (!container) return;
    container.innerHTML = '';
    for (let [key, plan] of Object.entries(plans)) {
        const div = document.createElement('div'); 
        div.className = 'plan-setting-item';
        div.innerHTML = `<div class="plan-info"><i class="${plan.icon}" style="color:${plan.color}"></i> <strong>${plan.name}</strong><br><small>السعر: ${plan.price}$ | الربح: ${plan.dailyProfit}$ | الضريبة: ${plan.withdrawTax || 0}%</small></div><div class="plan-actions"><button class="btn-edit-plan" onclick="openEditPlanModal('${key}')"><i class="fas fa-edit"></i></button><button class="btn-delete-plan" onclick="deletePlan('${key}')"><i class="fas fa-trash"></i></button></div>`;
        container.appendChild(div);
    }
}

function loadSettingsToAdmin() {
    const el1 = document.getElementById('adminReferralBonus');
    if (el1) el1.value = referralBonusAmount;
    const el2 = document.getElementById('adminAlertText');
    if (el2) el2.value = globalAlert.text || '';
    const el3 = document.getElementById('adminAlertLink');
    if (el3) el3.value = globalAlert.link || '';
    const el4 = document.getElementById('adminAlertButtonText');
    if (el4) el4.value = globalAlert.buttonText || '';
    const el5 = document.getElementById('adminAlertBgColor');
    if (el5) el5.value = globalAlert.bgColor || '#fef3c7';
    const el6 = document.getElementById('adminAlertEnabled');
    if (el6) el6.value = globalAlert.enabled ? 'true' : 'false';
    
    const taxContainer = document.getElementById('taxSettingsContainer');
    if (!taxContainer) return;
    taxContainer.innerHTML = '';
    for (let [key, plan] of Object.entries(plans)) {
        const div = document.createElement('div');
        div.className = 'tax-setting-item';
        div.innerHTML = `<span><i class="${plan.icon}" style="color:${plan.color}"></i> ${plan.name}</span><input type="number" id="tax-${key}" value="${plan.withdrawTax || 0}" min="0" max="100" step="0.5"> <span>%</span>`;
        taxContainer.appendChild(div);
    }
}

function saveReferralBonusSettings() {
    const el = document.getElementById('adminReferralBonus');
    if (!el) return;
    const value = parseFloat(el.value);
    if (!isNaN(value) && value >= 0) {
        referralBonusAmount = value;
        saveSettings();
        showToast(`تم حفظ مكافأة الإحالة: ${value}$`);
        const bonusEl = document.getElementById('referralBonusAmount');
        if (bonusEl) bonusEl.innerText = value;
    } else {
        showToast('قيمة غير صالحة', true);
    }
}

function saveTaxSettings() {
    for (let [key] of Object.entries(plans)) {
        const el = document.getElementById(`tax-${key}`);
        if (!el) continue;
        const taxValue = parseFloat(el.value);
        if (!isNaN(taxValue) && taxValue >= 0 && taxValue <= 100) {
            plans[key].withdrawTax = taxValue;
            savePlanTax(key);
        }
    }
    savePlansSettings();
    showToast('تم حفظ إعدادات الضريبة');
    renderPlansSettings();
    renderPlans();
}

function saveAlertSettings() {
    const textEl = document.getElementById('adminAlertText');
    const linkEl = document.getElementById('adminAlertLink');
    const btnTextEl = document.getElementById('adminAlertButtonText');
    const bgEl = document.getElementById('adminAlertBgColor');
    const enabledEl = document.getElementById('adminAlertEnabled');
    if (textEl) globalAlert.text = textEl.value;
    if (linkEl) globalAlert.link = linkEl.value;
    if (btnTextEl) globalAlert.buttonText = btnTextEl.value;
    if (bgEl) globalAlert.bgColor = bgEl.value;
    if (enabledEl) globalAlert.enabled = enabledEl.value === 'true';
    saveSettings();
    showToast('تم حفظ إعدادات التنبيه');
    if (currentUser && currentUser.role !== 'admin') showGlobalAlert();
}

function openAddPlanModal() {
    const nameEl = document.getElementById('newPlanName');
    const priceEl = document.getElementById('newPlanPrice');
    const profitEl = document.getElementById('newPlanProfit');
    const taxEl = document.getElementById('newPlanTax');
    const colorEl = document.getElementById('newPlanColor');
    const iconEl = document.getElementById('newPlanIcon');
    if (nameEl) nameEl.value = '';
    if (priceEl) priceEl.value = '';
    if (profitEl) profitEl.value = '';
    if (taxEl) taxEl.value = '0';
    if (colorEl) colorEl.value = '#667eea';
    if (iconEl) iconEl.value = 'fas fa-star';
    
    const modal = document.getElementById('addPlanModal');
    if (modal) modal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmAddPlan');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const name = document.getElementById('newPlanName')?.value.trim(); 
            const price = parseFloat(document.getElementById('newPlanPrice')?.value); 
            const profit = parseFloat(document.getElementById('newPlanProfit')?.value);
            const tax = parseFloat(document.getElementById('newPlanTax')?.value) || 0;
            const color = document.getElementById('newPlanColor')?.value; 
            const icon = document.getElementById('newPlanIcon')?.value;
            if (!name || isNaN(price) || isNaN(profit)) return showToast('املأ جميع الحقول', true);
            const newKey = 'plan' + Date.now();
            plans[newKey] = { id: newKey, name, price, dailyProfit: profit, icon, color, withdrawTax: tax };
            savePlansSettings(); 
            savePlanTax(newKey);
            renderPlansSettings(); 
            loadSettingsToAdmin();
            showToast('تم إضافة الباقة'); 
            closeModals(); 
            if (currentUser && currentUser.role !== 'admin') renderPlans();
        };
    }
}

function openEditPlanModal(key) {
    const plan = plans[key];
    const keyEl = document.getElementById('editPlanKey');
    const nameEl = document.getElementById('editPlanName');
    const priceEl = document.getElementById('editPlanPrice');
    const profitEl = document.getElementById('editPlanProfit');
    const taxEl = document.getElementById('editPlanTax');
    const colorEl = document.getElementById('editPlanColor');
    const iconEl = document.getElementById('editPlanIcon');
    if (keyEl) keyEl.value = key;
    if (nameEl) nameEl.value = plan.name;
    if (priceEl) priceEl.value = plan.price;
    if (profitEl) profitEl.value = plan.dailyProfit;
    if (taxEl) taxEl.value = plan.withdrawTax || 0;
    if (colorEl) colorEl.value = plan.color;
    if (iconEl) iconEl.value = plan.icon;
    
    const modal = document.getElementById('editPlanModal');
    if (modal) modal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmEditPlan');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const name = document.getElementById('editPlanName')?.value;
            const price = parseFloat(document.getElementById('editPlanPrice')?.value);
            const profit = parseFloat(document.getElementById('editPlanProfit')?.value);
            const tax = parseFloat(document.getElementById('editPlanTax')?.value) || 0;
            const color = document.getElementById('editPlanColor')?.value;
            const icon = document.getElementById('editPlanIcon')?.value;
            if (name) plans[key].name = name;
            if (!isNaN(price)) plans[key].price = price;
            if (!isNaN(profit)) plans[key].dailyProfit = profit;
            plans[key].withdrawTax = tax;
            if (color) plans[key].color = color;
            if (icon) plans[key].icon = icon;
            savePlansSettings(); 
            savePlanTax(key);
            renderPlansSettings(); 
            loadSettingsToAdmin();
            showToast('تم تعديل الباقة'); 
            closeModals(); 
            if (currentUser && currentUser.role !== 'admin') renderPlans();
        };
    }
    
    const deleteBtn = document.getElementById('deletePlanBtn');
    if (deleteBtn) deleteBtn.onclick = () => deletePlan(key);
}

function deletePlan(key) {
    if (key === 'vip1' || key === 'vip2' || key === 'vip3' || key === 'vip4') return showToast('لا يمكن حذف الباقات الأساسية', true);
    if (confirm('هل أنت متأكد من حذف هذه الباقة؟')) { 
        delete plans[key]; 
        localStorage.removeItem(`tax_${key}`); 
        savePlansSettings(); 
        renderPlansSettings(); 
        loadSettingsToAdmin(); 
        showToast('تم حذف الباقة'); 
        closeModals(); 
        if (currentUser && currentUser.role !== 'admin') renderPlans(); 
    }
}

function openEditBalanceModal(username) {
    const users = loadUsers(); 
    const user = users[username];
    const el1 = document.getElementById('editBalanceUsername');
    const el2 = document.getElementById('editBalanceAmount');
    if (el1) el1.value = username;
    if (el2) el2.value = user.balance;
    
    const modal = document.getElementById('editBalanceModal');
    if (modal) modal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmEditBalance');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const newBalance = parseFloat(document.getElementById('editBalanceAmount')?.value);
            if (!isNaN(newBalance)) { 
                users[username].balance = newBalance; 
                saveUsers(users); 
                showToast(`تم تحديث رصيد ${username}`); 
                renderUsersList(); 
                updateAdminStats(); 
                if (currentUser.username === username) loadMainApp(); 
                closeModals(); 
            }
        };
    }
}

function openUpgradePlanModal(username) {
    const select = document.getElementById('upgradePlanSelect'); 
    if (!select) return;
    select.innerHTML = '';
    for (let [key, plan] of Object.entries(plans)) { 
        const option = document.createElement('option'); 
        option.value = key; 
        option.innerText = `${plan.name} (${plan.price}$ - ${plan.dailyProfit}$/يوم)`; 
        select.appendChild(option); 
    }
    const el = document.getElementById('upgradeUsername');
    if (el) el.value = username;
    
    const modal = document.getElementById('upgradePlanModal');
    if (modal) modal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmUpgradePlan');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const users = loadUsers(); 
            const newPlanKey = document.getElementById('upgradePlanSelect')?.value;
            if (!newPlanKey) return;
            users[username].activePlan = newPlanKey; 
            users[username].lastProfitClaim = Date.now(); 
            users[username].subscriptionDate = Date.now();
            if (!users[username].subscriptionHistory) users[username].subscriptionHistory = [];
            users[username].subscriptionHistory.unshift({ planName: plans[newPlanKey].name, price: plans[newPlanKey].price, date: Date.now(), type: 'ترقية' });
            saveUsers(users); 
            showToast(`تم ترقية باقة ${username} إلى ${plans[newPlanKey].name}`); 
            renderUsersList(); 
            closeModals(); 
            if (currentUser.username === username) loadMainApp();
        };
    }
}

// ===== دوال الادمن للطلبات =====
window.adminApproveDeposit = (username, idx) => {
    const users = loadUsers(); 
    const user = users[username]; 
    const req = user.depositRequests[idx];
    if (req && req.status === 'قيد المراجعة') { 
        user.balance += req.amount; 
        req.status = 'مكتمل'; 
        saveUsers(users); 
        checkAndGiveReferralBonus(username); 
        showToast(`✅ تم قبول إيداع ${req.amount}$`); 
        renderDepositsList(); 
        renderUsersList(); 
        updateAdminStats(); 
        if (currentUser.username === username) loadMainApp(); 
    }
};

window.adminRejectDeposit = (username, idx) => { 
    const users = loadUsers(); 
    users[username].depositRequests[idx].status = 'مرفوض'; 
    saveUsers(users); 
    showToast(`❌ تم رفض الإيداع`); 
    renderDepositsList(); 
    updateAdminStats(); 
};

window.adminApproveWithdraw = (username, idx) => {
    const users = loadUsers(); 
    const user = users[username]; 
    const req = user.withdrawRequests[idx];
    if (req && req.status === 'قيد المراجعة') { 
        const totalAmount = req.amount;
        if (user.balance >= totalAmount) { 
            user.balance -= totalAmount; 
            req.status = 'مكتمل'; 
            saveUsers(users); 
            showToast(`✅ تم قبول سحب ${totalAmount}$`); 
            renderWithdrawalsList(); 
            renderUsersList(); 
            updateAdminStats(); 
            if (currentUser.username === username) loadMainApp(); 
        } else showToast('الرصيد غير كافٍ', true);
    }
};

window.adminRejectWithdraw = (username, idx) => { 
    const users = loadUsers(); 
    users[username].withdrawRequests[idx].status = 'مرفوض'; 
    saveUsers(users); 
    showToast(`❌ تم رفض السحب`); 
    renderWithdrawalsList(); 
    updateAdminStats(); 
};

window.copyToClipboard = (text) => { 
    navigator.clipboard.writeText(text); 
    showToast('تم النسخ'); 
};

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeModals));
window.onclick = (event) => { 
    if (event.target.classList.contains('modal')) closeModals(); 
};

function confettiEffect() { 
    for (let i = 0; i < 40; i++) { 
        const p = document.createElement('div'); 
        p.style.cssText = `position:fixed;width:8px;height:8px;background:${['#667eea','#764ba2','#fbbf24','#10b981'][Math.floor(Math.random()*4)]};border-radius:50%;left:${Math.random()*window.innerWidth}px;top:-10px;pointer-events:none;z-index:9999`; 
        document.body.appendChild(p); 
        p.animate([
            {transform:'translateY(0px)',opacity:1},
            {transform:`translateY(${window.innerHeight+10}px) translateX(${(Math.random()-0.5)*100}px)`,opacity:0}
        ],{duration:Math.random()*1500+800}); 
        setTimeout(()=>p.remove(),2000); 
    } 
}

function logout() { 
    if (confirm('تسجيل الخروج؟')) { 
        if (countdownInterval) clearInterval(countdownInterval); 
        setCurrentUser(null); 
        location.reload(); 
    } 
}

// ========== تهيئة التطبيق ==========
async function initApp() {
    console.log('🚀 Initializing app...');
    try {
        await loadAllData();
    } catch (error) {
        console.log('⚠️ Using local data (Supabase connection failed)');
        loadLocalData();
    }
    initAuth();
    setCurrentUser(localStorage.getItem('currentSession'));
    if (getCurrentUser()) {
        loadMainApp();
    }
    console.log('✅ App initialized successfully');
}

// بدء التطبيق
initApp();
