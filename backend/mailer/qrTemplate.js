const qrTemplate = (otpauthUrl, qr, email, totpSecret) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Setup Two-Factor Authentication - FixIt</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta charset="UTF-8">
      <meta name="robots" content="noindex, nofollow">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        
        .container { 
          max-width: 500px;
          margin: 0 auto;
          background: white; 
          border-radius: 16px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
          animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 24px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .header p {
          opacity: 0.9;
          font-size: 16px;
        }
        
        .content {
          padding: 30px 20px;
        }
        
        .step {
          margin-bottom: 30px;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid #f1f3f4;
          transition: all 0.3s ease;
        }
        
        .step:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }
        
        .step-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .step-number {
          width: 32px;
          height: 32px;
          background: #667eea;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-right: 15px;
          font-size: 14px;
        }
        
        .step-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        
        .mobile-option {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
          border: none !important;
        }
        
        .mobile-option:hover {
          box-shadow: 0 6px 20px rgba(79, 172, 254, 0.3);
        }
        
        .mobile-option .step-number {
          background: rgba(255,255,255,0.2);
        }
        
        .mobile-option .step-title {
          color: white;
        }
        
        .auth-button {
          display: block;
          width: 100%;
          padding: 16px;
          margin: 15px 0;
          background: rgba(255,255,255,0.2);
          color: white;
          text-decoration: none;
          text-align: center;
          border-radius: 10px;
          font-weight: 600;
          font-size: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          transition: all 0.3s ease;
        }
        
        .auth-button:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
        
        .qr-container { 
          text-align: center; 
          margin: 20px 0; 
        }
        
        .qr-code {
          max-width: 200px;
          width: 100%;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .manual-setup {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          border-left: 4px solid #ffc107;
        }
        
        .secret-key {
          background: #e9ecef;
          padding: 15px;
          border-radius: 8px;
          font-family: 'Courier New', Monaco, monospace;
          font-size: 14px;
          word-break: break-all;
          margin: 15px 0;
          border: 2px dashed #dee2e6;
          position: relative;
        }
        
        .copy-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
          margin-top: 10px;
        }
        
        .copy-btn:hover {
          background: #0056b3;
          transform: translateY(-1px);
        }
        
        .verify-section {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
          padding: 25px;
          border-radius: 12px;
          margin-top: 30px;
          color: #333;
        }
        
        .verify-section h3 {
          margin-bottom: 15px;
          color: #333;
          text-align: center;
        }
        
        .verify-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .totp-input {
          padding: 16px;
          font-size: 20px;
          text-align: center;
          border: 2px solid rgba(255,255,255,0.5);
          border-radius: 10px;
          background: rgba(255,255,255,0.9);
          letter-spacing: 4px;
          font-weight: bold;
          transition: all 0.3s ease;
          font-family: 'Courier New', Monaco, monospace;
        }
        
        .totp-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .verify-btn {
          padding: 16px;
          background: #333;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .verify-btn:hover {
          background: #555;
          transform: translateY(-2px);
        }
        
        .verify-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
        
        .tips {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          border-left: 4px solid #2196f3;
        }
        
        .tips h4 {
          color: #1976d2;
          margin-bottom: 10px;
        }
        
        .tips ul {
          margin-left: 20px;
          color: #333;
        }
        
        .tips li {
          margin-bottom: 5px;
        }
        
        @media (max-width: 480px) {
          body { padding: 10px; }
          .content { padding: 20px 15px; }
          .step { padding: 15px; }
          .header { padding: 20px 15px; }
          .totp-input { font-size: 18px; letter-spacing: 2px; }
        }
        
        .success-icon, .phone-icon, .desktop-icon {
          font-size: 24px;
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Setup Two-Factor Authentication</h1>
          <p>Secure your FixIt account with an authenticator app</p>
        </div>
        
        <div class="content">
          <!-- Mobile Users (Recommended) -->
          <div class="step mobile-option">
            <div class="step-header">
              <div class="step-number">1</div>
              <div class="step-title">📱 For Mobile Users (Recommended)</div>
            </div>
            <p style="margin-bottom: 15px; opacity: 0.9;">Tap the button below to automatically open your authenticator app:</p>
            <a href="${otpauthUrl}" class="auth-button">
              📲 Open in Authenticator App
            </a>
            <p style="font-size: 14px; opacity: 0.8; text-align: center;">
              Works with Google Authenticator, Microsoft Authenticator, Authy, and more!
            </p>
          </div>

          <!-- Desktop Users -->
          <div class="step">
            <div class="step-header">
              <div class="step-number">2</div>
              <div class="step-title">💻 For Desktop Users</div>
            </div>
            <p>Scan this QR code with your phone's authenticator app:</p>
            <div class="qr-container">
              <img src="${qr}" alt="QR Code for 2FA Setup" class="qr-code" />
            </div>
          </div>

          <!-- Manual Setup -->
          <div class="step">
            <div class="step-header">
              <div class="step-number">3</div>
              <div class="step-title">🔧 Manual Setup (If needed)</div>
            </div>
            <p>If the above methods don't work, manually add this key to your authenticator app:</p>
            <div class="manual-setup">
              <strong>Account Name:</strong> FixIt (${email})<br>
              <strong>Secret Key:</strong>
              <div class="secret-key" id="secretKey">${totpSecret}</div>
              <button class="copy-btn" onclick="copySecret()">📋 Copy Secret Key</button>
            </div>
          </div>

          <!-- Tips -->
          <div class="tips">
            <h4>💡 Quick Tips:</h4>
            <ul>
              <li>Install Google Authenticator, Microsoft Authenticator, or Authy</li>
              <li>The 6-digit code changes every 30 seconds</li>
              <li>Save your secret key in a safe place as backup</li>
              <li>You'll need this code every time you log in</li>
            </ul>
          </div>

          <!-- Verification Form -->
          <div class="verify-section">
            <h3>✅ Enter Your 6-Digit Code</h3>
            <p style="text-align: center; margin-bottom: 20px;">
              After setting up your authenticator app, enter the current 6-digit code:
            </p>
            <form class="verify-form" id="verifyForm">
              <input 
                type="text" 
                id="totpCode" 
                class="totp-input"
                placeholder="000000" 
                maxlength="6" 
                pattern="[0-9]{6}"
                autocomplete="one-time-code"
                required 
              />
              <button type="submit" class="verify-btn" id="verifyBtn">
                🚀 Complete Account Setup
              </button>
            </form>
          </div>
        </div>
      </div>

      <script>
        // Copy secret key to clipboard
        function copySecret() {
          const secretKey = document.getElementById('secretKey').textContent.trim();
          
          if (navigator.clipboard) {
            navigator.clipboard.writeText(secretKey).then(() => {
              showNotification('✅ Secret key copied to clipboard!');
            }).catch(() => {
              fallbackCopy(secretKey);
            });
          } else {
            fallbackCopy(secretKey);
          }
        }
        
        function fallbackCopy(text) {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          try {
            document.execCommand('copy');
            showNotification('✅ Secret key copied!');
          } catch (err) {
            showNotification('❌ Failed to copy. Please copy manually.');
          }
          
          document.body.removeChild(textArea);
        }
        
        function showNotification(message) {
          // Create notification
          const notification = document.createElement('div');
          notification.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: 600;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
          \`;
          notification.textContent = message;
          document.body.appendChild(notification);
          
          setTimeout(() => {
            notification.remove();
          }, 3000);
        }
        
        // Handle form submission
        document.getElementById('verifyForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const code = document.getElementById('totpCode').value.trim();
          const button = document.getElementById('verifyBtn');
          
          if (code.length !== 6 || !/^[0-9]+$/.test(code)) {
            showNotification('⚠️ Please enter a valid 6-digit code');
            return;
          }

          // Disable button and show loading
          button.disabled = true;
          button.textContent = '⏳ Verifying...';

          try {
            const response = await fetch('/ver/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ token: code })
            });

            const result = await response.json();
            
            if (result.success) {
              button.textContent = '🎉 Success!';
              button.style.background = '#28a745';
              showNotification('🎉 Account verified successfully!');
              
              setTimeout(() => {
                window.location.href = '/login'; // Redirect to login page
              }, 2000);
            } else {
              showNotification('❌ ' + result.message);
              button.disabled = false;
              button.textContent = '🚀 Complete Account Setup';
            }
          } catch (error) {
            console.error('Verification error:', error);
            showNotification('🌐 Network error. Please try again.');
            button.disabled = false;
            button.textContent = '🚀 Complete Account Setup';
          }
        });

        // Auto-focus on input and format as user types
        const totpInput = document.getElementById('totpCode');
        totpInput.focus();
        
        totpInput.addEventListener('input', (e) => {
          // Only allow numbers
          e.target.value = e.target.value.replace(/[^0-9]/g, '');
          
          // Auto-submit when 6 digits are entered
          if (e.target.value.length === 6) {
            setTimeout(() => {
              document.getElementById('verifyForm').dispatchEvent(new Event('submit'));
            }, 500);
          }
        });

        // Add CSS animation for notifications
        const style = document.createElement('style');
        style.textContent = \`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        \`;
        document.head.appendChild(style);
      </script>
    </body>
    </html>
  `;
};

module.exports = qrTemplate;
