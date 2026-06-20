// ========== إعدادات Supabase ==========
const SUPABASE_URL = 'https://nrpqukhxfistjizcorpp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycHF1a2h4ZmlzdGppemNvcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzkxNjgsImV4cCI6MjA5Njg1NTE2OH0.64HaEIKhJM-W4WEVrsOEuix1fKUswSHVyMKxyev9nGA';

// ========== دوال Supabase ==========
async function supabaseRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type':application/json',
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
        // تحميل المستخدمين
        const users = await supabaseRequest('users');
        if (users && users.length > 0) {
            const usersObj = {};
            users.forEach(u => {
                usersObj[u.username] = u;
            });
            localStorage.setItem('investUsers', JSON.stringify(usersObj));
            console.log('✅ Users loaded from Supabase:', Object.keys(usersObj).length);
        } else {
            console.log('⚠️ No users found in Supabase, using local data');
            loadLocalUsers();
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
            console.log('✅ Plans loaded from Supabase:', Object.keys(plansObj).length);
        } else {
            console.log('⚠️ No plans found in Supabase, using default plans');
            savePlansToSupabase();
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
        } else {
            console.log('⚠️ No settings found in Supabase, using default');
            saveSettingsToSupabase();
        }
        
        // تحميل ضرائب الباقات
        const taxes = await supabaseRequest('plan_taxes');
        if (taxes && taxes.length > 0) {
            taxes.forEach(t => {
                if (plans[t.plan_id]) {
                    plans[t.plan_id].withdrawTax = t.tax_percent || 0;
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error loading data from Supabase:', error);
        loadLocalData();
        return false;
    }
}

function loadLocalUsers() {
    const users = localStorage.getItem('investUsers');
    if (users) {
        const usersObj = JSON.parse(users);
        if (Object.keys(usersObj).length > 0) {
            return;
        }
    }
    // إنشاء مستخدم admin افتراضي
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
    // حفظ في Supabase
    saveAllUsersToSupabase(defaultUsers);
}

function loadLocalData() {
    loadSettings();
    loadPlans();
    loadLocalUsers();
}

// ========== حفظ البيانات إلى Supabase ==========
async function saveUserToSupabase(user) {
    try {
        console.log('📤 Saving user to Supabase:', user.username);
        const existing = await supabaseRequest(`users?username=eq.${user.username}`);
        if (existing && existing.length > 0) {
            await supabaseRequest(`users?username=eq.${user.username}`, 'PATCH', user);
            console.log('✅ User updated in Supabase:', user.username);
        } else {
            await supabaseRequest('users', 'POST', user);
            console.log('✅ User created in Supabase:', user.username);
        }
        return true;
    } catch (error) {
        console.error('❌ Error saving user to Supabase:', error);
        return false;
    }
}

async function saveAllUsersToSupabase(users) {
    try {
        console.log('📤 Saving all users to Supabase...');
        const promises = Object.values(users).map(async (user) => {
            try {
                const existing = await supabaseRequest(`users?username=eq.${user.username}`);
                if (existing && existing.length > 0) {
                    await supabaseRequest(`users?username=eq.${user.username}`, 'PATCH', user);
                } else {
                    await supabaseRequest('users', 'POST', user);
                }
                return true;
            } catch (err) {
                console.error('Error saving user:', user.username, err);
                return false;
            }
        });
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r).length;
        console.log(`✅ ${successCount}/${Object.keys(users).length} users saved to Supabase`);
        return true;
    } catch (error) {
        console.error('❌ Error saving all users to Supabase:', error);
        return false;
    }
}

async function savePlansToSupabase() {
    try {
        console.log('📤 Saving plans to Supabase...');
        const promises = Object.values(plans).map(async (plan) => {
            try {
                const existing = await supabaseRequest(`plans?id=eq.${plan.id}`);
                if (existing && existing.length > 0) {
                    await supabaseRequest(`plans?id=eq.${plan.id}`, 'PATCH', plan);
                } else {
                    await supabaseRequest('plans', 'POST', plan);
                }
                return true;
            } catch (err) {
                console.error('Error saving plan:', plan.id, err);
                return false;
            }
        });
        await Promise.all(promises);
        console.log('✅ Plans saved to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving plans to Supabase:', error);
        return false;
    }
}

async function saveSettingsToSupabase() {
    try {
        console.log('📤 Saving settings to Supabase...');
        const settings = {
            id: 1,
            referral_bonus: referralBonusAmount,
            alert_text: globalAlert.text || '',
            alert_link: globalAlert.link || '',
            alert_button_text: globalAlert.buttonText || '',
            alert_bg_color: globalAlert.bgColor || '#fef3c7',
            alert_enabled: globalAlert.enabled || false
        };
        const existing = await supabaseRequest('settings?id=eq.1');
        if (existing && existing.length > 0) {
            await supabaseRequest('settings?id=eq.1', 'PATCH', settings);
        } else {
            await supabaseRequest('settings', 'POST', settings);
        }
        console.log('✅ Settings saved to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving settings to Supabase:', error);
        return false;
    }
}

async function saveTaxToSupabase(planId, taxPercent) {
    try {
        const data = { plan_id: planId, tax_percent: taxPercent };
        const existing = await supabaseRequest(`plan_taxes?plan_id=eq.${planId}`);
        if (existing && existing.length > 0) {
            await supabaseRequest(`plan_taxes?plan_id=eq.${planId}`, 'PATCH', data);
        } else {
            await supabaseRequest('plan_taxes', 'POST', data);
        }
        return true;
    } catch (error) {
        console.error('Error saving tax to Supabase:', error);
        return false;
    }
}

// ========== دوال التخزين المحلي ==========
function saveUsersLocal() {
    const users = getUsersFromLocal();
    localStorage.setItem('investUsers', JSON.stringify(users));
}

function getUsersFromLocal() {
    const users = localStorage.getItem('investUsers');
    return users ? JSON.parse(users) : {};
}

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
    saveSettingsToSupabase();
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
    saveTaxToSupabase(planKey, plans[planKey].withdrawTax);
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
    // إنشاء مستخدم admin افتراضي
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
    // حفظ في Supabase
    saveAllUsersToSupabase(defaultUsers);
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
        errorEl.style.display = 'block';
        input.style.borderColor = '#ef4444';
    } else {
        errorEl.style.display = 'none';
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
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const recipientCode = document.getElementById('transferRecipientCode').value.trim();
    const detailsDiv = document.getElementById('transferDetails');
    
    if (!amount || amount < 1 || !recipientCode) {
        detailsDiv.style.display = 'none';
        return;
    }
    
    const taxPercent = 0.10;
    const taxAmount = amount * taxPercent;
    const totalDeduction = amount + taxAmount;
    
    document.getElementById('transferAmountDisplay').innerText = amount.toFixed(2);
    document.getElementById('transferTaxDisplay').innerText = taxAmount.toFixed(2);
    document.getElementById('transferTotalDisplay').innerText = totalDeduction.toFixed(2);
    document.getElementById('transferRecipientDisplay').innerText = amount.toFixed(2);
    detailsDiv.style.display = 'block';
}

async function transferBalance() {
    if (!currentUser) {
        showToast('الرجاء تسجيل الدخول أولاً', true);
        return;
    }
    
    const recipientCode = document.getElementById('transferRecipientCode').value.trim();
    const amount = parseFloat(document.getElementById('transferAmount').value);
    
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
    document.getElementById('transferRecipientCode').value = '';
    document.getElementById('transferAmount').value = '';
    document.getElementById('transferDetails').style.display = 'none';
}

function updateTransferPage() {
    if (!currentUser) {
        document.getElementById('transferBalance').innerText = '0';
        document.getElementById('transferHistoryList').innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">الرجاء تسجيل الدخول</div>';
        return;
    }
    
    document.getElementById('transferBalance').innerText = currentUser.balance.toFixed(2);
    
    const history = currentUser.transferHistory || [];
    if (history.length === 0) {
        document.getElementById('transferHistoryList').innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">لا توجد تحويلات</div>';
    } else {
        document.getElementById('transferHistoryList').innerHTML = history.slice(0, 10).map(t => {
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
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.getElementById(`${tabName}Form`).classList.add('active');
        });
    });
    
    document.getElementById('doLogin').addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const users = loadUsers();
        const user = users[username];
        if (user && user.password === password) { 
            setCurrentUser(username); 
            showToast(`مرحباً ${user.fullname || username}`);
            loadMainApp();
            if (user.role !== 'admin') {
                setTimeout(() => {
                    document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active'));
                    document.getElementById('homePage').classList.add('active');
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    document.querySelector('.nav-item[data-page="home"]').classList.add('active');
                    showGlobalAlert();
                    checkUserRestrictions();
                }, 100);
            }
        }
        else showToast('بيانات الدخول غير صحيحة', true);
    });
    
    document.getElementById('doRegister').addEventListener('click', async () => {
        const fullname = document.getElementById('regFullname').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const referralCode = document.getElementById('regReferralCode').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirmPassword').value;
        
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
            document.getElementById('homePage').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelector('.nav-item[data-page="home"]').classList.add('active');
            showGlobalAlert();
            checkUserRestrictions();
        }, 100);
    });
}

function loadMainApp() {
    currentUser = getCurrentUser();
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
        document.getElementById('homePage').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-page="home"]').classList.add('active');
        showGlobalAlert();
        checkUserRestrictions();
    }
}

// ========== صفحات المستخدم ==========
function loadUserPanel() {
    updateUserUI(); renderPlans(); updateSubscriptionPage(); updateProfitPage(); updateAccountPage(); updateDepositPage(); updateWithdrawPage(); updateTransferPage();
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active'));
            document.getElementById(pageId + 'Page').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            if (pageId === 'transfer') {
                updateTransferPage();
            }
        });
    });
    
    document.getElementById('collectProfitBtn')?.addEventListener('click', collectProfit);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('depositBtn')?.addEventListener('click', () => { 
        document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active')); 
        document.getElementById('depositRequestPage').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-page="depositRequest"]').classList.add('active');
    });
    document.getElementById('withdrawBtn')?.addEventListener('click', () => { 
        document.querySelectorAll('#userPages .page').forEach(p => p.classList.remove('active')); 
        document.getElementById('withdrawRequestPage').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-page="withdrawRequest"]').classList.add('active');
    });
    document.getElementById('copyReferralCode')?.addEventListener('click', () => { navigator.clipboard.writeText(currentUser.referralCode); showToast('تم نسخ كود الإحالة'); });
    document.getElementById('copyWalletAddress')?.addEventListener('click', () => { navigator.clipboard.writeText(TRC20_WALLET); showToast('تم نسخ عنوان المحفظة'); });
    document.getElementById('submitDepositRequest')?.addEventListener('click', submitDepositRequest);
    document.getElementById('submitWithdrawRequest')?.addEventListener('click', submitWithdrawRequest);
    document.getElementById('submitTransfer')?.addEventListener('click', transferBalance);
    document.getElementById('transferAmount')?.addEventListener('input', calculateTransferDetails);
    document.getElementById('transferRecipientCode')?.addEventListener('input', calculateTransferDetails);
}

function updateUserUI() { 
    document.getElementById('username').innerText = currentUser.fullname || currentUser.username; 
    document.getElementById('balance').innerText = currentUser.balance.toFixed(2); 
    document.getElementById('myReferralCode').innerText = currentUser.referralCode;
    document.getElementById('referralBonusAmount').innerText = referralBonusAmount;
}

function renderPlans() {
    const container = document.getElementById('plansContainer');
    if (!container) return;
    container.innerHTML = '';
    for (let [key, plan] of Object.entries(plans)) {
        const card = document.createElement('div');
        card.className = 'plan-card';
        const taxDisplay = plan.withdrawTax > 0 ? `<div class="plan-tax">💰 ضريبة سحب: ${plan.withdrawTax}%</div>` : '';
        card.innerHTML = `<div class="plan-info"><h3><i class="${plan.icon}" style="color:${plan.color}"></i> ${plan.name}</h3><div class="plan-price"><span class="price-value"><i class="fas fa-tag"></i> ${plan.price} $</span></div><div class="plan-profit"><span class="profit-value"><i class="fas fa-chart-line"></i> الربح اليومي: ${plan.dailyProfit} $</span></div><div class="plan-roi">عائد: ${((plan.dailyProfit/plan.price)*100).toFixed(1)}% يومياً</div>${taxDisplay}</div><button id="buy-${key}" ${currentUser.activePlan ? 'disabled' : ''}><i class="fas fa-shopping-cart"></i> اشتراك</button>`;
        container.appendChild(card);
        document.getElementById(`buy-${key}`)?.addEventListener('click', () => buyPlan(key));
    }
}

function buyPlan(planKey) {
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
            const users = loadUsers(); 
            users[currentUser.username] = currentUser; 
            saveUsers(users); 
            setCurrentUser(currentUser.username);
            checkAndGiveReferralBonus(currentUser.username);
            showToast(`تم الاشتراك في ${plan.name}`); 
            loadUserPanel();
        }
    } else showToast(`رصيد غير كافٍ`, true);
}

function collectProfit() {
    if (!currentUser.activePlan) return;
    if (currentUser.restrictProfit) {
        return showToast('⛔ جني الأرباح مقيد حالياً من قبل الإدارة', true);
    }
    const now = Date.now();
    if ((now - (currentUser.lastProfitClaim || 0)) >= (24 * 3600 * 1000)) {
        const profit = plans[currentUser.activePlan].dailyProfit;
        currentUser.balance += profit; 
        currentUser.totalProfit = (currentUser.totalProfit || 0) + profit; 
        currentUser.lastProfitClaim = now;
        const users = loadUsers(); 
        users[currentUser.username] = currentUser; 
        saveUsers(users); 
        setCurrentUser(currentUser.username);
        showToast(`تم جني ${profit}$`); 
        loadUserPanel(); 
        confettiEffect();
    } else showToast('لم يحن وقت جني الربح بعد', true);
}

// ... باقي الكود كما هو (لن يتغير) ...

// ========== تهيئة التطبيق ==========
async function initApp() {
    try {
        await loadAllData();
    } catch (error) {
        console.log('Using local data (Supabase connection failed)');
        loadLocalData();
    }
    initAuth();
    setCurrentUser(localStorage.getItem('currentSession'));
    if (getCurrentUser()) {
        loadMainApp();
    }
}

initApp();
