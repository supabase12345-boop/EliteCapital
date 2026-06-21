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
// التنبيه العالمي
// ============================================
function showGlobalAlert() {
    const alertDiv = document.getElementById('globalAlert');
    if (!alertDiv) return;
    if (globalAlert.enabled && globalAlert.text && globalAlert.text.trim() !== '') {
        const msgEl = document.getElementById('alertMessage');
        if (msgEl) msgEl.innerHTML = globalAlert.text;
        alertDiv.style.background = globalAlert.bgColor;
        alertDiv.style.display = 'flex';
        const btn = document.getElementById('alertButton');
        if (globalAlert.link && globalAlert.buttonText && btn) {
            btn.style.display = 'inline-block';
            btn.href = globalAlert.link;
            btn.textContent = globalAlert.buttonText;
        } else if (btn) {
            btn.style.display = 'none';
        }
    } else {
        alertDiv.style.display = 'none';
    }
}

window.closeGlobalAlert = function() {
    const alertDiv = document.getElementById('globalAlert');
    if (alertDiv) alertDiv.style.display = 'none';
};

function checkUserRestrictions() {
    if (!currentUser) return;
    const alertDiv = document.getElementById('restrictionAlert');
    const messageEl = document.getElementById('restrictionMessage');
    if (!alertDiv || !messageEl) return;
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

    document.getElementById('doRegister').addEventListener('click', async () => {
        const fullname = document.getElementById('regFullname').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const referralCode = document.getElementById('regReferralCode').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirmPassword').value;

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
            const users = await getUsers();
            
            if (users[username]) {
                return showToast('⚠️ اسم المستخدم موجود بالفعل', true);
            }

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

            users[username] = newUser;
            await saveUsers(users);
            
            if (referralCode) {
                await processReferral(username, referralCode);
            }
            
            await setCurrentUser(username);
            showToast(`✅ مرحباً ${fullname}! تم إنشاء حسابك بنجاح`);
            
            setTimeout(() => {
                loadMainApp();
            }, 500);

        } catch (error) {
            console.error('❌ خطأ في إنشاء الحساب:', error);
            showToast('❌ فشل إنشاء الحساب. حاول مرة أخرى', true);
        }
    });
}

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
// تحميل التطبيق الرئيسي
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
// صفحات المستخدم
// ============================================
function loadUserPanel() {
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
    
    const copyReferral = document.getElementById('copyReferralCode');
    if (copyReferral) {
        copyReferral.addEventListener('click', () => { 
            if (currentUser) {
                navigator.clipboard.writeText(currentUser.referralCode); 
                showToast('تم نسخ كود الإحالة');
            }
        });
    }
    
    const copyWallet = document.getElementById('copyWalletAddress');
    if (copyWallet) {
        copyWallet.addEventListener('click', () => { 
            navigator.clipboard.writeText(TRC20_WALLET); 
            showToast('تم نسخ عنوان المحفظة'); 
        });
    }
    
    const submitDeposit = document.getElementById('submitDepositRequest');
    if (submitDeposit) submitDeposit.addEventListener('click', submitDepositRequest);
    
    const submitWithdraw = document.getElementById('submitWithdrawRequest');
    if (submitWithdraw) submitWithdraw.addEventListener('click', submitWithdrawRequest);
    
    const submitTransfer = document.getElementById('submitTransfer');
    if (submitTransfer) submitTransfer.addEventListener('click', transferBalance);
    
    const transferAmount = document.getElementById('transferAmount');
    if (transferAmount) transferAmount.addEventListener('input', calculateTransferDetails);
    
    const transferRecipient = document.getElementById('transferRecipientCode');
    if (transferRecipient) transferRecipient.addEventListener('input', calculateTransferDetails);
}

function updateUserUI() { 
    const usernameEl = document.getElementById('username');
    const balanceEl = document.getElementById('balance');
    const referralCodeEl = document.getElementById('myReferralCode');
    const bonusEl = document.getElementById('referralBonusAmount');
    
    if (usernameEl && currentUser) usernameEl.innerText = currentUser.fullname || currentUser.username;
    if (balanceEl && currentUser) balanceEl.innerText = currentUser.balance.toFixed(2);
    if (referralCodeEl && currentUser) referralCodeEl.innerText = currentUser.referralCode;
    if (bonusEl) bonusEl.innerText = referralBonusAmount;
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

async function buyPlan(planKey) {
    if (!currentUser) return showToast('الرجاء تسجيل الدخول أولاً', true);
    if (currentUser.activePlan) return showToast('لديك باقة نشطة بالفعل', true);
    const plan = plans[planKey];
    if (!plan) return showToast('الباقة غير موجودة', true);
    if (currentUser.balance >= plan.price) {
        if (confirm(`شراء باقة ${plan.name} بـ ${plan.price}$؟`)) {
            currentUser.balance -= plan.price;
            currentUser.activePlan = planKey;
            currentUser.lastProfitClaim = Date.now();
            currentUser.subscriptionDate = Date.now();
            currentUser.totalInvested = (currentUser.totalInvested || 0) + plan.price;
            if (!currentUser.subscriptionHistory) currentUser.subscriptionHistory = [];
            currentUser.subscriptionHistory.unshift({ planName: plan.name, price: plan.price, date: Date.now() });
            const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
            users[currentUser.username] = currentUser;
            await saveUsers(users);
            await setCurrentUser(currentUser.username);
            checkAndGiveReferralBonus(currentUser.username);
            showToast(`تم الاشتراك في ${plan.name}`);
            loadUserPanel();
        }
    } else showToast(`رصيد غير كافٍ`, true);
}

async function collectProfit() {
    if (!currentUser) return showToast('الرجاء تسجيل الدخول', true);
    if (!currentUser.activePlan) return showToast('لا توجد باقة نشطة', true);
    if (currentUser.restrictProfit) {
        return showToast('⛔ جني الأرباح مقيد حالياً من قبل الإدارة', true);
    }
    const now = Date.now();
    if ((now - (currentUser.lastProfitClaim || 0)) >= (24 * 3600 * 1000)) {
        const profit = plans[currentUser.activePlan]?.dailyProfit || 0;
        if (profit <= 0) return showToast('خطأ في حساب الربح', true);
        currentUser.balance += profit;
        currentUser.totalProfit = (currentUser.totalProfit || 0) + profit;
        currentUser.lastProfitClaim = now;
        const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
        users[currentUser.username] = currentUser;
        await saveUsers(users);
        await setCurrentUser(currentUser.username);
        showToast(`تم جني ${profit}$`);
        loadUserPanel();
        confettiEffect();
    } else showToast('لم يحن وقت جني الربح بعد', true);
}

function checkAndGiveReferralBonus(username) {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
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

// ============================================
// طلب إيداع - نسخة معدلة
// ============================================
async function submitDepositRequest() {
    if (!currentUser) return showToast('الرجاء تسجيل الدخول', true);
    
    const amount = parseFloat(document.getElementById('depositAmountRequest')?.value);
    const txid = document.getElementById('depositTxid')?.value.trim();
    
    if (!amount || amount < 10) return showToast('المبلغ 10$ كحد أدنى', true);
    if (!txid) return showToast('أدخل معرف المعاملة', true);
    
    const depositRequest = {
        amount: amount,
        txid: txid,
        date: Date.now(),
        status: 'قيد المراجعة'
    };
    
    if (!currentUser.depositRequests) currentUser.depositRequests = [];
    currentUser.depositRequests.unshift(depositRequest);
    
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    users[currentUser.username] = currentUser;
    await saveUsers(users);
    await setCurrentUser(currentUser.username);
    
    showToast('✅ تم تقديم طلب الإيداع، سيتم مراجعته');
    
    const amountInput = document.getElementById('depositAmountRequest');
    const txidInput = document.getElementById('depositTxid');
    if (amountInput) amountInput.value = '';
    if (txidInput) txidInput.value = '';
    
    updateDepositPage();
}

// ============================================
// طلب سحب - نسخة معدلة
// ============================================
async function submitWithdrawRequest() {
    if (!currentUser) return showToast('الرجاء تسجيل الدخول', true);
    
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
        amount: amount, 
        taxAmount: taxAmount, 
        netAmount: netAmount, 
        taxPercent: taxPercent,
        walletAddress, 
        date: Date.now(), 
        status: 'قيد المراجعة' 
    });
    
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    users[currentUser.username] = currentUser;
    await saveUsers(users);
    await setCurrentUser(currentUser.username);
    
    showToast('تم تقديم طلب السحب، سيتم مراجعته');
    
    const amountInput = document.getElementById('withdrawAmountRequest');
    const walletInput = document.getElementById('withdrawWalletAddress');
    if (amountInput) amountInput.value = '';
    if (walletInput) walletInput.value = '';
    
    updateWithdrawPage();
}

// ============================================
// قبول طلب الإيداع - نسخة معدلة
// ============================================
window.adminApproveDeposit = async (username, idx) => {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const user = users[username];
    const req = user?.depositRequests?.[idx];
    
    if (req && req.status === 'قيد المراجعة') {
        user.balance = (parseFloat(user.balance) || 0) + parseFloat(req.amount);
        req.status = 'مكتمل';
        
        localStorage.setItem('investUsers', JSON.stringify(users));
        await saveUser(user);
        
        showToast(`✅ تم قبول إيداع ${req.amount}$ للمستخدم ${user.fullname}`);
        renderDepositsList();
        renderUsersList();
        updateAdminStats();
        
        if (currentUser && currentUser.username === username) {
            currentUser = user;
            await setCurrentUser(username);
            loadUserPanel();
        }
    }
};

// ============================================
// رفض طلب الإيداع
// ============================================
window.adminRejectDeposit = async (username, idx) => {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const req = users[username]?.depositRequests?.[idx];
    
    if (req) {
        req.status = 'مرفوض';
        
        localStorage.setItem('investUsers', JSON.stringify(users));
        await saveUser(users[username]);
        
        showToast(`❌ تم رفض الإيداع`);
        renderDepositsList();
        updateAdminStats();
    }
};

// ============================================
// قبول طلب السحب
// ============================================
window.adminApproveWithdraw = async (username, idx) => {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const user = users[username];
    const req = user?.withdrawRequests?.[idx];
    
    if (req && req.status === 'قيد المراجعة') {
        const totalAmount = req.amount;
        if (user.balance >= totalAmount) {
            user.balance -= totalAmount;
            req.status = 'مكتمل';
            
            localStorage.setItem('investUsers', JSON.stringify(users));
            await saveUser(user);
            
            showToast(`✅ تم قبول سحب ${totalAmount}$`);
            renderWithdrawalsList();
            renderUsersList();
            updateAdminStats();
            
            if (currentUser && currentUser.username === username) {
                currentUser = user;
                await setCurrentUser(username);
                loadUserPanel();
            }
        } else {
            showToast('الرصيد غير كافٍ', true);
        }
    }
};

// ============================================
// رفض طلب السحب
// ============================================
window.adminRejectWithdraw = async (username, idx) => {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const req = users[username]?.withdrawRequests?.[idx];
    
    if (req) {
        req.status = 'مرفوض';
        
        localStorage.setItem('investUsers', JSON.stringify(users));
        await saveUser(users[username]);
        
        showToast(`❌ تم رفض السحب`);
        renderWithdrawalsList();
        updateAdminStats();
    }
};

// ============================================
// تعديل رصيد المستخدم
// ============================================
function openEditBalanceModal(username) {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const user = users[username];
    if (!user) {
        showToast('المستخدم غير موجود', true);
        return;
    }
    
    document.getElementById('editBalanceUsername').value = username;
    document.getElementById('editBalanceAmount').value = user.balance || 0;
    
    const modal = document.getElementById('editBalanceModal');
    if (modal) modal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmEditBalance');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.onclick = async function() {
        const newBalance = parseFloat(document.getElementById('editBalanceAmount').value);
        if (isNaN(newBalance) || newBalance < 0) {
            showToast('الرجاء إدخال قيمة صحيحة', true);
            return;
        }
        
        const users2 = JSON.parse(localStorage.getItem('investUsers') || '{}');
        const user2 = users2[username];
        if (!user2) {
            showToast('المستخدم غير موجود', true);
            return;
        }
        
        user2.balance = newBalance;
        
        localStorage.setItem('investUsers', JSON.stringify(users2));
        await saveUser(user2);
        
        showToast(`✅ تم تحديث رصيد ${user2.fullname} إلى ${newBalance}$`);
        renderUsersList();
        updateAdminStats();
        closeModals();
        
        if (currentUser && currentUser.username === username) {
            currentUser = user2;
            await setCurrentUser(username);
            loadUserPanel();
        }
    };
}

// ============================================
// عرض طلبات الإيداع
// ============================================
function renderDepositsList() {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const pendingContainer = document.getElementById('depositsRequestsList');
    const completedContainer = document.getElementById('depositsCompletedList');
    
    if (!pendingContainer || !completedContainer) return;
    pendingContainer.innerHTML = '';
    completedContainer.innerHTML = '';
    
    let hasPending = false;
    let hasCompleted = false;
    
    Object.entries(users).forEach(([username, user]) => {
        (user.depositRequests || []).forEach((req, idx) => {
            let statusHtml = '';
            
            if (req.status === 'قيد المراجعة') {
                hasPending = true;
                statusHtml = `<div class="request-actions">
                    <button class="btn-approve" onclick="adminApproveDeposit('${username}',${idx})">✅ قبول</button>
                    <button class="btn-reject" onclick="adminRejectDeposit('${username}',${idx})">❌ رفض</button>
                </div>`;
            } else if (req.status === 'مكتمل') {
                hasCompleted = true;
                statusHtml = `<div class="request-status" style="color:#10b981">✅ مكتمل</div>`;
            } else if (req.status === 'مرفوض') {
                hasCompleted = true;
                statusHtml = `<div class="request-status" style="color:#ef4444">❌ مرفوض</div>`;
            }
            
            const div = document.createElement('div');
            div.className = 'request-item';
            div.innerHTML = `
                <div>
                    <strong>${user.fullname}</strong>
                    <br><small>@${username}</small>
                    <br><small>📧 ${user.email || '--'}</small>
                    <br>💰 ${req.amount}$
                    <br>🆔 ${req.txid || '--'}
                    <br>📅 ${new Date(req.date).toLocaleString()}
                    <br><span style="color:${req.status === 'قيد المراجعة' ? '#f59e0b' : req.status === 'مكتمل' ? '#10b981' : '#ef4444'}">الحالة: ${req.status}</span>
                </div>
                ${statusHtml}
            `;
            
            if (req.status === 'قيد المراجعة') {
                pendingContainer.appendChild(div);
            } else {
                completedContainer.appendChild(div);
            }
        });
    });
    
    if (!hasPending) {
        pendingContainer.innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">✨ لا توجد طلبات قيد المراجعة</div>';
    }
    if (!hasCompleted) {
        completedContainer.innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">📋 لا توجد طلبات منتهية</div>';
    }
}

// ============================================
// عرض طلبات السحب
// ============================================
function renderWithdrawalsList() {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const pendingContainer = document.getElementById('withdrawalsRequestsList');
    const completedContainer = document.getElementById('withdrawalsCompletedList');
    
    if (!pendingContainer || !completedContainer) return;
    pendingContainer.innerHTML = '';
    completedContainer.innerHTML = '';
    
    let hasPending = false;
    let hasCompleted = false;
    
    Object.entries(users).forEach(([username, user]) => {
        (user.withdrawRequests || []).forEach((req, idx) => {
            let statusHtml = '';
            
            if (req.status === 'قيد المراجعة') {
                hasPending = true;
                statusHtml = `<div class="request-actions">
                    <button class="btn-approve" onclick="adminApproveWithdraw('${username}',${idx})">✅ قبول</button>
                    <button class="btn-reject" onclick="adminRejectWithdraw('${username}',${idx})">❌ رفض</button>
                </div>`;
            } else if (req.status === 'مكتمل') {
                hasCompleted = true;
                statusHtml = `<div class="request-status" style="color:#10b981">✅ مكتمل</div>`;
            } else if (req.status === 'مرفوض') {
                hasCompleted = true;
                statusHtml = `<div class="request-status" style="color:#ef4444">❌ مرفوض</div>`;
            }
            
            const div = document.createElement('div');
            div.className = 'request-item';
            const taxInfo = req.taxPercent > 0 ? ` (ضريبة ${req.taxPercent}% = ${req.taxAmount.toFixed(2)}$)` : '';
            const walletShort = req.walletAddress ? req.walletAddress.substring(0,20) + '...' : '--';
            
            div.innerHTML = `
                <div>
                    <strong>${user.fullname}</strong>
                    <br><small>@${username}</small>
                    <br><small>📧 ${user.email || '--'}</small>
                    <br>💰 ${req.amount}$ ${taxInfo}
                    <br>🏦 ${walletShort}
                    <br>📅 ${new Date(req.date).toLocaleString()}
                    <br><span style="color:${req.status === 'قيد المراجعة' ? '#f59e0b' : req.status === 'مكتمل' ? '#10b981' : '#ef4444'}">الحالة: ${req.status}</span>
                </div>
                ${statusHtml}
            `;
            
            if (req.status === 'قيد المراجعة') {
                pendingContainer.appendChild(div);
            } else {
                completedContainer.appendChild(div);
            }
        });
    });
    
    if (!hasPending) {
        pendingContainer.innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">✨ لا توجد طلبات سحب قيد المراجعة</div>';
    }
    if (!hasCompleted) {
        completedContainer.innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">📋 لا توجد طلبات سحب منتهية</div>';
    }
}

// ============================================
// باقي دوال المستخدم
// ============================================
function updateProfitPage() {
    const totalEl = document.getElementById('totalProfitAmount');
    const todayEl = document.getElementById('todayProfit');
    const nextEl = document.getElementById('nextProfitAmount');
    
    if (totalEl && currentUser) totalEl.innerText = (currentUser.totalProfit || 0).toFixed(2);
    
    let todayProfit = 0;
    if (currentUser && currentUser.activePlan && currentUser.lastProfitClaim && 
        new Date(currentUser.lastProfitClaim).toDateString() === new Date().toDateString()) {
        todayProfit = plans[currentUser.activePlan]?.dailyProfit || 0;
    }
    if (todayEl) todayEl.innerText = todayProfit.toFixed(2);
    
    if (currentUser && currentUser.activePlan && nextEl) {
        nextEl.innerText = plans[currentUser.activePlan]?.dailyProfit || 0;
        updateTimer();
    }
}

function updateTimer() {
    const btn = document.getElementById('collectProfitBtn');
    const infoEl = document.getElementById('nextProfitInfo');
    if (!currentUser || !currentUser.activePlan) { 
        if (btn) btn.disabled = true; 
        if (infoEl) infoEl.innerText = 'لا توجد باقة';
        return; 
    }
    if (currentUser.restrictProfit) {
        if (btn) btn.disabled = true;
        if (infoEl) infoEl.innerText = '🔒 مقيد';
        return;
    }
    const remaining = (currentUser.lastProfitClaim + 24*3600*1000) - Date.now();
    if (remaining <= 0) { 
        if (btn) btn.disabled = false; 
        if (infoEl) infoEl.innerText = 'جاهز!'; 
    } else { 
        if (btn) btn.disabled = true; 
        if (countdownInterval) clearInterval(countdownInterval); 
        let ms = remaining; 
        const update = () => { 
            if (ms <= 0) { 
                clearInterval(countdownInterval); 
                if (infoEl) infoEl.innerText = 'جاهز!'; 
                if (btn) btn.disabled = false; 
                return; 
            } 
            const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000); 
            if (infoEl) infoEl.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; 
            ms -= 1000; 
        }; 
        update(); 
        countdownInterval = setInterval(update, 1000); 
    }
}

function updateSubscriptionPage() {
    const container = document.getElementById('subscriptionCard');
    const historyEl = document.getElementById('subscriptionHistory');
    if (!container || !historyEl) return;
    
    if (!currentUser || !currentUser.activePlan) { 
        container.innerHTML = `<div style="text-align:center;padding:2rem"><i class="fas fa-ticket-alt" style="font-size:3rem"></i><p>لا توجد باقة نشطة</p></div>`; 
        return; 
    }
    const plan = plans[currentUser.activePlan];
    if (!plan) return;
    const taxDisplay = plan.withdrawTax > 0 ? `<p style="color:#f59e0b">💰 ضريبة السحب: ${plan.withdrawTax}%</p>` : '';
    container.innerHTML = `<div style="text-align:center"><i class="${plan.icon}" style="font-size:3rem;color:${plan.color}"></i><h2>${plan.name}</h2><p style="color:#dc2626">💰 ${plan.price}$</p><p style="color:#10b981">📈 ${plan.dailyProfit}$/يوم</p>${taxDisplay}</div>`;
    
    const history = currentUser.subscriptionHistory || [];
    historyEl.innerHTML = history.map(h => `<div class="info-row"><span>${h.planName}</span><span>${h.price}$</span><span>${new Date(h.date).toLocaleDateString()}</span></div>`).join('') || '<div>لا يوجد سجل</div>';
}

function updateAccountPage() {
    if (!currentUser) return;
    const nameEl = document.getElementById('accountName');
    const usernameEl = document.getElementById('accountUsername');
    const emailEl = document.getElementById('accountEmail');
    const balanceEl = document.getElementById('accountBalance');
    const profitEl = document.getElementById('accountTotalProfit');
    const planEl = document.getElementById('accountCurrentPlan');
    const bonusEl = document.getElementById('referralBonus');
    const referredEl = document.getElementById('referredByDisplay');
    
    if (nameEl) nameEl.innerText = currentUser.fullname;
    if (usernameEl) usernameEl.innerText = currentUser.username;
    if (emailEl) emailEl.innerText = currentUser.email;
    if (balanceEl) balanceEl.innerText = currentUser.balance.toFixed(2);
    if (profitEl) profitEl.innerText = (currentUser.totalProfit || 0).toFixed(2);
    if (planEl) planEl.innerText = currentUser.activePlan ? plans[currentUser.activePlan]?.name || 'لا توجد' : 'لا توجد';
    if (bonusEl) bonusEl.innerText = (currentUser.referralBonus || 0).toFixed(2);
    
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    if (currentUser.referredBy && referredEl) {
        const referrer = users[currentUser.referredBy];
        referredEl.innerHTML = referrer ? `<span style="color:#8b5cf6;font-weight:700;">${referrer.fullname}</span> (@${referrer.username})` : '--';
    } else if (referredEl) {
        referredEl.innerText = '--';
    }
}

function updateDepositPage() { 
    if (!currentUser) return;
    const history = currentUser.depositRequests || [];
    const historyEl = document.getElementById('depositHistoryList');
    if (!historyEl) return;
    historyEl.innerHTML = history.map(r => {
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
    const balanceEl = document.getElementById('withdrawBalance');
    if (balanceEl) balanceEl.innerText = currentUser.balance.toFixed(2);
    
    const history = currentUser.withdrawRequests || [];
    const historyEl = document.getElementById('withdrawHistoryList');
    if (!historyEl) return;
    historyEl.innerHTML = history.map(r => {
        let statusClass = '';
        let statusIcon = '';
        if (r.status === 'مكتمل') { statusClass = 'color: #10b981'; statusIcon = '✅'; }
        else if (r.status === 'مرفوض') { statusClass = 'color: #ef4444'; statusIcon = '❌'; }
        else { statusClass = 'color: #f59e0b'; statusIcon = '⏳'; }
        const walletShort = r.walletAddress ? r.walletAddress.substring(0,15) + '...' : '--';
        return `<div class="info-row"><span>${r.amount}$</span><span>${walletShort}</span><span style="${statusClass}">${statusIcon} ${r.status}</span><span>${new Date(r.date).toLocaleString()}</span></div>`;
    }).join('') || '<div>لا توجد طلبات</div>';
}

// ============================================
// دوال التحويل
// ============================================
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
    
    const amountDisplay = document.getElementById('transferAmountDisplay');
    const taxDisplay = document.getElementById('transferTaxDisplay');
    const totalDisplay = document.getElementById('transferTotalDisplay');
    const recipientDisplay = document.getElementById('transferRecipientDisplay');
    
    if (amountDisplay) amountDisplay.innerText = amount.toFixed(2);
    if (taxDisplay) taxDisplay.innerText = taxAmount.toFixed(2);
    if (totalDisplay) totalDisplay.innerText = totalDeduction.toFixed(2);
    if (recipientDisplay) recipientDisplay.innerText = amount.toFixed(2);
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
    
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    
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
    
    if (!confirm(`تأكيد تحويل ${amount}$ إلى المستخدم ${recipient.fullname}?`)) {
        return;
    }
    
    currentUser.balance -= totalDeduction;
    recipient.balance += amount;
    
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
    
    users[currentUser.username] = currentUser;
    users[recipientUsername] = recipient;
    await saveUsers(users);
    await setCurrentUser(currentUser.username);
    showToast(`✅ تم تحويل ${amount}$ إلى ${recipient.fullname} بنجاح`);
    loadUserPanel();
    updateTransferPage();
}

function updateTransferPage() {
    if (!currentUser) {
        const balanceEl = document.getElementById('transferBalance');
        const historyEl = document.getElementById('transferHistoryList');
        if (balanceEl) balanceEl.innerText = '0';
        if (historyEl) historyEl.innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">الرجاء تسجيل الدخول</div>';
        return;
    }
    
    const balanceEl = document.getElementById('transferBalance');
    if (balanceEl) balanceEl.innerText = currentUser.balance.toFixed(2);
    
    const history = currentUser.transferHistory || [];
    const historyEl = document.getElementById('transferHistoryList');
    if (!historyEl) return;
    
    if (history.length === 0) {
        historyEl.innerHTML = '<div style="padding:1rem;text-align:center;color:#718096;">لا توجد تحويلات</div>';
    } else {
        historyEl.innerHTML = history.slice(0, 10).map(t => {
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

// ============================================
// لوحة الادمن
// ============================================
function loadAdminPanel() {
    const nameEl = document.getElementById('adminName');
    if (nameEl && currentUser) nameEl.innerHTML = `مرحباً ${currentUser.fullname}`;
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
    
    const saveBonus = document.getElementById('saveReferralBonus');
    if (saveBonus) saveBonus.addEventListener('click', saveReferralBonusSettings);
    
    const saveTax = document.getElementById('saveTaxSettings');
    if (saveTax) saveTax.addEventListener('click', saveTaxSettings);
    
    const saveAlert = document.getElementById('saveAlertSettings');
    if (saveAlert) saveAlert.addEventListener('click', saveAlertSettings);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function updateAdminStats() {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    let totalUsers = 0, totalInvested = 0, totalProfit = 0, pending = 0;
    Object.values(users).forEach(u => {
        if (u.role !== 'admin') { 
            totalUsers++; 
            totalInvested += parseFloat(u.totalInvested) || 0; 
            totalProfit += parseFloat(u.totalProfit) || 0; 
        }
        (u.depositRequests || []).forEach(r => { if(r.status === 'قيد المراجعة') pending++; });
        (u.withdrawRequests || []).forEach(r => { if(r.status === 'قيد المراجعة') pending++; });
    });
    const totalUsersEl = document.getElementById('adminTotalUsers');
    const totalInvestedEl = document.getElementById('adminTotalInvested');
    const totalProfitEl = document.getElementById('adminTotalProfit');
    const pendingEl = document.getElementById('adminPendingRequests');
    if (totalUsersEl) totalUsersEl.innerText = totalUsers;
    if (totalInvestedEl) totalInvestedEl.innerText = totalInvested.toFixed(2);
    if (totalProfitEl) totalProfitEl.innerText = totalProfit.toFixed(2);
    if (pendingEl) pendingEl.innerText = pending;
}

function renderUsersList(search = '') {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
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
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
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
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const user = users[username];
    if (!user) return;
    
    document.getElementById('restrictUsername').value = username;
    document.getElementById('restrictWithdraw').value = user.restrictWithdraw ? '1' : '0';
    document.getElementById('restrictProfit').value = user.restrictProfit ? '1' : '0';
    
    const modal = document.getElementById('restrictUserModal');
    if (modal) modal.style.display = 'flex';
    
    document.getElementById('confirmRestrict').onclick = async () => {
        const users2 = JSON.parse(localStorage.getItem('investUsers') || '{}');
        const user2 = users2[username];
        user2.restrictWithdraw = document.getElementById('restrictWithdraw').value === '1';
        user2.restrictProfit = document.getElementById('restrictProfit').value === '1';
        await saveUsers(users2);
        showToast(`تم تحديث تقييد المستخدم ${username}`);
        closeModals();
        renderUsersList();
        if (currentUser && currentUser.username === username) {
            currentUser = user2;
            await setCurrentUser(username);
            checkUserRestrictions();
        }
    };
}

// ============================================
// دوال إدارة الباقات - الادمن
// ============================================
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

function openAddPlanModal() {
    document.getElementById('newPlanName').value = '';
    document.getElementById('newPlanPrice').value = '';
    document.getElementById('newPlanProfit').value = '';
    document.getElementById('newPlanTax').value = '0';
    document.getElementById('newPlanColor').value = '#667eea';
    document.getElementById('newPlanIcon').value = 'fas fa-star';
    
    const modal = document.getElementById('addPlanModal');
    if (modal) modal.style.display = 'flex';
    
    document.getElementById('confirmAddPlan').onclick = async () => {
        const name = document.getElementById('newPlanName')?.value.trim();
        const price = parseFloat(document.getElementById('newPlanPrice')?.value);
        const profit = parseFloat(document.getElementById('newPlanProfit')?.value);
        const tax = parseFloat(document.getElementById('newPlanTax')?.value) || 0;
        const color = document.getElementById('newPlanColor')?.value || '#667eea';
        const icon = document.getElementById('newPlanIcon')?.value || 'fas fa-star';
        
        if (!name || isNaN(price) || isNaN(profit)) return showToast('املأ جميع الحقول', true);
        const newKey = 'plan' + Date.now();
        plans[newKey] = { id: newKey, name, price, dailyProfit: profit, icon, color, withdrawTax: tax };
        await savePlansToSupabase();
        renderPlansSettings();
        loadSettingsToAdmin();
        showToast('تم إضافة الباقة');
        closeModals();
        renderPlans();
    };
}

function openEditPlanModal(key) {
    const plan = plans[key];
    if (!plan) return;
    
    document.getElementById('editPlanKey').value = key;
    document.getElementById('editPlanName').value = plan.name;
    document.getElementById('editPlanPrice').value = plan.price;
    document.getElementById('editPlanProfit').value = plan.dailyProfit;
    document.getElementById('editPlanTax').value = plan.withdrawTax || 0;
    document.getElementById('editPlanColor').value = plan.color;
    document.getElementById('editPlanIcon').value = plan.icon;
    
    const modal = document.getElementById('editPlanModal');
    if (modal) modal.style.display = 'flex';
    
    document.getElementById('confirmEditPlan').onclick = async () => {
        plans[key].name = document.getElementById('editPlanName').value;
        plans[key].price = parseFloat(document.getElementById('editPlanPrice').value);
        plans[key].dailyProfit = parseFloat(document.getElementById('editPlanProfit').value);
        plans[key].withdrawTax = parseFloat(document.getElementById('editPlanTax').value) || 0;
        plans[key].color = document.getElementById('editPlanColor').value;
        plans[key].icon = document.getElementById('editPlanIcon').value;
        await savePlansToSupabase();
        renderPlansSettings();
        loadSettingsToAdmin();
        showToast('تم تعديل الباقة');
        closeModals();
        renderPlans();
    };
    
    document.getElementById('deletePlanBtn').onclick = () => deletePlan(key);
}

async function deletePlan(key) {
    if (key === 'vip1' || key === 'vip2' || key === 'vip3' || key === 'vip4') {
        return showToast('لا يمكن حذف الباقات الأساسية', true);
    }
    if (confirm('هل أنت متأكد من حذف هذه الباقة؟')) {
        delete plans[key];
        await savePlansToSupabase();
        renderPlansSettings();
        loadSettingsToAdmin();
        showToast('تم حذف الباقة');
        closeModals();
        renderPlans();
    }
}

async function savePlansToSupabase() {
    localStorage.setItem('plansSettings', JSON.stringify(plans));
    for (let [key, plan] of Object.entries(plans)) {
        try {
            await supabaseRequest('plans', 'POST', {
                id: plan.id,
                name: plan.name,
                price: plan.price,
                dailyprofit: plan.dailyProfit,
                icon: plan.icon,
                color: plan.color
            });
            await supabaseRequest('plan_taxes', 'POST', {
                plan_id: key,
                tax_percent: plan.withdrawTax || 0
            });
        } catch (e) {
            console.log('خطأ في حفظ الباقة:', e);
        }
    }
}

// ============================================
// إعدادات الادمن
// ============================================
function loadSettingsToAdmin() {
    document.getElementById('adminReferralBonus').value = referralBonusAmount;
    document.getElementById('adminAlertText').value = globalAlert.text || '';
    document.getElementById('adminAlertLink').value = globalAlert.link || '';
    document.getElementById('adminAlertButtonText').value = globalAlert.buttonText || '';
    document.getElementById('adminAlertBgColor').value = globalAlert.bgColor || '#fef3c7';
    document.getElementById('adminAlertEnabled').value = globalAlert.enabled ? 'true' : 'false';
    
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
    const value = parseFloat(document.getElementById('adminReferralBonus').value);
    if (!isNaN(value) && value >= 0) {
        referralBonusAmount = value;
        saveSettingsToSupabase();
        showToast(`تم حفظ مكافأة الإحالة: ${value}$`);
        document.getElementById('referralBonusAmount').innerText = value;
    } else {
        showToast('قيمة غير صالحة', true);
    }
}

function saveTaxSettings() {
    for (let [key] of Object.entries(plans)) {
        const input = document.getElementById(`tax-${key}`);
        if (!input) continue;
        const taxValue = parseFloat(input.value);
        if (!isNaN(taxValue) && taxValue >= 0 && taxValue <= 100) {
            plans[key].withdrawTax = taxValue;
        }
    }
    savePlansToSupabase();
    showToast('تم حفظ إعدادات الضريبة');
    renderPlansSettings();
    renderPlans();
}

function saveAlertSettings() {
    globalAlert.text = document.getElementById('adminAlertText').value;
    globalAlert.link = document.getElementById('adminAlertLink').value;
    globalAlert.buttonText = document.getElementById('adminAlertButtonText').value;
    globalAlert.bgColor = document.getElementById('adminAlertBgColor').value;
    globalAlert.enabled = document.getElementById('adminAlertEnabled').value === 'true';
    saveSettingsToSupabase();
    showToast('تم حفظ إعدادات التنبيه');
    if (currentUser && currentUser.role !== 'admin') showGlobalAlert();
}

function saveSettingsToSupabase() {
    localStorage.setItem('systemSettings', JSON.stringify({
        referralBonusAmount: referralBonusAmount,
        globalAlert: globalAlert
    }));
    supabaseRequest('settings', 'POST', {
        id: 1,
        referral_bonus: referralBonusAmount,
        alert_text: globalAlert.text,
        alert_link: globalAlert.link,
        alert_button_text: globalAlert.buttonText,
        alert_bg_color: globalAlert.bgColor,
        alert_enabled: globalAlert.enabled
    }).catch(() => {});
}

function openUpgradePlanModal(username) {
    const users = JSON.parse(localStorage.getItem('investUsers') || '{}');
    const user = users[username];
    if (!user) return;
    
    const select = document.getElementById('upgradePlanSelect');
    if (!select) return;
    select.innerHTML = '';
    for (let [key, plan] of Object.entries(plans)) {
        const option = document.createElement('option');
        option.value = key;
        option.innerText = `${plan.name} (${plan.price}$ - ${plan.dailyProfit}$/يوم)`;
        select.appendChild(option);
    }
    
    document.getElementById('upgradeUsername').value = username;
    
    const modal = document.getElementById('upgradePlanModal');
    if (modal) modal.style.display = 'flex';
    
    document.getElementById('confirmUpgradePlan').onclick = async () => {
        const newPlanKey = document.getElementById('upgradePlanSelect').value;
        if (!newPlanKey) return showToast('اختر باقة', true);
        users[username].activePlan = newPlanKey;
        users[username].lastProfitClaim = Date.now();
        users[username].subscriptionDate = Date.now();
        if (!users[username].subscriptionHistory) users[username].subscriptionHistory = [];
        users[username].subscriptionHistory.unshift({ planName: plans[newPlanKey].name, price: plans[newPlanKey].price, date: Date.now(), type: 'ترقية' });
        await saveUsers(users);
        showToast(`تم ترقية باقة ${username} إلى ${plans[newPlanKey].name}`);
        renderUsersList();
        closeModals();
    };
}

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('تم النسخ');
};

// ============================================
// دوال مساعدة
// ============================================
function closeModals() {
    document.querySelectorAll('.modal').forEach(m => {
        if (m) m.style.display = 'none';
    });
}

document.querySelectorAll('.close-modal').forEach(btn => {
    if (btn) btn.addEventListener('click', closeModals);
});

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) closeModals();
};

function confettiEffect() {
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.style.cssText = `position:fixed;width:8px;height:8px;background:${['#667eea','#764ba2','#fbbf24','#10b981'][Math.floor(Math.random()*4)]};border-radius:50%;left:${Math.random()*window.innerWidth}px;top:-10px;pointer-events:none;z-index:9999`;
        document.body.appendChild(p);
        p.animate([{transform:'translateY(0px)',opacity:1},{transform:`translateY(${window.innerHeight+10}px) translateX(${(Math.random()-0.5)*100}px)`,opacity:0}],{duration:Math.random()*1500+800});
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

// بدء التطبيق
initApp();
