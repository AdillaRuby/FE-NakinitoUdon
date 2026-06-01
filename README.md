# 🍜 Nakinito Udon - QR Code Ordering System

Sistem pemesanan makanan berbasis QR Code untuk cafe Nakinito (Korean-Japanese Fusion Restaurant).

## ✨ Fitur

- 🔍 **QR Code Scan** - Customer scan QR di meja → langsung ke menu
- 📱 **Mobile-First Design** - Optimized untuk smartphone
- 🛒 **Shopping Cart** - Add to cart dengan localStorage
- 👤 **Authentication** - Register & Login dengan email/phone
- 📧 **Email OTP Verification** - Verifikasi email dengan 6-digit OTP
- 💳 **QRIS Payment** - Pembayaran via Midtrans (GoPay, OVO, DANA, dll)
- 🎨 **Minimalist UI** - Design clean seperti OVO/Grab

## 🎨 Design

- **Color Scheme:**
  - Blue: `#0D47A1`
  - Yellow: `#FDB913`
  - Orange: `#FF5722`
- **Font:** Inter (Google Fonts)
- **Style:** Minimalist, modern, mobile-first

## 🛠️ Tech Stack

- **Backend:** Laravel 11 + PHP 8.2
- **Database:** SQLite (local) / MySQL (production)
- **Payment Gateway:** Midtrans Sandbox
- **Email:** Gmail SMTP
- **QR Code:** SimpleSoftwareIO/simple-qrcode
- **Hosting:** Railway

## 📦 Installation (Local)

### Prerequisites
- PHP 8.2
- Composer
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/USERNAME/nakinito-udon.git
cd nakinito-udon

# Install dependencies
composer install

# Copy environment file
copy .env.example .env

# Generate app key
php artisan key:generate

# Run migrations & seeders
php artisan migrate --seed

# Start server
php artisan serve
```

Buka: http://127.0.0.1:8000

## 🚀 Deployment

### Deploy ke Railway

Lihat panduan lengkap di:
- **Quick Start:** `QUICK_START_DEPLOY.md` (5 menit)
- **Panduan Detail:** `DEPLOYMENT_RAILWAY.md` (lengkap dengan troubleshooting)

### Ringkasan Deployment

1. Push code ke GitHub
2. Buat project di Railway
3. Tambah MySQL database
4. Set environment variables
5. Generate domain
6. Download QR codes

## 📱 User Flow

1. **Customer scan QR** di meja → Langsung ke menu
2. **Browse menu** → Add to cart
3. **View cart** → Adjust quantity / delete items
4. **Checkout** → Register/Login (jika belum)
5. **Email OTP** → Verify email dengan 6-digit code
6. **Payment** → Scan QRIS dengan e-wallet
7. **Success** → Order masuk ke sistem

## 🔐 Environment Variables

```env
# App
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-url.up.railway.app

# Database (Railway auto-inject)
DATABASE_URL=mysql://...

# Mail (Gmail SMTP)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Midtrans (Sandbox)
MIDTRANS_SERVER_KEY=Mid-server-xxx
MIDTRANS_CLIENT_KEY=Mid-client-xxx
MIDTRANS_IS_PRODUCTION=false
```

## 📄 API Endpoints

### Public Routes
- `GET /table/{id}` - Menu page
- `GET /cart/{tableId}` - Cart page
- `GET /qrcode/all` - All QR codes
- `GET /qrcode/{tableId}` - Single QR code
- `GET /qrcode/{tableId}/download` - Download QR

### Auth Routes
- `POST /send-otp` - Send OTP to email
- `POST /verify-otp` - Verify OTP code
- `POST /register` - Complete registration
- `POST /login` - Login with email/phone
- `POST /logout` - Logout

### Payment Routes (Auth Required)
- `POST /payment/qris/create` - Create QRIS payment
- `GET /payment/{orderId}` - Payment page
- `GET /payment/{orderId}/status` - Check payment status
- `POST /payment/notification` - Midtrans webhook

### API Endpoints
- `GET /api/table/{id}` - Get table info
- `GET /api/menu/{tableId}` - Get menu items

## 🗄️ Database Schema

### Tables
- `users` - Customer data
- `email_verifications` - OTP codes
- `cafes` - Cafe info
- `tables` - Table info
- `menu_items` - Menu data
- `orders` - Order transactions

## 📝 Notes

### Email Configuration
- Using Gmail SMTP with App Password
- OTP valid for 10 minutes
- Email: firegaminggamerz@gmail.com

### Payment Gateway
- Using Midtrans Sandbox for testing
- Supports QRIS (GoPay, OVO, DANA, LinkAja, dll)
- QR code expires in 15 minutes
- Webhook for payment notification

### QR Codes
- Each table has unique QR code
- QR links to `/table/{id}`
- Can download as PNG (500x500px)
- Print-friendly layout

## 🐛 Troubleshooting

### Local Development
```bash
# Set PHP path
$env:PATH = "C:\xampp\php_old;" + $env:PATH

# Clear cache
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Reset database
php artisan migrate:fresh --seed
```

### Production Issues
- Check Railway logs
- Verify environment variables
- Check Midtrans webhook URL
- Test email sending

## 📚 Documentation

- `SETUP_EMAIL.md` - Email configuration guide
- `PAYMENT_QRIS.md` - Payment integration guide
- `DEPLOYMENT_RAILWAY.md` - Deployment guide
- `QUICK_START_DEPLOY.md` - Quick deployment guide

## 📞 Support

For issues or questions:
1. Check documentation files
2. Check Railway logs
3. Check Laravel logs: `storage/logs/laravel.log`

## 📄 License

This project is private and proprietary.

---

**Built with ❤️ for Nakinito Cafe**
