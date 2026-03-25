# 🚀 Kall Me – Food Delivery Management System

A modern admin-based food delivery management system built with Angular, Node.js (Express), and PostgreSQL.

This application provides a centralized dashboard to efficiently manage hotels, menus, orders, delivery operations, reports, and notifications.

---

## 📌 Features

### 🔐 Authentication
- Admin login  
- Delivery personnel login (RBAC-based)  
- Session management with timeout  

---

### 🏨 Hotel Management
- Add, edit, and delete hotels  
- Upload hotel images (via Firebase Storage)  
- Map menus to specific hotels  

---

### 🍽️ Menu Management
- Manage menu items per hotel  
- Dynamic pricing configuration  
- Category-based menu filtering  

---

### 📦 Order Management
- Create orders manually (Admin)  
- Assign delivery personnel  
- Real-time price calculation  
- Edit orders (menu, pricing, customer details)  
- Cancel or update order status  

---

### 🚚 Delivery Management
- Delivery personnel dashboard  
- View assigned orders  
- Update delivery status:
  - Accepted  
  - Picked Up  
  - In Transit  
  - Delivered  

---

### 📊 Reports & Analytics
- Tab-based reports:
  - Hotel-wise  
  - Delivery-wise  
  - Menu-wise  
  - Orders  
  - Commission  

- ECharts integration:
  - Revenue trends  
  - Order analytics  
  - Top-performing hotels & menu items  

- Export options:
  - CSV  
  - PDF  

---

### 💰 Pricing & Calculation
- Automatic food subtotal calculation  
- Dynamic shipping charges (range-based)  
- Discount handling  
- Admin commission tracking  
- Delivery earnings calculation  

---

### 📲 Notifications
- WhatsApp integration (Meta Cloud API)  
- Utility message templates:
  - Account creation  
  - Order assignment  
  - Order updates  

- Supports attachments (e.g., invoice PDFs)  

---

### 🧾 Invoice Generation
- Generate professional PDF invoices  
- Clean layout with proper alignment  

Includes:
- Order details  
- Menu items  
- Pricing breakdown  

---

### ⚙️ Settings
- Admin commission configuration  
- Delivery charge setup  
- WhatsApp API configuration  
- Role-Based Access Control (RBAC)  

---

## 🏗️ Tech Stack

### Frontend
- Angular  
- Angular Material  
- ECharts (Analytics)  

### Backend
- Node.js  
- Express.js  

### Database
- PostgreSQL  

### Other Services
- Firebase Storage (Image Upload)  
- WhatsApp Cloud API (Notifications)  