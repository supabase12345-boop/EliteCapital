<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>الملف الشخصي - Elite Capital</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="supabase.js"></script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Tajawal', sans-serif;
            background: #0f172a;
            color: white;
            min-height: 100vh;
        }

        .header {
            background: #1e293b;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            border-bottom: 2px solid #c8a97e;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .back-btn {
            width: 45px;
            height: 45px;
            background: rgba(200,169,126,0.1);
            border: 2px solid #c8a97e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #c8a97e;
            font-size: 20px;
            cursor: pointer;
            text-decoration: none;
        }

        .header h1 {
            flex: 1;
            font-size: 24px;
            color: #c8a97e;
        }

        .main {
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
        }

        .profile-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .profile-avatar {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #c8a97e, #b38b5b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 auto 15px;
            border: 3px solid #c8a97e;
        }

        .profile-name {
            font-size: 24px;
            font-weight: 700;
            color: #c8a97e;
            margin-bottom: 5px;
        }

        .profile-email {
            color: rgba(255,255,255,0.6);
            font-size: 14px;
        }

        .card {
            background: rgba(30, 41, 59, 0.5);
            backdrop-filter: blur(10px);
            border-radius: 25px;
            padding: 25px;
            border: 1px solid rgba(200, 169, 126, 0.3);
            margin-bottom: 20px;
        }

        .card-title {
            font-size: 18px;
            font-weight: 700;
            color: #c8a97e;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .info-item:last-child {
            border-bottom: none;
        }

        .info-label {
            color: rgba(255,255,255,0.6);
        }

        .info-value {
            font-weight: 600;
            color: #c8a97e;
        }

        .subscription-badge {
            display: inline-block;
            padding: 5px 15px;
            background: rgba(39, 174, 96, 0.2);
            color: #27ae60;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
        }

        .no-subscription {
            color: rgba(255,255,255,0.5);
            text-align: center;
            padding: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: rgba(255,255,255,0.6);
            font-size: 14px;
        }

        .form-control {
            width: 100%;
            padding: 12px 15px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(200,169,126,0.3);
            border-radius: 15px;
            color: white;
            font-size: 14px;
        }

        .form-control:focus {
            outline: none;
            border-color: #c8a97e;
        }

        .btn {
            padding: 12px 25px;
            border-radius: 50px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
        }

        .btn-primary {
            background: #c8a97e;
            color: #0f172a;
        }

        .btn-success {
            background: #27ae60;
            color: white;
        }

        .btn-block {
            width: 100%;
        }

        .success-message {
            background: rgba(39, 174, 96, 0.2);
            border: 1px solid #27ae60;
            color: #27ae60;
            padding: 12px;
            border-radius: 15px;
            margin-bottom: 20px;
            text-align: center;
            display: none;
        }

        .error-message {
            background: rgba(231, 76, 60, 0.2);
            border: 1px solid #e74c3c;
            color: #e74c3c;
            padding: 12px;
            border-radius: 15px;
            margin-bottom: 20px;
            text-align: center;
            display: none;
        }

        @media (max-width: 768px) {
            .main {
                padding: 15px;
            }
            
            .profile-avatar {
                width: 80px;
                height: 80px;
                font-size: 32px;
            }
            
            .profile-name {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <a href="dashboard.html" class="back-btn">
            <i class="fas fa-arrow-left"></i>
        </a>
        <h1>الملف الشخصي</h1>
    </div>

    <div class="main">
        <div class="success-message" id="successMessage"></div>
        <div class="error-message" id="errorMessage"></div>

        <div class="profile-header">
            <div class="profile-avatar" id="userAvatar">م</div>
            <div class="profile-name" id="userName"></div>
            <div class="profile-email" id="userEmail"></div>
        </div>

        <div class="card">
            <div class="card-title">
                <i class="fas fa-crown"></i>
                الاشتراك الحالي
            </div>
            <div id="subscriptionInfo">
                <div class="no-subscription">جاري التحميل...</div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">
                <i class="fas fa-info-circle"></i>
                معلومات الحساب
            </div>
            <div class="info-item">
                <span class="info-label">اسم المستخدم</span>
                <span class="info-value" id="displayUsername"></span>
            </div>
            <div class="info-item">
                <span class="info-label">رقم الهاتف</span>
                <span class="info-value" id="displayPhone"></span>
            </div>
            <div class="info-item">
                <span class="info-label">كود الإحالة</span>
                <span class="info-value" id="displayReferralCode"></span>
            </div>
            <div class="info-item">
                <span class="info-label">تاريخ الانضمام</span>
                <span class="info-value" id="displayJoinDate"></span>
            </div>
            <div class="info-item">
                <span class="info-label">آخر تسجيل دخول</span>
                <span class="info-value" id="displayLastLogin"></span>
            </div>
        </div>

        <div class="card">
            <div class="card-title">
                <i class="fas fa-edit"></i>
                تعديل البيانات
            </div>
            
            <div class="form-group">
                <label>الاسم الكامل</label>
                <input type="text" class="form-control" id="editName">
            </div>
            
            <div class="form-group">
                <label>رقم الهاتف</label>
                <input type="tel" class="form-control" id="editPhone">
            </div>
            
            <div class="form-group">
                <label>عنوان المحفظة (USDT)</label>
                <input type="text" class="form-control" id="editWallet" placeholder="أدخل عنوان محفظتك">
            </div>
            
            <button class="btn btn-primary btn-block" onclick="updateProfile()">
                <i class="fas fa-save"></i>
                حفظ التغييرات
            </button>
        </div>

        <div class="card">
            <div class="card-title">
                <i class="fas fa-lock"></i>
                تغيير كلمة المرور
            </div>
            
            <div class="form-group">
                <label>كلمة المرور الحالية</label>
                <input type="password" class="form-control" id="currentPassword">
            </div>
            
            <div class="form-group">
                <label>كلمة المرور الجديدة</label>
                <input type="password" class="form-control" id="newPassword">
            </div>
            
            <div class="form-group">
                <label>تأكيد كلمة المرور الجديدة</label>
                <input type="password" class="form-control" id="confirmPassword">
            </div>
            
            <button class="btn btn-primary btn-block" onclick="changePassword()">
                <i class="fas fa-key"></i>
                تغيير كلمة المرور
            </button>
        </div>
    </div>

    <script>
        let currentUser = null;
        let userSubscription = null;

        document.addEventListener('DOMContentLoaded', async function() {
            await checkUser();
            await loadUserData();
            await loadSubscription();
        });

        async function checkUser() {
            const savedUser = localStorage.getItem('current_user');
            if (!savedUser) {
                window.location.href = 'index.html';
                return;
            }
            currentUser = JSON.parse(savedUser);
        }

        async function loadUserData() {
            try {
                const result = await window.supabaseHelpers.getUserById(currentUser.id);
                if (result.success && result.data) {
                    currentUser = result.data;
                    
                    document.getElementById('userAvatar').textContent = currentUser.name?.charAt(0).toUpperCase() || 'م';
                    document.getElementById('userName').textContent = currentUser.name || 'غير محدد';
                    document.getElementById('userEmail').textContent = currentUser.email || 'غير محدد';
                    document.getElementById('displayUsername').textContent = currentUser.username || 'غير محدد';
                    document.getElementById('displayPhone').textContent = currentUser.phone || 'غير محدد';
                    document.getElementById('displayReferralCode').textContent = currentUser.referral_code || 'غير محدد';
                    
                    if (currentUser.joined_date) {
                        document.getElementById('displayJoinDate').textContent = new Date(currentUser.joined_date).toLocaleDateString('ar-SA');
                    }
                    
                    if (currentUser.last_login) {
                        document.getElementById('displayLastLogin').textContent = new Date(currentUser.last_login).toLocaleString('ar-SA');
                    }
                    
                    document.getElementById('editName').value = currentUser.name || '';
                    document.getElementById('editPhone').value = currentUser.phone || '';
                    document.getElementById('editWallet').value = currentUser.wallet_address || '';
                }
            } catch (error) {
                console.error('خطأ في تحميل البيانات:', error);
            }
        }

        async function loadSubscription() {
            try {
                const result = await window.supabaseHelpers.getUserSubscription(currentUser.id);
                
                const container = document.getElementById('subscriptionInfo');
                
                if (result.success && result.data) {
                    userSubscription = result.data;
                    
                    const startDate = new Date(userSubscription.start_date).toLocaleDateString('ar-SA');
                    const endDate = new Date(userSubscription.end_date).toLocaleDateString('ar-SA');
                    
                    container.innerHTML = `
                        <div style="text-align: center; margin-bottom: 15px;">
                            <span class="subscription-badge">${userSubscription.package_name}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">مبلغ الاستثمار</span>
                            <span class="info-value">${userSubscription.amount}$</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">الربح اليومي</span>
                            <span class="info-value" style="color: #27ae60;">+${userSubscription.daily_profit}$</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">تاريخ البدء</span>
                            <span class="info-value">${startDate}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">تاريخ الانتهاء</span>
                            <span class="info-value">${endDate}</span>
                        </div>
                    `;
                } else {
                    container.innerHTML = '<div class="no-subscription">لا يوجد اشتراك نشط</div>';
                }
            } catch (error) {
                console.error('خطأ في تحميل الاشتراك:', error);
            }
        }

        async function updateProfile() {
            const updates = {
                name: document.getElementById('editName').value.trim(),
                phone: document.getElementById('editPhone').value.trim(),
                wallet_address: document.getElementById('editWallet').value.trim()
            };
            
            if (!updates.name) {
                showError('الاسم مطلوب');
                return;
            }
            
            const result = await window.supabaseHelpers.updateUser(currentUser.id, updates);
            
            if (result.success) {
                showSuccess('✅ تم تحديث البيانات بنجاح');
                await loadUserData();
            } else {
                showError('❌ ' + result.error);
            }
        }

        async function changePassword() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                showError('جميع الحقول مطلوبة');
                return;
            }
            
            if (newPassword.length < 6) {
                showError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showError('كلمتا المرور غير متطابقتين');
                return;
            }
            
            if (currentPassword !== currentUser.password) {
                showError('كلمة المرور الحالية غير صحيحة');
                return;
            }
            
            const result = await window.supabaseHelpers.updateUser(currentUser.id, {
                password: newPassword
            });
            
            if (result.success) {
                showSuccess('✅ تم تغيير كلمة المرور بنجاح');
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                showError('❌ ' + result.error);
            }
        }

        function showSuccess(message) {
            const msgDiv = document.getElementById('successMessage');
            msgDiv.textContent = message;
            msgDiv.style.display = 'block';
            setTimeout(() => {
                msgDiv.style.display = 'none';
            }, 3000);
        }

        function showError(message) {
            const msgDiv = document.getElementById('errorMessage');
            msgDiv.textContent = message;
            msgDiv.style.display = 'block';
            setTimeout(() => {
                msgDiv.style.display = 'none';
            }, 3000);
        }
    </script>
</body>
</html>