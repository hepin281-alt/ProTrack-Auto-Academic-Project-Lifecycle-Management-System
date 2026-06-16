import { createRoot } from 'react-dom/client';

// Ultra-simple test with NO imports, NO CSS, NO dependencies
function SimpleApp() {
 return (
 <div style={{
 padding: '50px',
 fontFamily: 'Arial',
 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
 minHeight: '100vh',
 color: 'white'
 }}>
 <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
 ✅ SUCCESS! React is Working!
 </h1>
 <div style={{
 background: 'rgba(255,255,255,0.1)',
 padding: '30px',
 borderRadius: '15px',
 backdropFilter: 'blur(10px)'
 }}>
 <p style={{ fontSize: '20px', marginBottom: '15px' }}>
 If you can see this colorful page with purple gradient, then:
 </p>
 <ul style={{ fontSize: '18px', lineHeight: '2' }}>
 <li>✅ React is rendering correctly</li>
 <li>✅ JavaScript is working</li>
 <li>✅ The server is responding</li>
 <li>✅ Your browser is compatible</li>
 </ul>
 <hr style={{ margin: '30px 0', opacity: 0.3 }} />
 <p style={{ fontSize: '18px' }}>
 <strong>The issue is:</strong> Something in the main App.tsx file is causing an error.
 </p>
 <p style={{ fontSize: '18px', marginTop: '15px' }}>
 <strong>Next step:</strong> Check the browser Console (F12) for the exact error message.
 </p>
 </div>
 </div>
 );
}

const root = document.getElementById('root');
if (root) {
 createRoot(root).render(<SimpleApp />);
} else {
 document.body.innerHTML = '<div style="padding:50px;color:red;font-size:24px;">ERROR: #root element not found in HTML!</div>';
}
