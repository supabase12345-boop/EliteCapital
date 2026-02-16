/**
 * app.js - التطبيق الرئيسي
 * Elite Capital - منصة الاستثمار الذكي
 * الإصدار: 2.0.0
 */

class EliteApp {
    constructor() {
        this.user = null;
        this.version = '2.0.0';
        this.supabaseAvailable = false;
        this.init();
    }
    
    /**
     * تهيئة التطبيق
     */
    init() {
        console.log('🚀 بدء تشغيل Elite Capital v' + this.version);
        this.checkSupabase();
        this.setupEventListeners();
    }
    
    /**
     * التحقق من توفر Supabase
     */
    checkSupabase() {
        this.supabaseAvailable = typeof window !== 'undefined' && 
                                window.supabaseClient && 
                                window.supabaseHelpers;
        
        if (this.supabaseAvailable) {
            console.log('✅ متصل بـ Supabase');
        } else {
            console.log('⚠️ استخدام التخزين المحلي فقط');
        }
        
        return this.supabaseAvailable;
    }
    
    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // مستمع لتحديثات البيانات
        window.addEventListener('data-updated', (event) => {
            console.log('📡 تحديث: ' + event.detail.type);
        });
        
        // مستمع لحالة الاتصال
        window.addEventListener('online', () => {
            this.showNotification('✅ تم استعادة الاتصال بالإنترنت', 'success');
            this.checkSupabase();
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('⚠️ لا يوجد اتصال بالإنترنت', 'warning');
            this.supabaseAvailable = false;
        });
        
        // حفظ البيانات قبل إغلاق الصفحة
        window.addEventListener('beforeunload', () => {
            if (this.user) {
                this.saveUserData();
            }
        });
    }
    
    /**
     * التحقق من صلاحية المستخدم
     */
    async checkAuth() {
        try {
            const userData = localStorage.getItem('current_user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                
                // محاولة تحديث البيانات من Supabase
                if (this.supabaseAvailable) {
                    try {
                        const result = await window.supabaseHelpers.getUserById(parsedUser.id);
                        if (result.success && result.data) {
                            this.user = result.data;
                            localStorage.setItem('current_user', JSON.stringify(this.user));
                        } else {
                            this.user = parsedUser;
                        }
                    } catch (error) {
                        console.log('⚠️ فشل تحديث المستخدم من Supabase');
                        this.user = parsedUser;
                    }
                } else {
                    this.user = parsedUser;
                }
                
                // التحقق من حالة المستخدم
                if (this.user.status === 'banned') {
                    this.logout(true);
                    this.showNotification('❌ حسابك محظور. يرجى التواصل مع الدعم.', 'error');
                    return false;
                }
                
                if (this.user.status === 'suspended') {
                    this.showNotification('⚠️ حسابك معلق مؤقتاً. بعض الخدمات غير متاحة.', 'warning');
                }
                
                console.log('👤 مستخدم نشط:', this.user.email);
                return true;
            }
            return false;
        } catch (e) {
            console.error('خطأ في التحقق من المصادقة:', e);
            return false;
        }
    }
    
    /**
     * تسجيل الدخول
     */
    async login(username, password) {
        try {
            let user = null;
            
            // محاولة تسجيل الدخول عبر Supabase
            if (this.supabaseAvailable) {
                const result = await window.supabaseHelpers.loginUser(username, password);
                if (result.success) {
                    user = result.data;
                }
            }
            
            if (!user) {
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }
            
            if (user.status === 'banned') {
                throw new Error('حسابك محظور');
            }
            
            this.user = user;
            localStorage.setItem('current_user', JSON.stringify(user));
            
            this.showNotification('✅ تم تسجيل الدخول بنجاح', 'success');
            
            return { success: true, user };
        } catch (error) {
            this.showNotification('❌ ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * تسجيل مستخدم جديد
     */
    async register(userData) {
        try {
            // التحقق من صحة البيانات
            if (userData.password !== userData.confirmPassword) {
                throw new Error('كلمتا المرور غير متطابقتين');
            }
            
            if (userData.password.length < 6) {
                throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            }
            
            if (userData.username.includes(' ')) {
                throw new Error('اسم المستخدم يجب ألا يحتوي على مسافات');
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userData.email)) {
                throw new Error('البريد الإلكتروني غير صالح');
            }
            
            let newUser = null;
            
            // محاولة التسجيل عبر Supabase
            if (this.supabaseAvailable) {
                const result = await window.supabaseHelpers.registerUser(userData);
                if (result.success) {
                    newUser = result.data;
                }
            }
            
            if (!newUser) {
                throw new Error('فشل إنشاء الحساب');
            }
            
            this.user = newUser;
            localStorage.setItem('current_user', JSON.stringify(newUser));
            
            this.showNotification('✅ تم إنشاء الحساب بنجاح', 'success');
            
            return { success: true, user: newUser };
        } catch (error) {
            this.showNotification('❌ ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * تسجيل الخروج
     */
    logout(force = false) {
        if (force || confirm('هل تريد تسجيل الخروج؟')) {
            if (this.user) {
                this.saveUserData();
                console.log('👋 تسجيل خروج:', this.user.email);
            }
            
            this.user = null;
            localStorage.removeItem('current_user');
            this.showNotification('✅ تم تسجيل الخروج', 'success');
            
            // التوجيه إلى الصفحة الرئيسية
            if (!window.location.pathname.includes('index.html') && 
                !window.location.pathname.endsWith('/')) {
                window.location.href = 'index.html';
            }
        }
    }
    
    /**
     * حفظ بيانات المستخدم
     */
    async saveUserData() {
        if (!this.user) return false;
        
        try {
            // حفظ في التخزين المحلي
            const users = JSON.parse(localStorage.getItem('elite_users')) || [];
            const userIndex = users.findIndex(u => u.id === this.user.id);
            
            if (userIndex !== -1) {
                users[userIndex] = this.user;
            } else {
                users.push(this.user);
            }
            
            localStorage.setItem('elite_users', JSON.stringify(users));
            localStorage.setItem('current_user', JSON.stringify(this.user));
            
            // محاولة التحديث في Supabase
            if (this.supabaseAvailable) {
                try {
                    await window.supabaseHelpers.updateUser(this.user.id, this.user);
                } catch (error) {
                    console.log('⚠️ فشل تحديث المستخدم في Supabase');
                }
            }
            
            return true;
        } catch (e) {
            console.error('خطأ في حفظ بيانات المستخدم:', e);
            return false;
        }
    }
    
    /**
     * تحديث بيانات المستخدم
     */
    async refreshUserData() {
        if (!this.user) return null;
        
        try {
            if (this.supabaseAvailable) {
                const result = await window.supabaseHelpers.getUserById(this.user.id);
                if (result.success && result.data) {
                    this.user = result.data;
                    localStorage.setItem('current_user', JSON.stringify(this.user));
                    return this.user;
                }
            }
            
            // استخدام التخزين المحلي كاحتياطي
            const users = JSON.parse(localStorage.getItem('elite_users')) || [];
            const updatedUser = users.find(u => u.id === this.user.id);
            
            if (updatedUser) {
                this.user = updatedUser;
                localStorage.setItem('current_user', JSON.stringify(this.user));
            }
            
            return this.user;
        } catch (error) {
            console.error('خطأ في تحديث بيانات المستخدم:', error);
            return null;
        }
    }
    
    /**
     * تنسيق العملة
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount).replace('US$', '$').replace('USD', '$');
    }
    
    /**
     * تنسيق التاريخ
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);
        
        if (format === 'short') {
            return d.toLocaleDateString('ar-SA');
        } else if (format === 'long') {
            return d.toLocaleDateString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (format === 'time') {
            return d.toLocaleString('ar-SA');
        }
        
        return d.toLocaleDateString('ar-SA');
    }
    
    /**
     * إظهار إشعار
     */
    showNotification(message, type = 'success', duration = 3000) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        const icon = type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : 
                    type === 'warning' ? '⚠️' : 'ℹ️';
        
        notification.innerHTML = `${icon} ${message}`;
        notification.className = 'notification ' + type;
        notification.style.display = 'block';
        
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notification.style.display = 'none';
        }, duration);
    }
    
    /**
     * نسخ نص إلى الحافظة
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('✅ تم النسخ إلى الحافظة');
            return true;
        } catch (err) {
            // طريقة بديلة
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            this.showNotification('✅ تم النسخ إلى الحافظة');
            return true;
        }
    }
    
    /**
     * الحصول على حالة الاتصال
     */
    getConnectionStatus() {
        return {
            online: navigator.onLine,
            supabase: this.supabaseAvailable
        };
    }
    
    /**
     * التحقق من حالة المستخدم
     */
    checkUserAccess() {
        if (!this.user) return false;
        
        if (this.user.status === 'banned') {
            this.showNotification('❌ حسابك محظور. يرجى التواصل مع الدعم.', 'error');
            return false;
        }
        
        if (this.user.status === 'suspended') {
            this.showNotification('⚠️ حسابك معلق مؤقتاً. بعض الخدمات غير متاحة.', 'warning');
            return true;
        }
        
        return true;
    }
    
    /**
     * تسجيل الأحداث
     */
    log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString('ar-SA');
        console.log(`[${timestamp}] ${message}`);
        if (data) console.log(data);
    }
}

// ========== دوال مساعدة عامة ==========

/**
 * تبديل عرض الشريط الجانبي
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

/**
 * التمرير إلى قسم معين
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * إظهار إشعار سريع
 */
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#f39c12'};
        color: white;
        padding: 12px 25px;
        border-radius: 50px;
        z-index: 9999;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        text-align: center;
        font-weight: 500;
        animation: slideUp 0.3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

/**
 * توليد معرف فريد
 */
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * حفظ البيانات مع انتهاء الصلاحية
 */
function setWithExpiry(key, value, ttl) {
    const now = new Date();
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
}

/**
 * قراءة البيانات مع انتهاء الصلاحية
 */
function getWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    try {
        const item = JSON.parse(itemStr);
        const now = new Date();
        
        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        
        return item.value;
    } catch {
        return localStorage.getItem(key);
    }
}

/**
 * التحقق من توفر Supabase
 */
function isSupabaseAvailable() {
    return typeof window !== 'undefined' && 
           window.supabaseClient && 
           window.supabaseHelpers;
}

// ========== إضافة أنماط CSS للتطبيق ==========
(function addAppStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .toast-notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            padding: 12px 25px;
            border-radius: 50px;
            z-index: 9999;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            text-align: center;
            font-weight: 500;
            animation: slideUp 0.3s;
        }
        
        .toast-notification.success {
            background: #27ae60;
        }
        
        .toast-notification.error {
            background: #e74c3c;
        }
        
        .toast-notification.warning {
            background: #f39c12;
        }
        
        .toast-notification.info {
            background: #3498db;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translate(-50%, 100%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        
        .connection-status {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #1e293b;
            padding: 8px 16px;
            border-radius: 50px;
            border: 1px solid #c8a97e;
            font-size: 12px;
            z-index: 999;
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(5px);
            color: white;
        }
        
        .connection-status.online {
            border-color: #27ae60;
            color: #27ae60;
        }
        
        .connection-status.offline {
            border-color: #e74c3c;
            color: #e74c3c;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: #c8a97e;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
})();

// ========== التهيئة عند تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    // إنشاء كائن التطبيق العام
    window.eliteApp = new EliteApp();
    
    // إضافة مؤشر حالة الاتصال
    const connectionStatus = document.createElement('div');
    connectionStatus.className = 'connection-status online';
    connectionStatus.id = 'connectionStatus';
    connectionStatus.innerHTML = `
        <i class="fas fa-wifi" id="connectionIcon"></i>
        <span id="connectionText">متصل</span>
    `;
    document.body.appendChild(connectionStatus);
    
    // تحديث حالة الاتصال كل 5 ثواني
    setInterval(() => {
        const status = window.eliteApp?.getConnectionStatus();
        const connectionDiv = document.getElementById('connectionStatus');
        const icon = document.getElementById('connectionIcon');
        const text = document.getElementById('connectionText');
        
        if (status && connectionDiv) {
            if (status.supabase) {
                connectionDiv.className = 'connection-status online';
                icon.className = 'fas fa-wifi';
                text.textContent = 'متصل بـ Supabase';
            } else if (status.online) {
                connectionDiv.className = 'connection-status online';
                icon.className = 'fas fa-cloud';
                text.textContent = 'متصل (تخزين محلي)';
            } else {
                connectionDiv.className = 'connection-status offline';
                icon.className = 'fas fa-exclamation-triangle';
                text.textContent = 'غير متصل';
            }
        }
    }, 5000);
});

// ========== تصدير للاستخدام العام ==========
window.EliteApp = EliteApp;
window.toggleSidebar = toggleSidebar;
window.scrollToSection = scrollToSection;
window.showToast = showToast;
window.generateId = generateId;
window.setWithExpiry = setWithExpiry;
window.getWithExpiry = getWithExpiry;
window.isSupabaseAvailable = isSupabaseAvailable;