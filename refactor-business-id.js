const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'server', 'src');

// Pattern to match the business_id query with various formats
function replaceBusinessIdQuery(content) {
  // Match: const varName = await pool.query('SELECT business_id...', [userId]);
  // Followed by optional whitespace/comments
  // Then: const businessId = varName.rows[0].business_id or varName.rows[0]?.business_id
  // May have if check in between
  
  const regex = /const\s+(\w+)\s*=\s*await\s+pool\.query\(\s*['"]SELECT business_id FROM business_users WHERE user_id = \$1['"]\s*,\s*\[(\w+)\]\s*\);?\s*([\s\S]*?)const\s+(\w+)\s*=\s*\1\.rows\[0\]\??\.business_id;?/g;
  
  return content.replace(regex, (match, resultVar, userIdVar, middleContent, businessIdVar) => {
    // Simply replace with the Get_Business_id call
    // The existing try-catch in the function will handle errors
    return `const ${businessIdVar} = await Business_pool.Get_Business_id(${userIdVar});`;
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Apply replacement
  content = replaceBusinessIdQuery(content);
  
  const modified = content !== originalContent;

  // Ensure Business_pool import exists if modified
  if (modified) {
    const hasImport = /import.*Business_pool.*from/.test(content);
    if (!hasImport) {
      // Find the relative path to Business_pool
      const fileDir = path.dirname(filePath);
      const businessPoolPath = path.join(srcDir, 'db', 'Business_pool');
      let relativePath = path.relative(fileDir, businessPoolPath).replace(/\\/g, '/');
      
      // Ensure it starts with ./ or ../
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      // Add import after other imports
      const importMatch = content.match(/^(import[^;]+;?\n)+/m);
      if (importMatch) {
        const lastImportIndex = importMatch[0].length;
        content = content.slice(0, lastImportIndex) + 
                  `import * as Business_pool from '${relativePath}';\n` +
                  content.slice(lastImportIndex);
      } else {
        // No imports found, add at the top
        content = `import * as Business_pool from '${relativePath}';\n\n` + content;
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Modified: ${path.relative(srcDir, filePath)}`);
    return true;
  }

  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let modifiedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      modifiedCount += walkDir(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      if (processFile(filePath)) {
        modifiedCount++;
      }
    }
  });

  return modifiedCount;
}

console.log('Starting refactoring...\n');
const count = walkDir(srcDir);
console.log(`\n✓ Complete! Modified ${count} files.`);
