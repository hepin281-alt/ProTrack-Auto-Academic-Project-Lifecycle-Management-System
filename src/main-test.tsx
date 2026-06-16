import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Minimal test without any CSS or complex imports
const TestApp = () => {
 return (
 <div style={{ 
 padding: '50px', 
 fontFamily: 'Arial, sans-serif',
 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
 minHeight: '100vh',
 color: 'white'
 }}>
 <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>✅ React is Working!</h1>
 <p style={{ fontSize: '24px', marginBottom: '20px' }}>
 If you can see this, React is rendering correctly.
 </p>
 <div style={{
 background: 'rgba(255,255,255,0.1)',
 padding: '30px',
 borderRadius: '15px',
 backdropFilter: 'blur(10px)'
 }}>
 <h2 style={{ marginTop: 0 }}>Next Steps:</h2>
 <ol style={{ fontSize: '18px', lineHeight: '1.8' }}>
 <li>React is confirmed working ✓</li>
 <li>The issue might be with CSS imports or large component files</li>
 <li>Check browser console (F12) for specific errors</li>
 <li>Try clearing browser cache completely</li>
 </ol>
 <button 
 onClick={() => {
 console.log('Button clicked!');
 alert('React event handling works!');
 }}
 style={{
 background: 'white',
 color: '#667eea',
 border: 'none',
 padding: '15px 30px',
 borderRadius: '8px',
 fontSize: '16px',
 fontWeight: 'bold',
 cursor: 'pointer',
 marginTop: '20px'
 }}
 >
 Click Me to Test React
 </button>
 </div>
 </div>
 );
};

const root = document.getElementById('root');
if (root) {
 createRoot(root).render(
 <StrictMode>
 <TestApp />
 </StrictMode>
 );
} else {
 document.body.innerHTML = '<h1 style="color: red; padding: 50px;">ERROR: Root element not found!</h1>';
}
