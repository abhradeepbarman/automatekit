export const forgotPasswordEmailTemplate = (name: string, link: string) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Reset Your Password</title>
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
      
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0; background-color:#f4f4f4;">
        <tr>
          <td align="center">
            
            <table width="500" cellpadding="0" cellspacing="0" 
              style="background:#ffffff; padding:30px; border-radius:8px;">
              
              <tr>
                <td align="center" style="padding-bottom:20px;">
                  <h2 style="margin:0; color:#333;">Password Reset Request</h2>
                </td>
              </tr>

              <tr>
                <td style="color:#555; font-size:14px; line-height:22px;">
                  <p>Hi ${name || 'User'},</p>

                  <p>
                    We received a request to reset your password. 
                    Click the button below to set a new password.
                  </p>

                  <p style="text-align:center; margin:30px 0;">
                    <a href="${link}" 
                       style="background-color:#000; color:#ffffff; 
                              padding:12px 25px; text-decoration:none; 
                              border-radius:5px; display:inline-block;">
                      Reset Password
                    </a>
                  </p>

                  <p>
                    This link will expire in 24 hours.
                  </p>

                  <p>
                    If you did not request a password reset, please ignore this email.
                  </p>

                  <p style="margin-top:30px;">
                    Thanks,<br/>
                    AutomateKit Team
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
  </html>
  `;
};
