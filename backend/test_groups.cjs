const jwt = require('jsonwebtoken');
const token = jwt.sign({ user_id: 'some_id', role: 'COMMITTEE' }, 'your-super-secret-key-that-is-at-least-32-chars-long');
fetch('http://127.0.0.1:5001/api/groups?status=ACTIVE', {
    headers: { 'Authorization': `Bearer ${token}` }
}).then(async r => console.log(r.status, await r.text())).catch(console.error);
