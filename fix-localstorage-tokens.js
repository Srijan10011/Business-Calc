#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CLIENT_SRC = '/home/srijan1001/clone_B/Business-Calc/client/src';

// Files to process
const files = [
    'pages/Admin.jsx',
    'pages/Finance.jsx',
    'pages/TeamProfile.jsx',
    'pages/Inventory.jsx',
    'pages/Dashboard.jsx',
    'pages/Sales.jsx',
    'pages/CustomerProfile.jsx',
    'pages/ProductDetail.jsx',
    'pages/Reports.jsx',
    'components/sales/AddSaleModal.jsx',
    'components/products/COGSEditor.jsx',
    'components/products/CostAllocationEditor.jsx',
    'components/products/AddProductModal.jsx',
    'components/BusinessSetupDialog.jsx'
];

let totalChanges = 0;

files.forEach(file => {
    const filePath = path.join(CLIENT_SRC, file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${file} (not found)`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern 1: Remove token declaration lines
    content = content.replace(/\s*const token = localStorage\.getItem\(['"]token['"]\);?\n/g, '');
    
    // Pattern 2: Remove headers object with token
    // api.get('/path', { headers: { 'x-auth-token': token } })
    // becomes: api.get('/path')
    content = content.replace(/,\s*\{\s*headers:\s*\{\s*['"]x-auth-token['"]: token\s*\}\s*\}/g, '');
    
    // Pattern 3: For objects with token in headers
    // headers: { 'x-auth-token': token || '', ... }
    content = content.replace(/['"]x-auth-token['"]: token \|\| ['"]['"]/g, '');
    content = content.replace(/['"]x-auth-token['"]: token/g, '');
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        const changes = (originalContent.match(/localStorage\.getItem\(['"]token['"]\)/g) || []).length;
        console.log(`✅ Fixed ${file} (${changes} token references removed)`);
        totalChanges += changes;
    } else {
        console.log(`ℹ️  No changes needed in ${file}`);
    }
});

console.log(`\n🎉 Complete! Removed ${totalChanges} localStorage token references.`);
console.log(`\n⚠️  IMPORTANT: Test all API calls to ensure they still work with cookie-based auth.`);
