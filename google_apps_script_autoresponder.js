/**
 * ==============================================================================
 * Tejas C. Waghmare — Portfolio Contact Auto-Responder & Notification Engine
 * Google Apps Script (GAS) Web App
 * ==============================================================================
 * 
 * 100% AUTOMATED — ZERO MANUAL WORK REQUIRED:
 * 1. When a visitor submits your form, Google Apps Script automatically sends
 *    them the warm auto-reply email with your profile picture and social links.
 * 2. It does NOT require you to click or reply to anything.
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
    var autoReplySubject = 'Thank you for visiting my portfolio, ' + visitorName + '! — Tejas C. Waghmare';
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
      // Optional logging — silently continue
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
 * Features:
 * - Prominent circular profile image of Tejas with electric yellow border
 * - Personalized greeting thanking them for visiting the portfolio website
 * - Reassurance that Tejas will definitely reply ASAP
 * - Clean copy of their inquiry
 * - Social links in order: 1. Portfolio, 2. LinkedIn, 3. GitHub
 * - NO personal contact info (no phone, whatsapp, or direct email displayed)
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
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '  <title>Thank You for Visiting My Portfolio</title>'
    + '</head>'
    + '<body style="margin: 0; padding: 0; background-color: #0c0d10; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #e6e8ec; -webkit-font-smoothing: antialiased;">'
    + '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0c0d10; padding: 32px 16px;">'
    + '    <tr>'
    + '      <td align="center">'
    + '        <!-- Main Card Container -->'
    + '        <table role="presentation" width="100%" style="max-width: 580px; background-color: #15171c; border: 1px solid #262933; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0" border="0">'
    + '          '
    + '          <!-- Top Gold Accent Bar -->'
    + '          <tr>'
    + '            <td style="height: 4px; background: linear-gradient(90deg, #F5E025 0%, #EAB308 50%, #F5E025 100%);"></td>'
    + '          </tr>'
    + '          '
    + '          <!-- Header Banner with Profile Picture -->'
    + '          <tr>'
    + '            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #20232b; text-align: center;">'
    + '              <!-- Profile Picture with Golden Aura Border -->'
    + '              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 16px auto;">'
    + '                <tr>'
    + '                  <td align="center">'
    + '                    <img '
    + '                      src="' + CONFIG.profileImageUrl + '" '
    + '                      alt="' + CONFIG.ownerName + '" '
    + '                      width="92" '
    + '                      height="92" '
    + '                      style="display: block; width: 92px; height: 92px; border-radius: 50%; border: 3px solid #F5E025; object-fit: cover; box-shadow: 0 4px 18px rgba(245, 224, 37, 0.35);"'
    + '                    />'
    + '                  </td>'
    + '                </tr>'
    + '              </table>'
    + '              '
    + '              <!-- Status Pill -->'
    + '              <div style="display: inline-block; padding: 4px 12px; background: rgba(245, 224, 37, 0.12); border: 1px solid rgba(245, 224, 37, 0.35); border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #F5E025; text-transform: uppercase; margin-bottom: 12px;">'
    + '                ● MESSAGE RECEIVED &amp; CONFIRMED'
    + '              </div>'
    + '              '
    + '              <h1 style="margin: 0; font-size: 24px; line-height: 1.3; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">'
    + '                Thank you for visiting my portfolio, <span style="color: #F5E025;">' + escapedName + '</span>!'
    + '              </h1>'
    + '              <p style="margin: 6px 0 0 0; font-size: 14px; color: #9da3af;">'
    + '                I received your note regarding <strong>' + escapedTopic + '</strong>.'
    + '              </p>'
    + '            </td>'
    + '          </tr>'
    + '          '
    + '          <!-- Warm Gentle Message Body -->'
    + '          <tr>'
    + '            <td style="padding: 28px 32px;">'
    + '              <p style="font-size: 15px; line-height: 1.65; color: #d2d6df; margin: 0 0 16px 0;">'
    + '                Hi <strong>' + escapedName + '</strong>,'
    + '              </p>'
    + '              <p style="font-size: 15px; line-height: 1.65; color: #d2d6df; margin: 0 0 16px 0;">'
    + '                Thank you so much for visiting my portfolio website and taking the time to reach out! I truly appreciate your message and interest in my work.'
    + '              </p>'
    + '              '
    + '              <!-- Reassurance Callout -->'
    + '              <div style="padding: 16px 20px; background-color: #1a1d24; border-left: 3px solid #F5E025; border-radius: 8px; margin: 20px 0;">'
    + '                <p style="margin: 0; font-size: 14.5px; line-height: 1.6; color: #f1f3f7;">'
    + '                  💬 <strong>Personal Confirmation:</strong> Your inquiry is safely in my personal inbox. I make it a priority to read every message thoroughly, and I will <strong>definitely reply to you as soon as possible</strong>.'
    + '                </p>'
    + '              </div>'
    + '              '
    + '              <!-- Inquiry Recap Box -->'
    + '              <div style="background-color: #111216; border: 1px solid #232630; border-radius: 10px; padding: 16px 18px; margin: 22px 0;">'
    + '                <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #8e95a3; text-transform: uppercase; margin-bottom: 8px;">'
    + '                  A copy of what you shared:'
    + '                </div>'
    + '                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13.5px; color: #c4c8d3;">'
    + '                  <tr>'
    + '                    <td style="padding: 4px 0; width: 85px; color: #7f8694; font-weight: 600;">Topic:</td>'
    + '                    <td style="padding: 4px 0; color: #f5f6f8; font-weight: 600;">' + escapedTopic + '</td>'
    + '                  </tr>'
    + '                  <tr>'
    + '                    <td style="padding: 4px 0; color: #7f8694; font-weight: 600;">Timeline:</td>'
    + '                    <td style="padding: 4px 0; color: #f5f6f8;">' + escapedUrgency + '</td>'
    + '                  </tr>'
    + '                  <tr>'
    + '                    <td style="padding: 6px 0 0 0; color: #7f8694; font-weight: 600; vertical-align: top;">Message:</td>'
    + '                    <td style="padding: 6px 0 0 0; color: #e1e4eb; font-style: italic;">&ldquo;' + escapedMessage + '&rdquo;</td>'
    + '                  </tr>'
    + '                </table>'
    + '              </div>'
    + '              '
    + '              <p style="font-size: 14.5px; line-height: 1.6; color: #d2d6df; margin: 0 0 16px 0;">'
    + '                While I review your note, feel free to explore my analytics projects, interactive dashboards, or connect with me across my social profiles:'
    + '              </p>'
    + '              '
    + '              <!-- Social Links & Portfolio CTA Buttons (Portfolio 1st, LinkedIn, GitHub) -->'
    + '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0 10px 0;">'
    + '                <tr>'
    + '                  <td align="center" style="padding-bottom: 10px;">'
    + '                    <a href="' + CONFIG.portfolioUrl + '" target="_blank" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #F5E025; color: #0c0d10; padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(245, 224, 37, 0.25);">'
    + '                      🌐 1. Explore My Interactive Portfolio &rarr;'
    + '                    </a>'
    + '                  </td>'
    + '                </tr>'
    + '                <tr>'
    + '                  <td align="center" style="padding-bottom: 10px;">'
    + '                    <a href="' + CONFIG.linkedinUrl + '" target="_blank" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #232732; border: 1px solid #363c4c; color: #ffffff; padding: 11px 20px; border-radius: 8px; font-weight: 600; font-size: 13.5px; text-decoration: none;">'
    + '                      💼 2. Connect with Me on LinkedIn &rarr;'
    + '                    </a>'
    + '                  </td>'
    + '                </tr>'
    + '                <tr>'
    + '                  <td align="center">'
    + '                    <a href="' + CONFIG.githubUrl + '" target="_blank" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #1a1d24; border: 1px solid #2a2e3a; color: #c4c8d3; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; text-decoration: none;">'
    + '                      🐙 3. View My Projects on GitHub &rarr;'
    + '                    </a>'
    + '                  </td>'
    + '                </tr>'
    + '              </table>'
    + '            </td>'
    + '          </tr>'
    + '          '
    + '          <!-- Footer / Professional Signature (Without personal contact info) -->'
    + '          <tr>'
    + '            <td style="padding: 22px 32px; background-color: #111216; border-top: 1px solid #20232b; text-align: center;">'
    + '              <div style="font-size: 13px; color: #8e95a3; margin-bottom: 4px;">Warm regards,</div>'
    + '              <div style="font-size: 17px; font-weight: 700; color: #ffffff;">' + CONFIG.ownerName + '</div>'
    + '              <div style="font-size: 13px; color: #F5E025; font-weight: 600; margin-top: 2px;">' + CONFIG.title + '</div>'
    + '              <div style="font-size: 12px; color: #7f8694; margin-top: 4px;">' + CONFIG.certifications + '</div>'
    + '              <div style="font-size: 11.5px; color: #585f6c; margin-top: 6px;">📍 ' + CONFIG.location + '</div>'
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
    + '<body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background: #0e1014; color: #e1e4ea; padding: 24px;">'
    + '  <div style="max-width: 580px; margin: 0 auto; background: #16181e; border: 1px solid #282c38; border-radius: 12px; padding: 28px;">'
    + '    '
    + '    <!-- Green Automated Status Badge -->'
    + '    <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; color: #4ade80; font-size: 13px; line-height: 1.5;">'
    + '      ✅ <strong>AUTO-REPLY SENT AUTOMATICALLY:</strong><br>'
    + '      Your confirmation email (with your profile picture and social links) was already delivered to <strong>' + escapedEmail + '</strong>. No action is required from you!'
    + '    </div>'
    + '    '
    + '    <div style="background: #F5E025; color: #000; display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 11px; letter-spacing: 1px; margin-bottom: 12px;">'
    + '      NEW INQUIRY SUMMARY'
    + '    </div>'
    + '    <h2 style="margin: 0 0 16px 0; color: #fff; font-size: 20px;">'
    + '      ' + escapedName + ' sent you a message!'
    + '    </h2>'
    + '    '
    + '    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">'
    + '      <tr><td style="padding: 6px 0; color: #8890a0; width: 130px;">Name:</td><td style="color: #fff; font-weight: 600;">' + escapedName + '</td></tr>'
    + '      <tr><td style="padding: 6px 0; color: #8890a0;">Email:</td><td><a href="mailto:' + escapedEmail + '" style="color: #F5E025;">' + escapedEmail + '</a></td></tr>'
    + '      <tr><td style="padding: 6px 0; color: #8890a0;">Phone:</td><td style="color: #fff;">' + escapedPhone + '</td></tr>'
    + '      <tr><td style="padding: 6px 0; color: #8890a0;">Call / WhatsApp:</td><td style="color: #fff;">' + escapedPermission + '</td></tr>'
    + '      <tr><td style="padding: 6px 0; color: #8890a0;">Topic:</td><td style="color: #F5E025; font-weight: 600;">' + escapedTopic + '</td></tr>'
    + '      <tr><td style="padding: 6px 0; color: #8890a0;">Urgency:</td><td style="color: #fff;">' + escapedUrgency + '</td></tr>'
    + '    </table>'
    + '    '
    + '    <div style="background: #0f1013; border: 1px solid #232630; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">'
    + '      <div style="font-size: 11px; text-transform: uppercase; color: #788090; font-weight: 700; margin-bottom: 6px;">Message:</div>'
    + '      <div style="font-size: 14.5px; line-height: 1.6; color: #f0f2f6;">' + escapedMessage + '</div>'
    + '    </div>'
    + '    '
    + '    <div style="padding: 12px 16px; background: #111317; border: 1px solid #232733; border-radius: 8px; font-size: 12.5px; color: #8e95a3; text-align: center;">'
    + '      💬 If you ever want to write an additional manual follow-up in the future, you can write directly to <a href="mailto:' + escapedEmail + '" style="color: #F5E025; text-decoration: underline;">' + escapedEmail + '</a>.'
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
