const fs = require('fs');
const path = require('path');

const htmlFiles = [
  'index.html',
  'nieuw-project-1.html',
  'nieuw-project-2.html',
  'nieuw-project-3.html',
  'project-overzicht.html',
  'project-instellingen.html',
  'pve-stap-1.html',
  'pve-stap-2.html',
  'pve-stap-3.html',
  'pve-stap-4.html',
  'pve-stap-4-begeleid.html',
  'pve-stap-4-vlekkenplan.html',
  'pve-stap-5.html',
  'pve-instellingen.html',
  'gebied.html',
  'gebied-stap-2.html',
  'gebied-stap-3.html',
  'gebied-stap-4.html',
  'gebied-stap-5.html',
  'gebied-instellingen.html',
  'gebouw.html',
  'gebouw-stap-2.html',
  'gebouw-stap-3.html',
  'besluit.html',
  'walkthrough.html'
];

const scriptTag = '  <script type="module" src="/feedback/init-feedback.js"></script>\n';

htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - file not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('/feedback/init-feedback.js')) {
    console.log(`Skipping ${file} - already has feedback script`);
    return;
  }

  content = content.replace('</body>', `${scriptTag}</body>`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Added feedback to ${file}`);
});

console.log('Done!');
