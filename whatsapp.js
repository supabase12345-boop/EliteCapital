// ===================================
// whatsapp.js - نظام إشعارات واتساب المتكامل
// Elite Capital Platform
// ===================================

const WHATSAPP_CONFIG = {
    // يمكن تغيير هذه القيم حسب خدمة واتساب المستخدمة
    apiUrl: 'https://api.ultramsg.com/instance12345/messages/chat', // مثال لخدمة UltraMsg
    token: 'your_token_here', // توكن الخدمة
    adminNumber: '966123456789', // رقم المسؤول للإشعارات
    enabled: true, // تفعيل/تعطيل الإشعارات
    simulationMode: true // وضع المحاكاة (للتجربة بدون إرسال حقيقي)
};

// ========== إرسال إشعار واتساب ==========
async function sendWhatsAppNotification(phoneNumber, message, type = 'info') {
    try {
        // التحقق من صحة الرقم
        if (!phoneNumber || phoneNumber.length < 10) {
            console.log('⚠️ رقم هاتف غير صالح:', phoneNumber);
            return { success: false, error: 'رقم هاتف غير صالح' };
        }

        // تنظيف الرقم (إزالة الرموز غير الرقمية)
        const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
        
        // التأكد أن الرقم يبدأ بمفتاح الدولة
        let formattedNumber = cleanNumber;
        if (!cleanNumber.startsWith('966') && !cleanNumber.startsWith('+')) {
            formattedNumber = '966' + cleanNumber; // افتراض أن الرقم سعودي
        }

        // إضافة + إذا لم تكن موجودة
        if (!formattedNumber.startsWith('+')) {
            formattedNumber = '+' + formattedNumber;
        }

        console.log(`📱 جاري إرسال إشعار واتساب إلى: ${formattedNumber}`);
        console.log(`📝 نص الرسالة: ${message}`);
        console.log(`🔤 طول الرسالة: ${message.length} حرف`);

        // تسجيل الإشعار في قاعدة البيانات
        await logWhatsAppNotification(formattedNumber, message, type);

        // إذا كان وضع المحاكاة مفعل، فقط سجل النجاح
        if (WHATSAPP_CONFIG.simulationMode) {
            console.log('🧪 وضع المحاكاة: تم محاكاة إرسال الإشعار');
            
            // عرض الإشعار في واجهة المستخدم (للتجربة)
            showSimulatedNotification(formattedNumber, message);
            
            return { 
                success: true, 
                data: {
                    to: formattedNumber,
                    message: message,
                    sent_at: new Date().toISOString(),
                    mode: 'simulation'
                }
            };
        }

        // هنا يمكن إضافة كود الخدمة الحقيقية
        /*
        // مثال لاستخدام UltraMsg
        const response = await fetch(WHATSAPP_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: WHATSAPP_CONFIG.token,
                to: formattedNumber,
                body: message,
                priority: 10,
                referenceId: Date.now().toString()
            })
        });
        
        const result = await response.json();
        
        if (result.sent) {
            return { success: true, data: result };
        } else {
            throw new Error(result.error || 'فشل الإرسال');
        }
        */

        return { success: true, data: { to: formattedNumber, message: message } };

    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار واتساب:', error);
        
        // تسجيل الخطأ
        await logWhatsAppError(phoneNumber, message, error.message);
        
        return { success: false, error: error.message };
    }
}

// ========== تسجيل الإشعار في قاعدة البيانات ==========
async function logWhatsAppNotification(phone, message, type) {
    try {
        if (!window.supabaseClient) return;
        
        const { error } = await window.supabaseClient
            .from('whatsapp_logs')
            .insert([{
                phone_number: phone,
                message: message.substring(0, 200), // حفظ أول 200 حرف فقط
                type: type,
                status: 'sent',
                sent_at: new Date().toISOString()
            }]);
            
        if (error) console.error('خطأ في تسجيل الإشعار:', error);
    } catch (e) {
        console.error('فشل تسجيل الإشعار:', e);
    }
}

// ========== تسجيل خطأ الإشعار ==========
async function logWhatsAppError(phone, message, error) {
    try {
        if (!window.supabaseClient) return;
        
        const { error: dbError } = await window.supabaseClient
            .from('whatsapp_logs')
            .insert([{
                phone_number: phone,
                message: message.substring(0, 200),
                type: 'error',
                status: 'failed',
                error: error,
                sent_at: new Date().toISOString()
            }]);
            
        if (dbError) console.error('خطأ في تسجيل الخطأ:', dbError);
    } catch (e) {}
}

// ========== عرض إشعار محاكاة في الواجهة ==========
function showSimulatedNotification(phone, message) {
    // إنشاء عنصر إشعار مؤقت
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #25D366, #128C7E);
        color: white;
        padding: 15px 25px;
        border-radius: 50px;
        box-shadow: 0 5px 20px rgba(37, 211, 102, 0.3);
        z-index: 9999;
        font-family: 'Tajawal', sans-serif;
        direction: rtl;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s;
        border-right: 4px solid white;
        max-width: 350px;
    `;
    
    notification.innerHTML = `
        <i class="fab fa-whatsapp" style="font-size: 24px;"></i>
        <div style="flex: 1;">
            <strong style="display: block; margin-bottom: 3px;">📱 إشعار واتساب (محاكاة)</strong>
            <span style="font-size: 13px; opacity: 0.9;">${message.substring(0, 50)}...</span>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // إزالة بعد 5 ثواني
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ========== رسالة ترحيب بعضوية جديدة ==========
async function sendWelcomeWhatsApp(user) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const message = `🎉 *مرحباً بك في Elite Capital* 🎉

أهلاً وسهلاً ${user.name || 'مستخدمنا العزيز'}،

✨ *تم إنشاء حسابك بنجاح!* ✨

🔑 *بيانات حسابك:*
👤 اسم المستخدم: ${user.username || 'غير محدد'}
🎁 كود الإحالة: ${user.referral_code || 'غير محدد'}

💰 *ابدأ الآن:*
1️⃣ اشترك في إحدى باقاتنا المميزة
2️⃣ اربح أرباحاً يومية تصل إلى 300$
3️⃣ ادعُ أصدقاءك واربح 50$ عن كل صديق

📱 *رابط المنصة:*
https://elite-capital.com

💡 *نصيحة:* فعّل إشعارات واتساب لتصلك آخر التحديثات

نتمنى لك تجربة استثمارية موفقة! ✨🏆`;

    return await sendWhatsAppNotification(user.phone, message, 'welcome');
}

// ========== رسالة الموافقة على الاشتراك ==========
async function sendSubscriptionApprovedWhatsApp(user, subscription) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const startDate = subscription.start_date ? new Date(subscription.start_date).toLocaleDateString('ar-SA') : 'اليوم';
    const endDate = subscription.end_date ? new Date(subscription.end_date).toLocaleDateString('ar-SA') : 'بعد 30 يوم';
    
    const message = `✅ *تهانينا! تمت الموافقة على اشتراكك* ✅

مرحباً ${user.name}،

🎊 *تم تفعيل اشتراكك في ${subscription.package_name} بنجاح!* 🎊

📊 *تفاصيل الاشتراك:*
💰 المبلغ المستثمر: ${subscription.amount}$
📈 الربح اليومي: +${subscription.daily_profit}$
📅 تاريخ البدء: ${startDate}
📅 تاريخ الانتهاء: ${endDate}

⚡ *الخطوات التالية:*
1️⃣ المطالبة بأرباحك اليومية من صفحة المهام
2️⃣ تابع تقدم استثمارك في لوحة التحكم
3️⃣ شارك كود إحالتك مع أصدقائك

🌟 *أرباحك التراكمية المتوقعة:* ${subscription.daily_profit * 30}$

نتمنى لك أرباحاً مباركة! 💰✨`;

    return await sendWhatsAppNotification(user.phone, message, 'subscription');
}

// ========== رسالة الموافقة على السحب ==========
async function sendWithdrawalApprovedWhatsApp(user, withdrawal) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const date = withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleDateString('ar-SA') : new Date().toLocaleDateString('ar-SA');
    const time = withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleTimeString('ar-SA') : new Date().toLocaleTimeString('ar-SA');
    
    const message = `💰 *تمت الموافقة على طلب السحب* 💰

مرحباً ${user.name}،

✅ *تمت الموافقة على طلب السحب الخاص بك وإرسال المبلغ!* ✅

📋 *تفاصيل السحب:*
💵 المبلغ الصافي: ${withdrawal.amount}$
💸 الرسوم: ${withdrawal.fee || 5}$
💰 الإجمالي: ${withdrawal.total || (withdrawal.amount + (withdrawal.fee || 5))}$
💳 المحفظة: ${withdrawal.wallet ? withdrawal.wallet.substring(0, 10) + '...' : 'غير محددة'}
🌐 الشبكة: ${withdrawal.network || 'TRC20'}
📅 تاريخ المعالجة: ${date} ${time}

🕒 *ملاحظة:* قد يستغرق وصول المبلغ من 5-30 دقيقة حسب ازدحام الشبكة

✅ *تم تحديث رصيدك تلقائياً*
📊 رصيدك الحالي: ${user.balance || 0}$

شكراً لثقتك بنا! 🙏✨`;

    return await sendWhatsAppNotification(user.phone, message, 'withdrawal');
}

// ========== رسالة رفض السحب ==========
async function sendWithdrawalRejectedWhatsApp(user, withdrawal, reason) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const message = `❌ *تم رفض طلب السحب* ❌

مرحباً ${user.name}،

نأسف لإعلامك بأن طلب السحب الخاص بك تم رفضه.

📋 *تفاصيل الطلب:*
💵 المبلغ: ${withdrawal.amount}$
💳 المحفظة: ${withdrawal.wallet ? withdrawal.wallet.substring(0, 10) + '...' : 'غير محددة'}
🌐 الشبكة: ${withdrawal.network || 'TRC20'}

⚠️ *سبب الرفض:* ${reason || 'بيانات غير صحيحة'}

🔧 *الحلول المقترحة:*
1️⃣ تأكد من صحة عنوان المحفظة
2️⃣ تواصل مع الدعم الفني
3️⃣ قدم طلب جديد بعد التصحيح

📱 *للتواصل مع الدعم الفني:*
💬 الدردشة المباشرة: elite-capital.com/chat
📧 البريد: support@elite-capital.com

نعتذر عن الإزعاج! 🙏`;

    return await sendWhatsAppNotification(user.phone, message, 'withdrawal_rejected');
}

// ========== رسالة تذكير بالمطالبة بالأرباح ==========
async function sendProfitReminderWhatsApp(user, dailyProfit, packageName) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const message = `⏰ *تذكير: أرباحك اليومية في انتظارك* ⏰

مرحباً ${user.name}،

💰 *أرباحك اليومية: +${dailyProfit}$* من باقة ${packageName}

⚡ *للمطالبة (بنقرة واحدة):*
1️⃣ افتح لوحة التحكم
2️⃣ اذهب إلى صفحة "المهام"
3️⃣ اضغط على زر "المطالبة بالأرباح"

📊 *إحصائيات استثمارك:*
📈 إجمالي الأرباح المحققة: ${user.total_earned || 0}$
💵 الرصيد الحالي: ${user.balance || 0}$

🚀 *تذكير مهم:*
⏱️ يمكنك المطالبة مرة كل 24 ساعة فقط
💰 كلما استثمرت أكثر، كلما ربحت أكثر

استثمر بذكاء واربح يومياً! ✨💪`;

    return await sendWhatsAppNotification(user.phone, message, 'reminder');
}

// ========== رسالة استلام هدية ==========
async function sendGiftReceivedWhatsApp(user, gift) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const message = `🎁 *مبروك! لديك هدية جديدة من الإدارة* 🎁

مرحباً ${user.name}،

🎉 *تم إرسال هدية بقيمة ${gift.amount}$ إلى حسابك!* 🎉

📝 *تفاصيل الهدية:*
🏷️ العنوان: ${gift.title || 'هدية'}
💬 الرسالة: ${gift.message || 'شكراً لانضمامك إلينا'}
💰 القيمة: ${gift.amount}$

⚡ *لاستلام الهدية:*
1️⃣ افتح لوحة التحكم
2️⃣ اذهب إلى صفحة "المهام"
3️⃣ اضغط على "استلام" بجانب الهدية

✅ *تم إضافة الهدية إلى حسابك مؤقتاً*
💵 رصيدك بعد الاستلام: ${(user.balance || 0) + gift.amount}$

شكراً لكونك جزءاً من عائلة Elite Capital! 🏆✨`;

    return await sendWhatsAppNotification(user.phone, message, 'gift');
}

// ========== رسالة إحالة جديدة ==========
async function sendNewReferralWhatsApp(user, referredUser) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const message = `👥 *مبروك! لديك إحالة جديدة* 👥

مرحباً ${user.name}،

🎉 ${referredUser.name} سجل باستخدام كود الإحالة الخاص بك! 🎉

💰 *مكافآتك:*
💵 50$ فور تفعيل الصديق لباقة
📈 20$ هدية للصديق الجديد
💎 أرباح إضافية من استثماراته

📊 *إحصائياتك المحدثة:*
👥 إجمالي الإحالات: ${(user.referral_count || 0) + 1}
💵 أرباح الإحالة: ${(user.referral_earnings || 0) + 50}$

🚀 *واصل المشاركة:*
🔗 رابط الإحالة: https://elite-capital.com/?ref=${user.referral_code}
📱 شارك الرابط مع أصدقائك

كل ما زاد عدد إحالاتك، زادت أرباحك! 💪✨`;

    return await sendWhatsAppNotification(user.phone, message, 'referral');
}

// ========== رسالة تذكير بانتهاء الاشتراك ==========
async function sendSubscriptionExpiryReminderWhatsApp(user, subscription, daysLeft) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const message = `⚠️ *تنبيه: اشتراكك على وشك الانتهاء* ⚠️

مرحباً ${user.name}،

📅 *يتبقى ${daysLeft} أيام* على انتهاء اشتراكك في ${subscription.package_name}

⚡ *لتجديد الاشتراك:*
1️⃣ سجل الدخول إلى حسابك
2️⃣ اختر باقة جديدة
3️⃣ استمر في جني الأرباح اليومية

🎁 *عرض خاص للمجددين:*
✨ احصل على 5$ إضافية عند التجديد اليوم
✨ إمكانية الترقية لباقة أعلى

🚀 *لا تفوّت فرصة الاستثمار!*
جدد الآن واستمر في الربح اليومي

للاستفسار: تواصل مع الدعم الفني 📱`;

    return await sendWhatsAppNotification(user.phone, message, 'expiry');
}

// ========== رسالة ترحيب بالمستخدم الجديد (للمسؤول) ==========
async function sendNewUserNotificationToAdmin(user) {
    if (!WHATSAPP_CONFIG.enabled) return { success: false };
    
    const message = `👑 *مستخدم جديد سجل في المنصة* 👑

📋 *معلومات العضو:*
👤 الاسم: ${user.name || 'غير محدد'}
📧 البريد: ${user.email || 'غير محدد'}
📱 الهاتف: ${user.phone || 'غير محدد'}
🆔 اسم المستخدم: ${user.username || 'غير محدد'}
🎁 كود الإحالة: ${user.referral_code || 'غير محدد'}
🔗 أحيل بواسطة: ${user.referred_by || 'مباشر'}

📊 *إحصائيات:*
👥 إجمالي المستخدمين: ${await getTotalUsersCount()}
💎 المشتركين النشطين: ${await getActiveSubscriptionsCount()}

🕒 وقت التسجيل: ${new Date().toLocaleString('ar-SA')}

🚀 *نتمنى له تجربة موفقة!*`;

    return await sendWhatsAppNotification(WHATSAPP_CONFIG.adminNumber, message, 'admin');
}

// ========== رسالة تنبيه بمخالفة ==========
async function sendViolationWhatsApp(user, violation) {
    if (!user.phone || !WHATSAPP_CONFIG.enabled) return { success: false };
    
    const suspendUntil = user.suspended_until ? new Date(user.suspended_until).toLocaleDateString('ar-SA') : 'غير محدد';
    
    const message = `⚠️ *تنبيه أمني: تم تسجيل مخالفة* ⚠️

مرحباً ${user.name}،

🛡️ *تم تعليق حسابك مؤقتاً* بسبب محاولة مطالبة مزدوجة.

📋 *تفاصيل المخالفة:*
🔢 رقم المخالفة: ${user.violation_count || 1}
📅 تاريخ المخالفة: ${new Date().toLocaleDateString('ar-SA')}
⏳ مدة التعليق: ${(user.violation_count || 1) * 7} أيام

📆 *ينتهي التعليق:* ${suspendUntil}

⚠️ *تنبيه مهم:*
❌ لا تحاول المطالبة قبل 24 ساعة
❌ تكرار المخالفة يزيد مدة التعليق
✅ التزم بالقواعد لتجنب الحظر

📱 *للاستفسار:* تواصل مع الدعم الفني

نعتذر عن الإزعاج! 🙏`;

    return await sendWhatsAppNotification(user.phone, message, 'violation');
}

// ========== الحصول على إجمالي المستخدمين ==========
async function getTotalUsersCount() {
    try {
        const { count, error } = await window.supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        return error ? 0 : count;
    } catch {
        return 0;
    }
}

// ========== الحصول على عدد المشتركين النشطين ==========
async function getActiveSubscriptionsCount() {
    try {
        const { count, error } = await window.supabaseClient
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        
        return error ? 0 : count;
    } catch {
        return 0;
    }
}

// ========== جدولة التذكيرات اليومية ==========
async function scheduleDailyReminders() {
    try {
        console.log('⏰ جاري تشغيل جدولة التذكيرات اليومية...');

        if (!WHATSAPP_CONFIG.enabled) {
            console.log('⚠️ إشعارات واتساب معطلة حالياً');
            return { success: false, reason: 'disabled' };
        }

        // جلب جميع المستخدمين الذين لديهم اشتراكات نشطة
        const { data: subscriptions, error } = await window.supabaseClient
            .from('subscriptions')
            .select(`
                *,
                users:user_id (
                    id,
                    name,
                    phone,
                    balance,
                    total_earned,
                    whatsapp_notifications
                )
            `)
            .eq('status', 'active');

        if (error) throw error;

        console.log(`📊 عدد الاشتراكات النشطة: ${subscriptions?.length || 0}`);

        let sentCount = 0;
        let skippedCount = 0;

        for (const sub of subscriptions || []) {
            const user = sub.users;
            
            // التحقق من وجود رقم هاتف وتفعيل الإشعارات
            if (!user?.phone || !user.whatsapp_notifications) {
                skippedCount++;
                continue;
            }

            // التحقق من وقت آخر مطالبة
            const lastClaim = sub.last_claim_date ? new Date(sub.last_claim_date) : null;
            const now = new Date();
            
            // إذا لم يطالب اليوم (أو مر أكثر من 20 ساعة)
            if (!lastClaim || (now - lastClaim) > 20 * 60 * 60 * 1000) {
                // إرسال تذكير
                await sendProfitReminderWhatsApp(user, sub.daily_profit, sub.package_name);
                sentCount++;
                
                // انتظار قليلاً بين الرسائل (تجنب الحظر)
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                skippedCount++;
            }
        }

        console.log(`✅ تم إرسال ${sentCount} تذكير، تخطي ${skippedCount} مستخدم`);
        
        // إرسال تقرير للمسؤول
        if (sentCount > 0) {
            await sendAdminReport(sentCount, skippedCount);
        }

        return { success: true, sent: sentCount, skipped: skippedCount };

    } catch (error) {
        console.error('❌ خطأ في جدولة التذكيرات:', error);
        return { success: false, error: error.message };
    }
}

// ========== إرسال تقرير للمسؤول ==========
async function sendAdminReport(sent, skipped) {
    const message = `📊 *تقرير التذكيرات اليومية* 📊

✅ تم إرسال ${sent} تذكير بنجاح
⏭️ تخطي ${skipped} مستخدم (لا يوجد رقم أو معطل)

🕒 وقت التقرير: ${new Date().toLocaleString('ar-SA')}

📱 *حالة النظام:*
🟢 واتساب: نشط
🔔 المجدول: يعمل

شكراً لاستخدام نظام الإشعارات! 🤖✨`;

    return await sendWhatsAppNotification(WHATSAPP_CONFIG.adminNumber, message, 'report');
}

// ========== تفعيل الجدولة التلقائية ==========
function startWhatsAppScheduler() {
    console.log('🚀 بدء تشغيل مجدول إشعارات واتساب...');
    
    if (!WHATSAPP_CONFIG.enabled) {
        console.log('⚠️ إشعارات واتساب معطلة في الإعدادات');
        return;
    }
    
    // تشغيل التذكيرات كل ساعة (للتحقق من الأوقات المناسبة)
    setInterval(async () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // إرسال التذكيرات في أوقات محددة (9 صباحاً، 1 ظهراً، 8 مساءً)
        if ((hours === 9 && minutes === 0) || 
            (hours === 13 && minutes === 0) || 
            (hours === 20 && minutes === 0)) {
            
            console.log(`⏰ وقت إرسال التذكيرات اليومية (${hours}:${minutes})`);
            await scheduleDailyReminders();
        }
    }, 60 * 1000); // فحص كل دقيقة
    
    // تشغيل تذكير واحد فوراً بعد 10 ثواني (للتجربة)
    setTimeout(() => {
        console.log('📱 تجربة أولية لنظام الإشعارات');
        // يمكن تفعيل هذا للسكريبت التجريبي
    }, 10000);
    
    console.log('✅ مجدول واتساب يعمل بنجاح');
}

// ========== إرسال إشعار تجريبي ==========
async function sendTestNotification(phone) {
    const message = `🧪 *هذا إشعار تجريبي* 🧪

مرحباً،

✅ نظام إشعارات Elite Capital يعمل بشكل ممتاز!

📱 يمكنك الآن استلام:
• تأكيدات الاشتراك
• إشعارات السحب
• تذكيرات الأرباح اليومية
• الهدايا والتنبيهات

✨ شكراً لاستخدامك منصتنا!

${new Date().toLocaleString('ar-SA')}`;

    return await sendWhatsAppNotification(phone, message, 'test');
}

// ========== التحقق من حالة الإشعارات ==========
function getWhatsAppStatus() {
    return {
        enabled: WHATSAPP_CONFIG.enabled,
        simulationMode: WHATSAPP_CONFIG.simulationMode,
        adminNumber: WHATSAPP_CONFIG.adminNumber,
        timestamp: new Date().toISOString()
    };
}

// ========== تصدير الدوال ==========
window.whatsappNotifications = {
    // الدوال الأساسية
    send: sendWhatsAppNotification,
    sendWelcome: sendWelcomeWhatsApp,
    sendSubscriptionApproved: sendSubscriptionApprovedWhatsApp,
    sendWithdrawalApproved: sendWithdrawalApprovedWhatsApp,
    sendWithdrawalRejected: sendWithdrawalRejectedWhatsApp,
    sendProfitReminder: sendProfitReminderWhatsApp,
    sendGiftReceived: sendGiftReceivedWhatsApp,
    sendNewReferral: sendNewReferralWhatsApp,
    sendSubscriptionExpiryReminder: sendSubscriptionExpiryReminderWhatsApp,
    sendNewUserToAdmin: sendNewUserNotificationToAdmin,
    sendViolation: sendViolationWhatsApp,
    sendTest: sendTestNotification,
    
    // الجدولة والإدارة
    scheduleDailyReminders: scheduleDailyReminders,
    startScheduler: startWhatsAppScheduler,
    getStatus: getWhatsAppStatus,
    
    // الإعدادات
    config: WHATSAPP_CONFIG,
    
    // المحاكاة
    showSimulated: showSimulatedNotification
};

console.log('✅ تم تحميل نظام إشعارات واتساب بنجاح');
console.log('📱 الحالة:', WHATSAPP_CONFIG.enabled ? 'نشط 🟢' : 'معطل 🔴');
console.log('🧪 وضع المحاكاة:', WHATSAPP_CONFIG.simulationMode ? 'مفعل ✅' : 'معطل ❌');
