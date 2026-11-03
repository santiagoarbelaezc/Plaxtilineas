const fs = require('fs');
const file = 'c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/frontend/src/app/components/dashboard/pqr/pqr.html';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/<i class="fas fa-([^"]+)"><\/i>/g, '<fa-icon icon="$1"></fa-icon>');
fs.writeFileSync(file, content);
