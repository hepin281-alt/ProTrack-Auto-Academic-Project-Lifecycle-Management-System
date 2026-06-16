const jwt = require('jsonwebtoken');

const token = jwt.sign({ user_id: '123', role: 'COORDINATOR' }, process.env.JWT_SECRET || 'your-secret-key');
fetch('http://localhost:5001/api/coordinator/action/faculty', {
    headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.text()).then(console.log).catch(console.error);
