// ===================================
// pwa-init.js - تهيئة PWA لـ Elite Capital
// ===================================

(function() {
    'use strict';
    
    console.log('🚀 PWA: بدء تهيئة التطبيق');
    
    // ========== تسجيل Service Worker ==========
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                        console.log('✅ PWA: تم تسجيل Service Worker بنجاح', registration.scope);
                        
                        // التحقق من وجود تحديثات
                        registration.addEventListener('updatefound', function() {
                            const newWorker = registration.installing;
                            console.log('📦 PWA: تم العثور على تحديث جديد');
                            
                            newWorker.addEventListener('statechange', function() {
                                if (newWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        console.log('🔄 PWA: تحديث جاهز، انتظر إعادة التحميل');
                                        showUpdateNotification();
                                    }
                                }
                            });
                        });
                    })
                    .catch(function(error) {
                        console.log('❌ PWA: فشل تسجيل Service Worker:', error);
                    });
            });
        } else {
            console.log('ℹ️ PWA: المتصفح لا يدعم Service Worker');
        }
    }
    
    // ========== طلب إذن الإشعارات ==========
    function requestNotificationPermission() {
        if ('Notification' in window) {
            // التحقق من أن المستخدم مسجل دخول
            const user = localStorage.getItem('current_user');
            if (user) {
                if (Notification.permission === 'default') {
                    // تأخير طلب الإذن 5 ثواني بعد تحميل الصفحة
                    setTimeout(() => {
                        Notification.requestPermission().then(function(permission) {
                            if (permission === 'granted') {
                                console.log('✅ PWA: تم منح إذن الإشعارات');
                                showToast('✅ تم تفعيل الإشعارات بنجاح');
                            }
                        });
                    }, 5000);
                }
            }
        }
    }
    
    // ========== إظهار إشعار التحديث ==========
    function showUpdateNotification() {
        const updateBar = document.createElement('div');
        updateBar.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: #c8a97e;
            color: #0f172a;
            padding: 15px 20px;
            border-radius: 50px;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            box-shadow: 0 5px 20px rgba(200,169,126,0.5);
            animation: slideUp 0.3s;
            max-width: 400px;
            margin: 0 auto;
            font-family: 'Tajawal', sans-serif;
        `;
        
        updateBar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-download"></i>
                <span>تحديث جديد متاح!</span>
            </div>
            <button onclick="location.reload()" style="
                background: #0f172a;
                color: white;
                border: none;
                padding: 8px 20px;
                border-radius: 50px;
                cursor: pointer;
                font-weight: bold;
            ">تحديث الآن</button>
        `;
        
        document.body.appendChild(updateBar);
        
        setTimeout(() => {
            updateBar.remove();
        }, 10000);
    }
    
    // ========== إظهار Toast بسيط ==========
    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 12px 20px;
            border-radius: 50px;
            z-index: 9999;
            text-align: center;
            font-size: 14px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            animation: slideUp 0.3s;
            max-width: 300px;
            margin: 0 auto;
            font-family: 'Tajawal', sans-serif;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ========== إضافة أنماط CSS للـ PWA ==========
    function addPwaStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            /* إخفاء شريط عنوان المتصفح في وضع التطبيق */
            @media all and (display-mode: standalone) {
                body {
                    padding-top: env(safe-area-inset-top);
                    padding-bottom: env(safe-area-inset-bottom);
                    padding-left: env(safe-area-inset-left);
                    padding-right: env(safe-area-inset-right);
                }
                
                .navbar {
                    padding-top: calc(15px + env(safe-area-inset-top));
                }
                
                .bottom-nav {
                    padding-bottom: calc(10px + env(safe-area-inset-bottom));
                }
            }
            
            /* تلميح للتثبيت */
            .install-prompt {
                position: fixed;
                bottom: 100px;
                left: 20px;
                right: 20px;
                background: #1e293b;
                border: 2px solid #c8a97e;
                border-radius: 20px;
                padding: 20px;
                z-index: 9998;
                display: none;
                animation: slideUp 0.3s;
                max-width: 350px;
                margin: 0 auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }
            
            .install-prompt.show {
                display: block;
            }
            
            .install-prompt h4 {
                color: #c8a97e;
                margin-bottom: 10px;
            }
            
            .install-prompt p {
                color: rgba(255,255,255,0.7);
                font-size: 14px;
                margin-bottom: 15px;
            }
            
            .install-buttons {
                display: flex;
                gap: 10px;
            }
            
            .install-btn {
                flex: 2;
                background: #c8a97e;
                color: #0f172a;
                border: none;
                padding: 12px;
                border-radius: 50px;
                font-weight: bold;
                cursor: pointer;
            }
            
            .close-btn {
                flex: 1;
                background: transparent;
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 12px;
                border-radius: 50px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== عرض تلميح التثبيت ==========
    function showInstallPrompt() {
        // التحقق من عدم تثبيت التطبيق بالفعل
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }
        
        // التحقق من عدم رؤية المستخدم للتلميح من قبل
        if (localStorage.getItem('pwa_install_prompt_hidden')) {
            return;
        }
        
        // التحقق من أن المستخدم مسجل دخول
        if (!localStorage.getItem('current_user')) {
            return;
        }
        
        // تأخير ظهور التلميح 10 ثواني
        setTimeout(() => {
            const prompt = document.createElement('div');
            prompt.className = 'install-prompt show';
            prompt.innerHTML = `
                <h4>📱 ثبّت تطبيق Elite Capital</h4>
                <p>للوصول السريع والإشعارات الفورية، قم بتثبيت التطبيق على شاشتك الرئيسية</p>
                <div class="install-buttons">
                    <button class="install-btn" onclick="showInstallInstructions()">تثبيت الآن</button>
                    <button class="close-btn" onclick="hideInstallPrompt()">لاحقاً</button>
                </div>
            `;
            document.body.appendChild(prompt);
            
            // إخفاء التلميح بعد 30 ثانية
            setTimeout(() => {
                if (prompt.parentNode) {
                    prompt.remove();
                }
            }, 30000);
        }, 10000);
    }
    
    // ========== إخفاء تلميح التثبيت ==========
    window.hideInstallPrompt = function() {
        const prompt = document.querySelector('.install-prompt');
        if (prompt) {
            prompt.remove();
            localStorage.setItem('pwa_install_prompt_hidden', 'true');
        }
    };
    
    // ========== إظهار تعليمات التثبيت ==========
    window.showInstallInstructions = function() {
        hideInstallPrompt();
        
        let instructions = '';
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        if (isIOS) {
            instructions = `
                <div style="text-align: center;">
                    <i class="fas fa-share" style="font-size: 40px; color: #c8a97e; margin-bottom: 15px;"></i>
                    <p>1. اضغط على زر المشاركة <i class="fas fa-arrow-up"></i></p>
                    <p>2. اختر "إضافة إلى الشاشة الرئيسية"</p>
                    <p>3. اضغط على "إضافة"</p>
                </div>
            `;
        } else if (isAndroid) {
            instructions = `
                <div style="text-align: center;">
                    <i class="fas fa-ellipsis-v" style="font-size: 40px; color: #c8a97e; margin-bottom: 15px;"></i>
                    <p>1. اضغط على القائمة <i class="fas fa-ellipsis-v"></i></p>
                    <p>2. اختر "تثبيت التطبيق"</p>
                    <p>3. اضغط على "تثبيت"</p>
                </div>
            `;
        } else {
            instructions = `
                <div style="text-align: center;">
                    <i class="fas fa-download" style="font-size: 40px; color: #c8a97e; margin-bottom: 15px;"></i>
                    <p>سيظهر أيقونة التثبيت في شريط العنوان</p>
                    <p>اضغط عليها وأكمل التثبيت</p>
                </div>
            `;
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.95);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: 'Tajawal', sans-serif;
            animation: fadeIn 0.3s;
        `;
        
        modal.innerHTML = `
            <div style="
                background: #1e293b;
                border-radius: 30px;
                padding: 30px;
                max-width: 400px;
                border: 2px solid #c8a97e;
                text-align: center;
            ">
                <h3 style="color: #c8a97e; margin-bottom: 20px;">📱 تثبيت التطبيق</h3>
                ${instructions}
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                    background: #c8a97e;
                    color: #0f172a;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 50px;
                    margin-top: 20px;
                    font-weight: bold;
                    cursor: pointer;
                ">تم</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    };
    
    // ========== كشف حالة الاتصال ==========
    function detectConnection() {
        window.addEventListener('online', function() {
            console.log('✅ PWA: عودة الاتصال بالإنترنت');
            showToast('✅ تم استعادة الاتصال بالإنترنت');
        });
        
        window.addEventListener('offline', function() {
            console.log('❌ PWA: فقدان الاتصال بالإنترنت');
            showToast('⚠️ لا يوجد اتصال بالإنترنت', 'warning');
        });
    }
    
    // ========== تهيئة كل شيء ==========
    function init() {
        addPwaStyles();
        registerServiceWorker();
        requestNotificationPermission();
        detectConnection();
        showInstallPrompt();
    }
    
    // بدء التهيئة بعد تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();