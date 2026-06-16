const jwt = require('jsonwebtoken');

const token = jwt.sign({ user_id: '123', email: 'test@test.com', role: 'COORDINATOR' }, 'your-secret-key-change-this-in-production');

fetch('http://127.0.0.1:5001/api/coordinator/action/faculty', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.text().then(text => console.log("RES:", res.status, text)))
.catch(console.error);
