/**
 * Swagger / OpenAPI Documentation Configuration
 * 
 * Defines the API specification metadata and all documented routes.
 * Access the interactive UI at: http://localhost:3000/api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KLE Tech Asset & Procurement API',
      version: '1.0.0',
      description: `
## University IT Asset Inventory & Procurement Management System

Built for the **InfoCell Department, KLE Technological University**.

This API powers the complete procurement lifecycle:
- **Purchase Requests** submitted by HODs
- **Multi-Level Approvals** (HOD → Coordinator → Registrar → VC → PC)
- **Supplier Quotation Comparison** and selection
- **Purchase Order Generation** and tracking
- **Goods Receipt Recording** with partial delivery support
- **Durable Asset Tagging** (ISR codes like \`KLE-CS-2026-0001\`)
- **Consumable Inventory Management** and stock audit ledger

### Authentication
All endpoints (except \`/api/auth/login\` and \`/api/health\`) require an active session.
Login first using \`POST /api/auth/login\`, then use the same browser session for all subsequent requests.

### HTTP Status Codes Used
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Record Created |
| 400 | Bad Request (missing/invalid fields) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 409 | Conflict (e.g. duplicate, over-delivery) |
| 500 | Internal Server Error |
      `,
      contact: {
        name: 'InfoCell IT Department',
        email: 'infocell@kletech.ac.in'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server'
      }
    ],
    tags: [
      { name: 'System', description: 'Health check and system status' },
      { name: 'Authentication', description: 'Login, logout, and session management (Engine 4)' },
      { name: 'Dashboard', description: 'Live metrics and on-the-fly notifications (Engine 4)' },
      { name: 'Purchase Requests', description: 'Request creation and status tracking (Engine 1)' },
      { name: 'Approvals', description: 'Multi-level approval workflow (Engine 1)' },
      { name: 'Suppliers', description: 'Supplier/vendor management (Engine 1)' },
      { name: 'Quotations', description: 'Price quotation recording and comparison (Engine 1)' },
      { name: 'Purchase Orders', description: 'PO generation and delivery tracking (Engine 1)' },
      { name: 'Goods Receipts', description: 'Delivery recording and asset tagging (Engine 2)' },
      { name: 'Inventory', description: 'Department asset registry and stock status (Engine 2)' },
      { name: 'Stock Movements', description: 'Issue, return, transfer, adjust, dispose (Engine 2 + 3)' },
      { name: 'Reports', description: 'Procurement status and inventory audit reports (Engine 2)' },
      { name: 'Users', description: 'User and department management — Admin only (Engine 4)' }
    ],
    components: {
      schemas: {
        // ---- Common Schemas ----
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid email or password.' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully.' }
          }
        },
        User: {
          type: 'object',
          properties: {
            user_id: { type: 'integer', example: 2 },
            name: { type: 'string', example: 'Dr. CS HOD' },
            email: { type: 'string', example: 'hod.cs@kletech.ac.in' },
            role: {
              type: 'string',
              enum: ['ADMIN', 'HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC', 'STORE'],
              example: 'HOD'
            },
            dept_id: { type: 'integer', nullable: true, example: 1 },
            dept_name: { type: 'string', nullable: true, example: 'Computer Science & Engineering' }
          }
        },
        Department: {
          type: 'object',
          properties: {
            dept_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Computer Science & Engineering' }
          }
        },
        RequestItem: {
          type: 'object',
          required: ['item_name', 'quantity', 'estimated_price'],
          properties: {
            item_name: { type: 'string', example: 'Dell Precision 3581 Laptop' },
            specification: { type: 'string', example: 'Intel i7, 16GB RAM, 512GB SSD' },
            quantity: { type: 'integer', minimum: 1, example: 5 },
            estimated_price: { type: 'number', minimum: 0, example: 75000.00 }
          }
        },
        PurchaseRequest: {
          type: 'object',
          properties: {
            request_id: { type: 'integer', example: 1 },
            dept_name: { type: 'string', example: 'Computer Science & Engineering' },
            requested_by_name: { type: 'string', example: 'Dr. CS HOD' },
            justification: { type: 'string', example: 'Laptops for AI & ML Lab' },
            total_amount: { type: 'number', example: 375000.00 },
            status: {
              type: 'string',
              enum: ['UNDER_APPROVAL', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_RECEIVED', 'COMPLETED']
            },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Approval: {
          type: 'object',
          properties: {
            approval_id: { type: 'integer' },
            approver_role: { type: 'string', example: 'COORDINATOR' },
            step_order: { type: 'integer', example: 2 },
            decision: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], example: 'PENDING' },
            approver_name: { type: 'string', nullable: true },
            remarks: { type: 'string', nullable: true },
            decided_at: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        Supplier: {
          type: 'object',
          properties: {
            supplier_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Dell India Enterprise' },
            contact: { type: 'string', example: '+91 80 2234 5678' },
            address: { type: 'string', example: 'Bangalore - 560071' }
          }
        },
        Asset: {
          type: 'object',
          properties: {
            asset_id: { type: 'integer' },
            asset_code: { type: 'string', example: 'CSE-LAB3-40' },
            name: { type: 'string', example: 'HP Prodesk 2 Tower G1a Desktop AI PC' },
            type: { type: 'string', enum: ['DURABLE', 'CONSUMABLE'] },
            dept_name: { type: 'string', example: 'Computer Science & Engineering' },
            location: { type: 'string', example: 'Lab 3' },
            condition: { type: 'string', enum: ['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'DISPOSED'] },
            quantity: { type: 'integer', example: 1 },
            specifications: {
              type: 'object',
              example: {
                processor: 'AMD Ryzen 7 8700G w/ Radeon 780M Graphics (4.20 GHz)',
                ram: '16 GB',
                ddr: 'DDR 4',
                hdd: '500 GB',
                os: 'Win 11 Pro',
                antivirus: true,
                licensed: false
              }
            }
          }
        }
      }
    }
  },
  // Scan these files for JSDoc @swagger comments to auto-document routes
  apis: ['./server/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
