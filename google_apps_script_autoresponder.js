/**
 * ==============================================================================
 * Tejas C. Waghmare - Portfolio Contact Auto-Responder & Notification Engine
 * Google Apps Script (GAS) Web App - Mobile-Optimized Edition
 * ==============================================================================
 * 
 * 100% AUTOMATED - ZERO MANUAL WORK REQUIRED:
 * 1. When a visitor submits your form, Google Apps Script automatically sends
 *    them the warm auto-reply email with your profile picture and social links.
 * 2. Optimized for Mobile Gmail: No broken emoji diamonds, compact single-line
 *    tap-friendly action buttons, fluid layout for all phone screen sizes.
 * 3. High-deliverability settings configured to land directly in Primary Inboxes.
 * ==============================================================================
 */

// Configuration constants
var CONFIG = {
  ownerName: 'Tejas C. Waghmare',
  ownerEmail: 'tejaswaghmare900@gmail.com',
  portfolioUrl: 'https://tcwaghmare.github.io/',
  linkedinUrl: 'https://www.linkedin.com/in/tejascwaghmare',
  githubUrl: 'https://github.com/TCWaghmare',
  profileImageUrl: 'https://raw.githubusercontent.com/TCWaghmare/Tejas_Portfolio_Website/main/Asset/tejas_avatar.png',
  location: 'Pune, Maharashtra, India',
  title: 'Microsoft Certified Data Analyst & Business Intelligence Specialist',
  certifications: 'Fabric Analytics Engineer (DP-600) | Power BI Data Analyst (PL-300) | Azure Data Engineer (DP-700)'
};

/**
 * Handles incoming POST requests from the portfolio contact form.
 * Executes 100% automatically in the background.
 */
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    var data = {};

    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // Extract sanitized form inputs
    var visitorName = (data.name || 'Friend').trim();
    var visitorEmail = (data.email || '').trim();
    var visitorPhone = (data.phone || 'Not provided').trim();
    var callWhatsappPermission = data.call_whatsapp_permission || 'Not granted / Not provided';
    var topic = (data.topic || data.subject || 'Project Inquiry').trim();
    var urgency = (data.urgency || 'Normal').trim();
    var message = (data.message || '').trim();

    if (!visitorEmail || visitorEmail.indexOf('@') === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'Valid recipient email address is required.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --------------------------------------------------------------------------
    // 1. SEND WARM, GENTLE AUTO-REPLY TO THE VISITOR'S GMAIL (100% AUTOMATIC)
    //    Sent directly through your Gmail account (shows in your Sent folder)
    // --------------------------------------------------------------------------
    var autoReplySubject = 'Thank you for visiting my portfolio, ' + visitorName + '! - Tejas C. Waghmare';
    var autoReplyPlain = 'Hi ' + visitorName + ',\n\n'
      + 'Thank you so much for visiting my portfolio website and taking the time to reach out regarding ' + topic + '!\n\n'
      + 'Your message is safely in my personal inbox, and I will definitely review it and reply to you as soon as possible.\n\n'
      + '1. Explore My Portfolio: ' + CONFIG.portfolioUrl + '\n'
      + '2. Connect on LinkedIn: ' + CONFIG.linkedinUrl + '\n'
      + '3. GitHub Projects: ' + CONFIG.githubUrl + '\n\n'
      + 'Warm regards,\n'
      + CONFIG.ownerName + '\n'
      + CONFIG.title + '\n'
      + CONFIG.location;

    var autoReplyHtml = buildVisitorEmailHtml({
      name: visitorName,
      email: visitorEmail,
      topic: topic,
      urgency: urgency,
      message: message
    });

    // Send via GmailApp (appears in Sent items and maintains highest inbox deliverability)
    // with automatic fallback to MailApp to guarantee delivery in all permission states
    try {
      GmailApp.sendEmail(visitorEmail, autoReplySubject, autoReplyPlain, {
        name: CONFIG.ownerName,
        htmlBody: autoReplyHtml,
        replyTo: CONFIG.ownerEmail
      });
    } catch (gErr) {
      Logger.log('GmailApp auto-reply fallback to MailApp: ' + gErr);
      MailApp.sendEmail({
        to: visitorEmail,
        subject: autoReplySubject,
        body: autoReplyPlain,
        htmlBody: autoReplyHtml,
        name: CONFIG.ownerName,
        replyTo: CONFIG.ownerEmail
      });
    }

    // --------------------------------------------------------------------------
    // 2. SEND LEAD NOTIFICATION ALERT TO TEJAS (YOUR ADMIN ALERT)
    // --------------------------------------------------------------------------
    var notifySubject = '[Portfolio Lead] ' + topic + ' from ' + visitorName + ' (' + urgency + ')';
    var notifyPlain = 'New Portfolio Inquiry:\n'
      + 'Name: ' + visitorName + '\n'
      + 'Email: ' + visitorEmail + '\n'
      + 'Phone: ' + visitorPhone + '\n'
      + 'Topic: ' + topic + '\n'
      + 'Urgency: ' + urgency + '\n'
      + 'Message: ' + message + '\n\n'
      + '(The auto-reply email was already delivered to ' + visitorEmail + ' automatically)';

    var notifyHtml = buildOwnerNotificationHtml({
      name: visitorName,
      email: visitorEmail,
      phone: visitorPhone,
      permission: callWhatsappPermission,
      topic: topic,
      urgency: urgency,
      message: message
    });

    try {
      GmailApp.sendEmail(CONFIG.ownerEmail, notifySubject, notifyPlain, {
        name: 'Portfolio Contact Engine',
        htmlBody: notifyHtml,
        replyTo: visitorEmail
      });
    } catch (gErr2) {
      Logger.log('GmailApp notification fallback to MailApp: ' + gErr2);
      MailApp.sendEmail({
        to: CONFIG.ownerEmail,
        subject: notifySubject,
        body: notifyPlain,
        htmlBody: notifyHtml,
        name: 'Portfolio Contact Engine',
        replyTo: visitorEmail
      });
    }

    // --------------------------------------------------------------------------
    // 3. (OPTIONAL) AUTO-LOG INTO LINKED GOOGLE SHEET IF SPREADSHEET EXISTS
    // --------------------------------------------------------------------------
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        var sheet = ss.getActiveSheet();
        sheet.appendRow([
          new Date(),
          visitorName,
          visitorEmail,
          visitorPhone,
          callWhatsappPermission,
          topic,
          urgency,
          message
        ]);
      }
    } catch (sheetErr) {
      // Optional logging - silently continue
    }

    // Return success JSON
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Instant auto-reply delivered to ' + visitorEmail + ' and notification sent to ' + CONFIG.ownerEmail
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Health check endpoint for testing deployment status in browser.
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'active',
      service: 'Tejas C. Waghmare Portfolio Contact Auto-Responder API',
      timestamp: new Date().toISOString(),
      owner: CONFIG.ownerName
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 1-CLICK TEST FUNCTION:
 * Run this directly inside Google Apps Script editor to test sending an email!
 */
function testSendAutoReply() {
  var testPayload = {
    postData: {
      contents: JSON.stringify({
        name: "Tejas (Test Run)",
        email: CONFIG.ownerEmail,
        phone: "+91 83788 69006",
        call_whatsapp_permission: "Yes",
        topic: "A project",
        urgency: "ASAP",
        message: "Testing automated email delivery with profile image, warm message, and social links."
      })
    }
  };
  var output = doPost(testPayload);
  Logger.log("Test Result: " + output.getContent());
}

/**
 * Builds the responsive HTML email delivered automatically to the visitor.
 * 
 * MOBILE-FIRST & CLEAN DESIGN:
 * - 100% clean ASCII & HTML entities (NO emoji corruption into diamond question marks)
 * - Compact fluid layout designed specifically for mobile Gmail screens
 * - Prominent circular profile image of Tejas with golden border
 * - Personalized greeting and reassuring message
 * - Clean copy of visitor's inquiry
 * - Sleek, single-line tap buttons (1. Portfolio, 2. LinkedIn, 3. GitHub)
 * - Strict privacy: NO personal phone number or WhatsApp displayed
 */
function buildVisitorEmailHtml(data) {
  var escapedName = escapeHtml(data.name);
  var escapedTopic = escapeHtml(data.topic);
  var escapedUrgency = escapeHtml(data.urgency);
  var escapedMessage = escapeHtml(data.message).replace(/\n/g, '<br>');

  return ''
    + '<!DOCTYPE html>'
    + '<html lang="en">'
    + '<head>'
    + '  <meta charset="UTF-8">'
    + '  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '  <meta name="color-scheme" content="light dark">'
    + '  <meta name="supported-color-schemes" content="light dark">'
    + '  <title>Thank You for Visiting My Portfolio</title>'
    + '  <style>'
    + '    @media only screen and (max-width: 480px) {'
    + '      .email-outer-td { padding: 10px 6px !important; }'
    + '      .email-card { border-radius: 12px !important; }'
    + '      .email-header { padding: 22px 16px 16px 16px !important; }'
    + '      .email-body { padding: 18px 16px !important; }'
    + '      .email-footer { padding: 18px 16px !important; }'
    + '      .email-h1 { font-size: 19px !important; line-height: 1.35 !important; }'
    + '      .email-btn { font-size: 13.5px !important; padding: 12px 12px !important; }'
    + '      .email-recap { padding: 12px 14px !important; }'
    + '    }'
    + '  </style>'
    + '</head>'
    + '<body style="margin: 0; padding: 0; background-color: #0c0d10; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #e6e8ec; -webkit-font-smoothing: antialiased;">'
    + '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0c0d10; width: 100%; margin: 0; padding: 0;">'
    + '    <tr>'
    + '      <td align="center" class="email-outer-td" style="padding: 24px 10px;">'
    + '        <!-- Main Card Container (Mobile Fluid) -->'
    + '        <table role="presentation" class="email-card" width="100%" style="max-width: 540px; background-color: #15171c; border: 1px solid #262933; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0" border="0">'
    + '          '
    + '          <!-- Top Gold Accent Line -->'
    + '          <tr>'
    + '            <td style="height: 3px; background: linear-gradient(90deg, #F5E025 0%, #EAB308 50%, #F5E025 100%); line-height: 3px; font-size: 1px;">&nbsp;</td>'
    + '          </tr>'
    + '          '
    + '          <!-- Header Banner with Profile Picture -->'
    + '          <tr>'
    + '            <td class="email-header" style="padding: 26px 24px 18px 24px; border-bottom: 1px solid #20232b; text-align: center;">'
    + '              <!-- Profile Picture with Golden Border -->'
    + '              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 14px auto;">'
    + '                <tr>'
    + '                  <td align="center">'
    + '                    <img '
    + '                      src="' + CONFIG.profileImageUrl + '" '
    + '                      alt="' + CONFIG.ownerName + '" '
    + '                      width="76" '
    + '                      height="76" '
    + '                      style="display: block; width: 76px; height: 76px; border-radius: 50%; border: 2.5px solid #F5E025; object-fit: cover; box-shadow: 0 4px 16px rgba(245, 224, 37, 0.35); margin: 0 auto;"'
    + '                    />'
    + '                  </td>'
    + '                </tr>'
    + '              </table>'
    + '              '
    + '              <!-- Status Pill -->'
    + '              <div style="display: inline-block; padding: 4px 12px; background-color: #222010; border: 1px solid #736412; border-radius: 20px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.8px; color: #F5E025; text-transform: uppercase; margin-bottom: 10px;">'
    + '                &#9679; MESSAGE RECEIVED &amp; CONFIRMED'
    + '              </div>'
    + '              '
    + '              <h1 class="email-h1" style="margin: 0; font-size: 21px; line-height: 1.35; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">'
    + '                Thank you for visiting my portfolio, <span style="color: #F5E025;">' + escapedName + '</span>!'
    + '              </h1>'
    + '              <p style="margin: 6px 0 0 0; font-size: 13.5px; line-height: 1.45; color: #9da3af;">'
    + '                I received your note regarding <strong style="color: #f1f3f7;">' + escapedTopic + '</strong>.'
    + '              </p>'
    + '            </td>'
    + '          </tr>'
    + '          '
    + '          <!-- Warm Message Body -->'
    + '          <tr>'
    + '            <td class="email-body" style="padding: 22px 24px;">'
    + '              <p style="font-size: 14.5px; line-height: 1.6; color: #d2d6df; margin: 0 0 14px 0;">'
    + '                Hi <strong>' + escapedName + '</strong>,'
    + '              </p>'
    + '              <p style="font-size: 14.5px; line-height: 1.6; color: #d2d6df; margin: 0 0 16px 0;">'
    + '                Thank you so much for visiting my portfolio website and taking the time to reach out! I truly appreciate your message and interest in my work.'
    + '              </p>'
    + '              '
    + '              <!-- Reassurance Callout -->'
    + '              <div style="padding: 14px 16px; background-color: #1a1d24; border-left: 3px solid #F5E025; border-radius: 6px; margin: 18px 0;">'
    + '                <p style="margin: 0; font-size: 13.5px; line-height: 1.55; color: #f1f3f7;">'
    + '                  <strong style="color: #F5E025;">Personal Confirmation:</strong> Your inquiry is safely in my personal inbox. I make it a priority to read every message thoroughly, and I will <strong>definitely reply to you as soon as possible</strong>.'
    + '                </p>'
    + '              </div>'
    + '              '
    + '              <!-- Inquiry Recap Box (Clean & Compact) -->'
    + '              <div class="email-recap" style="background-color: #101216; border: 1px solid #232630; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">'
    + '                <div style="font-size: 10.5px; font-weight: 700; letter-spacing: 0.8px; color: #8e95a3; text-transform: uppercase; margin-bottom: 8px;">'
    + '                  A copy of what you shared:'
    + '                </div>'
    + '                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #c4c8d3; width: 100%;">'
    + '                  <tr>'
    + '                    <td style="padding: 3px 0; width: 75px; color: #7f8694; font-weight: 600;">Topic:</td>'
    + '                    <td style="padding: 3px 0; color: #f5f6f8; font-weight: 600;">' + escapedTopic + '</td>'
    + '                  </tr>'
    + '                  <tr>'
    + '                    <td style="padding: 3px 0; color: #7f8694; font-weight: 600;">Timeline:</td>'
    + '                    <td style="padding: 3px 0; color: #f5f6f8;">' + escapedUrgency + '</td>'
    + '                  </tr>'
    + '                  <tr>'
    + '                    <td style="padding: 5px 0 0 0; color: #7f8694; font-weight: 600; vertical-align: top;">Message:</td>'
    + '                    <td style="padding: 5px 0 0 0; color: #e1e4eb; font-style: italic; line-height: 1.45;">&ldquo;' + escapedMessage + '&rdquo;</td>'
    + '                  </tr>'
    + '                </table>'
    + '              </div>'
    + '              '
    + '              <p style="font-size: 14px; line-height: 1.55; color: #d2d6df; margin: 0 0 14px 0;">'
    + '                While I review your note, feel free to explore my analytics projects, interactive dashboards, or connect with me across my social profiles:'
    + '              </p>'
    + '              '
    + '              <!-- Social Links & Portfolio CTA Buttons (Mobile-First, Single-Line, Clean ASCII) -->'
    + '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 16px 0 6px 0; width: 100%;">'
    + '                <!-- 1. Portfolio (Signature Primary CTA) -->'
    + '                <tr>'
    + '                  <td align="center" style="padding-bottom: 8px;">'
    + '                    <a href="' + CONFIG.portfolioUrl + '" target="_blank" class="email-btn" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #F5E025; color: #0c0d10; padding: 12px 14px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 3px 12px rgba(245, 224, 37, 0.25);">'
    + '                      1. View Interactive Portfolio &rarr;'
    + '                    </a>'
    + '                  </td>'
    + '                </tr>'
    + '                <!-- 2. LinkedIn -->'
    + '                <tr>'
    + '                  <td align="center" style="padding-bottom: 8px;">'
    + '                    <a href="' + CONFIG.linkedinUrl + '" target="_blank" class="email-btn" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #20242e; border: 1px solid #333846; color: #ffffff; padding: 11px 14px; border-radius: 8px; font-weight: 600; font-size: 13.5px; text-decoration: none;">'
    + '                      2. Connect on LinkedIn &rarr;'
    + '                    </a>'
    + '                  </td>'
    + '                </tr>'
    + '                <!-- 3. GitHub -->'
    + '                <tr>'
    + '                  <td align="center">'
    + '                    <a href="' + CONFIG.githubUrl + '" target="_blank" class="email-btn" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #171920; border: 1px solid #282c38; color: #c4c8d3; padding: 11px 14px; border-radius: 8px; font-weight: 600; font-size: 13.5px; text-decoration: none;">'
    + '                      3. View Projects on GitHub &rarr;'
    + '                    </a>'
    + '                  </td>'
    + '                </tr>'
    + '              </table>'
    + '            </td>'
    + '          </tr>'
    + '          '
    + '          <!-- Footer / Professional Signature (Strict Privacy - No phone/whatsapp) -->'
    + '          <tr>'
    + '            <td class="email-footer" style="padding: 20px 24px; background-color: #101216; border-top: 1px solid #20232b; text-align: center;">'
    + '              <div style="font-size: 12.5px; color: #8e95a3; margin-bottom: 3px;">Warm regards,</div>'
    + '              <div style="font-size: 16px; font-weight: 700; color: #ffffff;">' + CONFIG.ownerName + '</div>'
    + '              <div style="font-size: 12.5px; color: #F5E025; font-weight: 600; margin-top: 2px;">' + CONFIG.title + '</div>'
    + '              <div style="font-size: 11.5px; color: #7f8694; margin-top: 3px; line-height: 1.4;">' + CONFIG.certifications + '</div>'
    + '              <div style="font-size: 11px; color: #585f6c; margin-top: 5px;">Location: ' + CONFIG.location + '</div>'
    + '            </td>'
    + '          </tr>'
    + '          '
    + '        </table>'
    + '      </td>'
    + '    </tr>'
    + '  </table>'
    + '</body>'
    + '</html>';
}

/**
 * Builds the notification alert email delivered to Tejas (Admin Alert).
 * Clarifies that the auto-reply was ALREADY sent automatically.
 */
function buildOwnerNotificationHtml(data) {
  var escapedName = escapeHtml(data.name);
  var escapedEmail = escapeHtml(data.email);
  var escapedPhone = escapeHtml(data.phone);
  var escapedPermission = escapeHtml(data.permission);
  var escapedTopic = escapeHtml(data.topic);
  var escapedUrgency = escapeHtml(data.urgency);
  var escapedMessage = escapeHtml(data.message).replace(/\n/g, '<br>');

  return ''
    + '<!DOCTYPE html>'
    + '<html>'
    + '<head>'
    + '  <meta charset="UTF-8">'
    + '  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '</head>'
    + '<body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background: #0e1014; color: #e1e4ea; padding: 16px 8px; margin: 0;">'
    + '  <div style="max-width: 540px; margin: 0 auto; background: #16181e; border: 1px solid #282c38; border-radius: 12px; padding: 22px 18px;">'
    + '    '
    + '    <!-- Green Automated Status Badge -->'
    + '    <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; color: #4ade80; font-size: 13px; line-height: 1.5;">'
    + '      &#10003; <strong>AUTO-REPLY SENT AUTOMATICALLY:</strong><br>'
    + '      Your confirmation email (with your profile picture and social links) was already delivered to <strong>' + escapedEmail + '</strong>. No manual action is required from you!'
    + '    </div>'
    + '    '
    + '    <div style="background: #F5E025; color: #000; display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 11px; letter-spacing: 0.8px; margin-bottom: 12px;">'
    + '      NEW INQUIRY SUMMARY'
    + '    </div>'
    + '    <h2 style="margin: 0 0 14px 0; color: #fff; font-size: 19px;">'
    + '      ' + escapedName + ' sent you a message!'
    + '    </h2>'
    + '    '
    + '    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 18px;">'
    + '      <tr><td style="padding: 5px 0; color: #8890a0; width: 110px;">Name:</td><td style="color: #fff; font-weight: 600;">' + escapedName + '</td></tr>'
    + '      <tr><td style="padding: 5px 0; color: #8890a0;">Email:</td><td><a href="mailto:' + escapedEmail + '" style="color: #F5E025;">' + escapedEmail + '</a></td></tr>'
    + '      <tr><td style="padding: 5px 0; color: #8890a0;">Phone:</td><td style="color: #fff;">' + escapedPhone + '</td></tr>'
    + '      <tr><td style="padding: 5px 0; color: #8890a0;">Call / WhatsApp:</td><td style="color: #fff;">' + escapedPermission + '</td></tr>'
    + '      <tr><td style="padding: 5px 0; color: #8890a0;">Topic:</td><td style="color: #F5E025; font-weight: 600;">' + escapedTopic + '</td></tr>'
    + '      <tr><td style="padding: 5px 0; color: #8890a0;">Urgency:</td><td style="color: #fff;">' + escapedUrgency + '</td></tr>'
    + '    </table>'
    + '    '
    + '    <div style="background: #0f1013; border: 1px solid #232630; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px;">'
    + '      <div style="font-size: 11px; text-transform: uppercase; color: #788090; font-weight: 700; margin-bottom: 5px;">Message:</div>'
    + '      <div style="font-size: 14px; line-height: 1.55; color: #f0f2f6;">' + escapedMessage + '</div>'
    + '    </div>'
    + '    '
    + '    <div style="padding: 10px 14px; background: #111317; border: 1px solid #232733; border-radius: 8px; font-size: 12px; color: #8e95a3; text-align: center;">'
    + '      If you want to write an additional manual follow-up in the future, you can write directly to <a href="mailto:' + escapedEmail + '" style="color: #F5E025; text-decoration: underline;">' + escapedEmail + '</a>.'
    + '    </div>'
    + '  </div>'
    + '</body>'
    + '</html>';
}

/**
 * Escapes HTML characters to prevent XSS / formatting corruption.
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
