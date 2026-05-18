// ============================================================
// Quality Inn & Suites McAlester on Hwy 69
// Credit Card Authorization Form Handler
// Google Apps Script — paste this entire file into
// script.google.com → New Project → replace Code.gs content
// ============================================================

// ── CONFIG ───────────────────────────────────────────────────
// Deploy this script from QualityMcAlester@gmail.com (log in at script.google.com first)
var HOTEL_EMAIL    = 'QualityMcAlester@gmail.com'; // receives all CC auth forms
var DRIVE_FOLDER   = 'CC Authorization Forms';      // Google Drive folder name

// ── EMAIL DISPLAY NAME (Option 3) ────────────────────────────
// The script runs under your personal Google account (QualityMcAlester@gmail.com).
// Emails will technically come FROM that address, but:
//   • Display name shown to recipient: "Quality Inn & Suites McAlester on Hwy 69"
//   • Reply-To is set to: QualityMcAlester@gmail.com
// So guests and staff see the hotel name, and any replies go to the branded email.
// To fully fix the From address, move this script to a Google Workspace account
// at QualityMcAlester@gmail.com ($6/mo via workspace.google.com).
// ────────────────────────────────────────────────────────────

// Entry point for form POST
function doPost(e) {
  // Guard: Apps Script passes no argument when run manually from editor
  if (!e || !e.parameter) {
    Logger.log('doPost: no event data. Use the test functions (testForm, testApplication, testGroupTravel, testFeedback).');
    return jsonResponse({ status: 'error', message: 'No form data. Use the correct test function.' });
  }

  // ── ROUTER — one URL handles all four form types ──────────
  // Each HTML form includes: <input type="hidden" name="form_type" value="...">
  // Values: "cc_auth" | "application" | "group_travel" | "feedback"
  var formType = e.parameter.form_type || 'cc_auth';
  Logger.log('doPost received form_type: ' + formType);

  if (formType === 'application')   return doPostApplication(e);
  if (formType === 'group_travel')  return doPostGroupTravel(e);
  if (formType === 'feedback')      return doPostFeedback(e);

  // Default: CC Authorization
  try {
    var p = e.parameter || {};
    if (e.parameters) {
      for (var key in e.parameters) {
        if (e.parameters[key] && e.parameters[key].length > 1) {
          p[key] = e.parameters[key].join(', ');
        }
      }
    }
    var folder  = getOrCreateFolder(DRIVE_FOLDER);
    var pdfFile = createAuthPDF(p, folder);
    sendEmailNotification(p, pdfFile);
    return jsonResponse({ status: 'success', message: 'Authorization received.' });
  } catch (err) {
    Logger.log('CC Auth error: ' + err.toString());
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ── GET OR CREATE DRIVE FOLDER ───────────────────────────────
function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

// ── CREATE FORMATTED PDF ─────────────────────────────────────
function createAuthPDF(p, folder) {

  var guestName   = p.guest_name        || 'Unknown Guest';
  var arrivalDate = p.arrival_date      || '';
  var deptDate    = p.departure_date    || '';
  var today2    = new Date().toISOString().split('T')[0].replace(/-/g,'');
  var arrClean  = arrivalDate  ? arrivalDate.replace(/-/g,'')  : today2;
  var deptClean = deptDate     ? deptDate.replace(/-/g,'')     : 'TBD';
  var fileName  = 'CC_Auth_' + sanitize(guestName) + '_ArrIn' + arrClean + '_ArrOut' + deptClean + '.pdf';

  // Create a temporary Google Doc
  var doc  = DocumentApp.create('_temp_ccauth_' + new Date().getTime());
  var body = doc.getBody();

  // ── Header ──────────────────────────────────────────────────
  body.setPageWidth(612).setPageHeight(792)
      .setMarginTop(54).setMarginBottom(54)
      .setMarginLeft(54).setMarginRight(54);

  var header = body.appendParagraph('Quality Inn & Suites McAlester on Hwy 69');
  header.setHeading(DocumentApp.ParagraphHeading.HEADING1)
        .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  header.editAsText().setFontSize(16).setBold(true).setForegroundColor('#0f1f3d');

  var sub = body.appendParagraph('400 S George Nigh Expy  ·  McAlester, OK 74501  ·  (918) 426-8091');
  sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  sub.editAsText().setFontSize(9).setForegroundColor('#718096');

  var title = body.appendParagraph('CREDIT CARD AUTHORIZATION FORM');
  title.setHeading(DocumentApp.ParagraphHeading.HEADING2)
       .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  title.editAsText().setFontSize(13).setBold(true).setForegroundColor('#c9964a');

  var ts = body.appendParagraph('Submitted: ' + new Date().toLocaleString('en-US', {timeZone: 'America/Chicago'}));
  ts.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  ts.editAsText().setFontSize(9).setForegroundColor('#a0aec0');

  body.appendHorizontalRule();

  // ── Section helper ─────────────────────────────────────────
  function section(title) {
    var p = body.appendParagraph(title);
    p.editAsText().setFontSize(10).setBold(true).setForegroundColor('#0f1f3d')
     .setBackgroundColor('#f5f0e8');
    p.setSpacingBefore(10).setSpacingAfter(4);
    return p;
  }
  function row(label, value) {
    var p = body.appendParagraph('');
    var t = p.editAsText();
    t.insertText(0, label + ':  ');
    t.setBold(0, label.length, true).setFontSize(0, label.length, 9).setForegroundColor(0, label.length, '#4a5568');
    var val = (value || '—').toString().trim();
    t.insertText(label.length + 3, val);
    t.setBold(label.length + 3, label.length + 3 + val.length - 1, false)
     .setFontSize(label.length + 3, label.length + 3 + val.length - 1, 10)
     .setForegroundColor(label.length + 3, label.length + 3 + val.length - 1, '#0f1f3d');
    p.setSpacingAfter(3);
  }

  // ── SECTION 1: Guest Info ───────────────────────────────────
  section('GUEST & RESERVATION INFORMATION');
  row('Authorized Guest Name',   p.guest_name);
  row('Confirmation Number',     p.confirmation_number);
  row('Arrival Date',            p.arrival_date);
  row('Departure Date',          p.departure_date);
  row('Guest Email',             p.guest_email);
  row('Guest Phone',             p.guest_phone);

  // ── SECTION 2: Charges ─────────────────────────────────────
  section('CHARGE AUTHORIZATION');
  // charge_type is already flattened to comma-separated string by doPost
  row('Charges Authorized',      p.charge_type || '—');
  row('Total Amount',            p.total_amount);
  row('Note to Hotel',           p.note_to_hotel);

  // ── SECTION 3: Cardholder Info ─────────────────────────────
  section('CARDHOLDER INFORMATION');
  row('Cardholder Name',         p.name_on_card);
  row('Card Type',               p.card_type);
  row('Card Number',             maskCard(p.card_number));
  row('Expiration Date',         p.expiry);
  // CVC is intentionally NOT included in the PDF — never store CVC
  row('Cardholder Phone',        p.cardholder_phone);
  row('Cardholder Email',        p.cardholder_email);

  // ── SECTION 4: Billing Address ─────────────────────────────
  section('BILLING ADDRESS');
  row('Street Address',          p.billing_address + (p.billing_address2 ? ', ' + p.billing_address2 : ''));
  row('City / State / ZIP',      [p.city, p.state, p.zip].filter(Boolean).join(', '));
  row('Country',                 p.country);

  // ── SECTION 5: Authorization ────────────────────────────────
  section('AUTHORIZATION STATEMENT');
  var authText = body.appendParagraph(
    'The cardholder hereby certifies that all information provided on this form is true, correct, and complete. ' +
    'The cardholder authorizes Quality Inn & Suites McAlester on Hwy 69 to charge the credit card listed above ' +
    'for the charges indicated, inclusive of applicable taxes, fees, and service charges. ' +
    'This authorization remains in effect for the guest stay referenced above. ' +
    'Authorization agreed: ' + (p.authorization_agreed === 'yes' ? 'YES ✓' : 'NO')
  );
  authText.editAsText().setFontSize(9).setForegroundColor('#4a5568').setItalic(true);
  authText.setSpacingAfter(8);

  // ── SECTION 6: Signature ────────────────────────────────────
  section('CARDHOLDER SIGNATURE');
  var sigData = p.signature_data || '';
  if (sigData && sigData.indexOf('base64,') > -1) {
    try {
      var base64 = sigData.split('base64,')[1];
      var decoded = Utilities.base64Decode(base64);
      var blob = Utilities.newBlob(decoded, 'image/png', 'signature.png');
      var imgPara = body.appendParagraph('');
      imgPara.appendInlineImage(blob).setWidth(300).setHeight(80);
    } catch(sigErr) {
      body.appendParagraph('Signature: [error embedding image — ' + sigErr.toString() + ']')
          .editAsText().setFontSize(9).setForegroundColor('#c53030');
    }
  } else {
    body.appendParagraph('Signature: [not captured]')
        .editAsText().setFontSize(9).setForegroundColor('#c53030');
  }

  // ── Footer ──────────────────────────────────────────────────
  body.appendHorizontalRule();
  var footer = body.appendParagraph(
    'CVC is not stored per PCI guidelines.  |  ' +
    'Card number stored as masked (last 4 digits only).  |  ' +
    'Quality Inn & Suites McAlester on Hwy 69  |  Choice Hotels Franchise'
  );
  footer.editAsText().setFontSize(7).setForegroundColor('#a0aec0').setItalic(true);
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  // ── Export as PDF ────────────────────────────────────────────
  doc.saveAndClose();
  var tempFile = DriveApp.getFileById(doc.getId());
  var pdfBlob  = tempFile.getAs('application/pdf').setName(fileName);
  var pdfFile  = folder.createFile(pdfBlob);
  tempFile.setTrashed(true);   // delete the temp Google Doc

  Logger.log('PDF saved: ' + pdfFile.getUrl());
  return pdfFile;
}

// ── SEND EMAIL WITH PDF ATTACHED ─────────────────────────────
function sendEmailNotification(p, pdfFile) {
  var guestName   = p.guest_name   || 'Unknown Guest';
  var arrivalDate = p.arrival_date || '—';
  var deptDate    = p.departure_date || '—';
  var cardLast4   = (p.card_number || '').replace(/\s/g,'').slice(-4);

  var subject = 'CC Auth Form — ' + guestName + ' — Check-in ' + arrivalDate;

  var body =
    'A new credit card authorization form has been submitted.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'GUEST INFORMATION\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Guest Name:         ' + (p.guest_name        || '—') + '\n' +
    'Confirmation #:     ' + (p.confirmation_number || '—') + '\n' +
    'Arrival:            ' + arrivalDate + '\n' +
    'Departure:          ' + deptDate    + '\n' +
    'Guest Phone:        ' + (p.guest_phone  || '—') + '\n' +
    'Guest Email:        ' + (p.guest_email  || '—') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'CHARGE AUTHORIZATION\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Charges:            ' + (p.charge_type    || '—') + '\n' +
    'Total Amount:       ' + (p.total_amount   || '—') + '\n' +
    'Note to Hotel:      ' + (p.note_to_hotel  || '—') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'CARDHOLDER INFORMATION\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Name on Card:       ' + (p.name_on_card      || '—') + '\n' +
    'Card Type:          ' + (p.card_type         || '—') + '\n' +
    'Card Number:        **** **** **** ' + (cardLast4 || '????') + '\n' +
    'Expiry:             ' + (p.expiry            || '—') + '\n' +
    '(CVC not stored per PCI guidelines)\n\n' +
    'Cardholder Phone:   ' + (p.cardholder_phone  || '—') + '\n' +
    'Cardholder Email:   ' + (p.cardholder_email  || '—') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'BILLING ADDRESS\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (p.billing_address  || '') + (p.billing_address2 ? ', ' + p.billing_address2 : '') + '\n' +
    (p.city || '') + ', ' + (p.state || '') + ' ' + (p.zip || '') + '  ' + (p.country || '') + '\n\n' +
    'Authorization agreed: ' + (p.authorization_agreed === 'yes' ? 'YES ✓' : 'NO') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'The signed PDF authorization form is attached.\n' +
    'Drive location: ' + pdfFile.getUrl() + '\n\n' +
    'Quality Inn & Suites McAlester on Hwy 69\n' +
    '400 S George Nigh Expy, McAlester, OK 74501\n' +
    '(918) 426-8091\n';

  var pdfBlob = pdfFile.getAs('application/pdf').setName(pdfFile.getName());

  GmailApp.sendEmail(HOTEL_EMAIL, subject, body, {
    attachments: [pdfBlob],
    name: 'Quality Inn & Suites McAlester on Hwy 69',
    replyTo: p.cardholder_email || 'QualityMcAlester@gmail.com'
  });

  // Also send confirmation to cardholder if email provided
  if (p.cardholder_email) {
    var cardConfirm =
      'Dear ' + (p.name_on_card || 'Cardholder') + ',\n\n' +
      'Your credit card authorization form has been received by Quality Inn & Suites McAlester on Hwy 69.\n\n' +
      'Guest: ' + (p.guest_name || '—') + '\n' +
      'Check-in: ' + arrivalDate + '   Check-out: ' + deptDate + '\n' +
      'Charges authorized: ' + (p.charge_type || '—') + '\n\n' +
      'Please retain this email for your records. A copy of the signed authorization is attached.\n\n' +
      'Questions? Call (918) 426-8091 — available 24/7.\n\n' +
      'Quality Inn & Suites McAlester on Hwy 69\n' +
      '400 S George Nigh Expy, McAlester, OK 74501';

    GmailApp.sendEmail(p.cardholder_email, 'CC Authorization Received — Quality Inn McAlester on Hwy 69', cardConfirm, {
      attachments: [pdfBlob],
      name: 'Quality Inn & Suites McAlester on Hwy 69',
      replyTo: 'QualityMcAlester@gmail.com'
    });
  }

  Logger.log('Emails sent to: ' + HOTEL_EMAIL + (p.cardholder_email ? ' + ' + p.cardholder_email : ''));
}

// ── HELPERS ──────────────────────────────────────────────────
function maskCard(num) {
  if (!num) return '—';
  var clean = num.toString().replace(/\s/g, '');
  return '**** **** **** ' + clean.slice(-4);
}

function sanitize(str) {
  return (str || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── TEST FUNCTION ──────────────────────────────────────────────────────
// HOW TO RUN: In the function dropdown at the top of the editor,
// select "testForm" then click Run. Do NOT run doPost directly.
// ────────────────────────────────────────────────────────────────────────
function testForm() {
  var testData = {
    parameter: {
      guest_name:          'John Smith',
      confirmation_number: 'CH-123456',
      arrival_date:        '2026-06-01',
      departure_date:      '2026-06-05',
      guest_email:         'john@example.com',
      guest_phone:         '9185550000',
      charge_type:         'Room and Tax',
      total_amount:        '$450.00',
      note_to_hotel:       'Corporate billing - Acme Corp',
      name_on_card:        'John Smith',
      card_type:           'Visa',
      card_number:         '4111 1111 1111 1234',
      expiry:              '12/27',
      cardholder_phone:    '9185551234',
      cardholder_email:    'john@example.com',
      billing_address:     '123 Main St',
      billing_address2:    'Suite 400',
      city:                'Tulsa',
      state:               'OK',
      zip:                 '74103',
      country:             'US',
      authorization_agreed:'yes',
      signature_data:      ''
    }
  };
  doPost(testData);
  Logger.log('Test complete — check your Drive folder and email inbox.');
}


// ============================================================
// JOB APPLICATION HANDLER
// Add a second deployment OR handle both form types in doPost
// by checking a "form_type" field, OR deploy this as a
// separate Google Apps Script project at script.google.com.
// The application-form.html references APP_SCRIPT_URL —
// point it to whichever deployment handles job applications.
// ============================================================

var APP_EMAIL  = 'QualityMcAlester@gmail.com'; // where to send applications
var APP_FOLDER = 'Job Applications';                      // Google Drive folder name

function doPostApplication(e) {
  if (!e || !e.parameter) {
    return jsonResponse({ status: 'error', message: 'No data received.' });
  }
  try {
    var p = e.parameter || {};
    // Flatten multi-value checkboxes
    if (e.parameters) {
      for (var key in e.parameters) {
        if (e.parameters[key] && e.parameters[key].length > 1) {
          p[key] = e.parameters[key].join(', ');
        }
      }
    }
    var folder = getOrCreateFolder(APP_FOLDER);
    var pdfFile = createApplicationPDF(p, folder);
    sendApplicationEmail(p, pdfFile);
    return jsonResponse({ status: 'success', message: 'Application received.' });
  } catch (err) {
    Logger.log('App error: ' + err.toString());
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function createApplicationPDF(p, folder) {
  var firstName = p.first_name || '';
  var lastName  = p.last_name  || '';
  var position  = p.position   || 'General Application';
  var today     = new Date().toISOString().split('T')[0].replace(/-/g,'');
  var appStart  = (p.start_date || '').replace(/-/g,'');
  var appSuffix = appStart ? '_StartDate' + appStart : '_Submitted' + today;
  var fileName  = 'Application_' + sanitize(lastName + '_' + firstName) + '_' + sanitize(position) + appSuffix + '.pdf';

  var doc  = DocumentApp.create('_temp_application_' + new Date().getTime());
  var body = doc.getBody();
  body.setPageWidth(612).setPageHeight(792)
      .setMarginTop(54).setMarginBottom(54)
      .setMarginLeft(54).setMarginRight(54);

  // Header
  var h = body.appendParagraph('Quality Inn & Suites McAlester on Hwy 69');
  h.setHeading(DocumentApp.ParagraphHeading.HEADING1)
   .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  h.editAsText().setFontSize(16).setBold(true).setForegroundColor('#0f1f3d');

  body.appendParagraph('400 S George Nigh Expy  ·  McAlester, OK 74501  ·  (918) 426-8091')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(9).setForegroundColor('#718096');

  body.appendParagraph('EMPLOYMENT APPLICATION')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(13).setBold(true).setForegroundColor('#c9964a');

  body.appendParagraph('Submitted: ' + new Date().toLocaleString('en-US', {timeZone:'America/Chicago'}))
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(9).setForegroundColor('#a0aec0');

  body.appendHorizontalRule();

  function sec(t) {
    var p = body.appendParagraph(t);
    p.editAsText().setFontSize(10).setBold(true).setForegroundColor('#0f1f3d').setBackgroundColor('#f5f0e8');
    p.setSpacingBefore(10).setSpacingAfter(4);
  }
  function row(label, val) {
    var p = body.appendParagraph('');
    var t = p.editAsText();
    var v = (val||'—').toString().trim();
    t.insertText(0, label + ':  ');
    t.setBold(0, label.length, true).setFontSize(0, label.length, 9).setForegroundColor(0, label.length, '#4a5568');
    t.insertText(label.length+3, v);
    t.setBold(label.length+3, label.length+3+v.length-1, false)
     .setFontSize(label.length+3, label.length+3+v.length-1, 10)
     .setForegroundColor(label.length+3, label.length+3+v.length-1, '#0f1f3d');
    p.setSpacingAfter(3);
  }

  sec('POSITION OF INTEREST');
  row('Position', p.position);
  row('Employment Type', p.employment_type);
  row('Earliest Start Date', p.start_date);

  sec('PERSONAL INFORMATION');
  row('Full Name', (p.first_name||'') + ' ' + (p.last_name||''));
  row('Email', p.applicant_email);
  row('Phone', p.applicant_phone);
  row('City / State', (p.city||'') + ', ' + (p.state||''));

  sec('AVAILABILITY');
  row('Days Available', p.days_available);
  row('Shifts Available', p.shifts_available);
  row('Authorized to Work in US', p.work_authorized);
  row('Age 18 or Older', p.over_18);

  sec('WORK EXPERIENCE');
  row('Hotel/Hospitality Experience', p.hotel_experience);
  row('Education', p.education_level);
  row('Most Recent Employer', p.previous_employer);
  row('Previous Job Title', p.previous_title);
  row('Duration at Previous Job', p.previous_duration);
  row('Reason for Leaving', p.reason_leaving);
  row('May Contact Previous Employer', p.contact_previous_employer);
  row('Felony Conviction', p.felony_conviction);
  row('Skills / Certifications / Languages', p.skills);
  row('Why Do You Want to Work Here', p.why_apply);
  row('Additional Information', p.additional_info);

  sec('REFERENCES');
  row('Reference 1', (p.ref1_name||'—') + ' · ' + (p.ref1_phone||'') + ' · ' + (p.ref1_relation||''));
  row('Reference 2', (p.ref2_name||'—') + ' · ' + (p.ref2_phone||'') + ' · ' + (p.ref2_relation||''));

  sec('CERTIFICATION');
  body.appendParagraph(
    'The applicant certifies that all information provided is true and accurate. ' +
    'Certification agreed: ' + (p.certification_agreed === 'yes' ? 'YES ✓' : 'NO') + ' · ' +
    'Signed: ' + (p.sign_date || '—')
  ).editAsText().setFontSize(9).setForegroundColor('#4a5568').setItalic(true);

  // Signature
  var sigData = p.signature_data || '';
  if (sigData && sigData.indexOf('base64,') > -1) {
    try {
      var base64  = sigData.split('base64,')[1];
      var decoded = Utilities.base64Decode(base64);
      var blob    = Utilities.newBlob(decoded, 'image/png', 'signature.png');
      body.appendParagraph('').appendInlineImage(blob).setWidth(260).setHeight(70);
    } catch(e) {
      body.appendParagraph('Signature: [error embedding image]').editAsText().setFontSize(9);
    }
  }

  body.appendHorizontalRule();
  body.appendParagraph('Quality Inn & Suites McAlester on Hwy 69  ·  Choice Hotels Franchise  ·  Family-Owned')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(7).setForegroundColor('#a0aec0').setItalic(true);

  doc.saveAndClose();
  var tempFile = DriveApp.getFileById(doc.getId());
  var pdfBlob  = tempFile.getAs('application/pdf').setName(fileName);
  var pdfFile  = folder.createFile(pdfBlob);
  tempFile.setTrashed(true);
  Logger.log('Application PDF saved: ' + pdfFile.getUrl());
  return pdfFile;
}

function sendApplicationEmail(p, pdfFile) {
  var name     = (p.first_name||'') + ' ' + (p.last_name||'');
  var position = p.position || 'General Application';
  var subject  = 'Job Application — ' + name.trim() + ' — ' + position;

  var body =
    'New job application received at Quality Inn & Suites McAlester on Hwy 69.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'APPLICANT\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Name:              ' + name.trim() + '\n' +
    'Position:          ' + position + '\n' +
    'Employment Type:   ' + (p.employment_type   || '—') + '\n' +
    'Start Date:        ' + (p.start_date        || '—') + '\n' +
    'Phone:             ' + (p.applicant_phone   || '—') + '\n' +
    'Email:             ' + (p.applicant_email   || '—') + '\n' +
    'Location:          ' + (p.city||'') + ', ' + (p.state||'') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'AVAILABILITY\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Days:              ' + (p.days_available    || '—') + '\n' +
    'Shifts:            ' + (p.shifts_available  || '—') + '\n' +
    'Work Authorized:   ' + (p.work_authorized   || '—') + '\n' +
    'Age 18+:           ' + (p.over_18           || '—') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'EXPERIENCE\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Hotel Experience:  ' + (p.hotel_experience  || '—') + '\n' +
    'Education:         ' + (p.education_level   || '—') + '\n' +
    'Previous Employer: ' + (p.previous_employer || '—') + '\n' +
    'Previous Title:    ' + (p.previous_title    || '—') + '\n' +
    'Skills:            ' + (p.skills            || '—') + '\n' +
    'Why Apply:         ' + (p.why_apply         || '—') + '\n\n' +
    'Drive PDF: ' + pdfFile.getUrl() + '\n\n' +
    'Quality Inn & Suites McAlester on Hwy 69\n(918) 426-8091';

  var pdfBlob = pdfFile.getAs('application/pdf').setName(pdfFile.getName());

  GmailApp.sendEmail(APP_EMAIL, subject, body, {
    attachments: [pdfBlob],
    name: 'Quality Inn & Suites McAlester on Hwy 69',
    replyTo: p.applicant_email || 'QualityMcAlester@gmail.com'
  });

  // Confirmation to applicant
  if (p.applicant_email) {
    GmailApp.sendEmail(p.applicant_email,
      'Application Received — Quality Inn & Suites McAlester on Hwy 69',
      'Dear ' + (p.first_name||'Applicant') + ',\n\n' +
      'Thank you for your interest in joining the team at Quality Inn & Suites McAlester on Hwy 69.\n\n' +
      'Position applied for: ' + position + '\n\n' +
      'We review all applications and contact qualified candidates directly. ' +
      'No specific timeline can be guaranteed, but we appreciate your interest.\n\n' +
      'Questions? Call (918) 426-8091 and ask for the manager on duty.\n\n' +
      'Quality Inn & Suites McAlester on Hwy 69\n' +
      '400 S George Nigh Expy, McAlester, OK 74501',
      {
        name: 'Quality Inn & Suites McAlester on Hwy 69',
        replyTo: 'QualityMcAlester@gmail.com'
      }
    );
  }
  Logger.log('Application emails sent.');
}

// ── TEST FUNCTION FOR APPLICATION ─────────────────────────────
function testApplication() {
  var testData = {
    parameter: {
      first_name:               'Jane',
      last_name:                'Doe',
      position:                 'Guest Service Agent (Front Desk)',
      employment_type:          'Full-Time',
      start_date:               '2026-06-15',
      applicant_email:          'jane@example.com',
      applicant_phone:          '9185550001',
      city:                     'McAlester',
      state:                    'OK',
      days_available:           'Monday, Tuesday, Wednesday, Friday',
      shifts_available:         'Morning (6am-2pm), Afternoon (2pm-10pm)',
      work_authorized:          'Yes',
      over_18:                  'Yes',
      hotel_experience:         '1-2 years',
      education_level:          'High school diploma / GED',
      previous_employer:        'Holiday Inn Express Tulsa',
      previous_title:           'Front Desk Agent',
      previous_duration:        '1.5 years',
      reason_leaving:           'Relocated to McAlester',
      contact_previous_employer:'Yes',
      felony_conviction:        'No',
      skills:                   'Opera PMS, Bilingual English/Spanish',
      why_apply:                'I enjoy hospitality and want to grow with a great team.',
      additional_info:          '',
      ref1_name:                'Bob Smith',
      ref1_phone:               '9185550002',
      ref1_relation:            'Former supervisor',
      ref2_name:                'Carol Jones',
      ref2_phone:               '9185550003',
      ref2_relation:            'Colleague',
      certification_agreed:     'yes',
      sign_date:                '2026-05-17',
      signature_data:           ''
    }
  };
  doPostApplication(testData);
  Logger.log('Application test complete — check Gmail and Drive.');
}


// ============================================================
// GROUP TRAVEL INQUIRY HANDLER
// ============================================================

var GT_EMAIL  = 'QualityMcAlester@gmail.com';
var GT_FOLDER = 'Group Travel Inquiries';

function doPostGroupTravel(e) {
  if (!e || !e.parameter) return jsonResponse({status:'error',message:'No data.'});
  try {
    var p = e.parameter || {};
    if (e.parameters) {
      for (var k in e.parameters) {
        if (e.parameters[k] && e.parameters[k].length > 1) p[k] = e.parameters[k].join(', ');
      }
    }
    var folder  = getOrCreateFolder(GT_FOLDER);
    var pdfFile = createGroupTravelPDF(p, folder);
    sendGroupTravelEmail(p, pdfFile);
    return jsonResponse({status:'success',message:'Group inquiry received.'});
  } catch(err) {
    Logger.log('GT error: '+err.toString());
    return jsonResponse({status:'error',message:err.toString()});
  }
}

function createGroupTravelPDF(p, folder) {
  var org      = p.org_name   || 'Unknown Organization';
  var today    = new Date().toISOString().split('T')[0].replace(/-/g,'');
  var gtArr  = (p.checkin_date  || '').replace(/-/g,'');
  var gtDept = (p.checkout_date || '').replace(/-/g,'');
  var gtDates = (gtArr && gtDept) ? '_Arr'+gtArr+'_Dep'+gtDept : '_'+today;
  var fileName = 'GroupInquiry_'+sanitize(org)+gtDates+'.pdf';
  var doc      = DocumentApp.create('_temp_gt_'+new Date().getTime());
  var body     = doc.getBody();
  body.setPageWidth(612).setPageHeight(792).setMarginTop(54).setMarginBottom(54).setMarginLeft(54).setMarginRight(54);

  body.appendParagraph('Quality Inn & Suites McAlester on Hwy 69')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(16).setBold(true).setForegroundColor('#0f1f3d');
  body.appendParagraph('400 S George Nigh Expy  ·  McAlester, OK 74501  ·  (918) 426-8091')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(9).setForegroundColor('#718096');
  body.appendParagraph('GROUP & CORPORATE RATE INQUIRY')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(13).setBold(true).setForegroundColor('#c9964a');
  body.appendParagraph('Submitted: '+new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}))
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(9).setForegroundColor('#a0aec0');
  body.appendHorizontalRule();

  function sec(t){var p2=body.appendParagraph(t);p2.editAsText().setFontSize(10).setBold(true).setForegroundColor('#0f1f3d').setBackgroundColor('#f5f0e8');p2.setSpacingBefore(10).setSpacingAfter(4);}
  function row(l,v){var p2=body.appendParagraph('');var t=p2.editAsText();var val=(v||'—').toString().trim();t.insertText(0,l+':  ');t.setBold(0,l.length,true).setFontSize(0,l.length,9).setForegroundColor(0,l.length,'#4a5568');t.insertText(l.length+3,val);t.setBold(l.length+3,l.length+3+val.length-1,false).setFontSize(l.length+3,l.length+3+val.length-1,10).setForegroundColor(l.length+3,l.length+3+val.length-1,'#0f1f3d');p2.setSpacingAfter(3);}

  sec('ORGANIZATION & GROUP INFORMATION');
  row('Organization / Company', p.org_name);
  row('Group Type', p.group_type);
  row('Rooms Needed', p.rooms_needed);
  row('Arrival Date', p.checkin_date);
  row('Departure Date', p.checkout_date);
  row('Stay Type', p.stay_type);
  row('Room Type Preference', p.room_type_preference);
  row('Billing Method', p.billing_method);
  row('Pets in Group', p.pets_in_group);
  row('Special Requirements', p.special_requirements);

  sec('CONTACT INFORMATION');
  row('Name', (p.first_name||'')+ ' '+(p.last_name||''));
  row('Job Title', p.job_title);
  row('Phone', p.contact_phone);
  row('Email', p.contact_email);
  row('Alternate Contact', (p.alt_contact_name||'—')+' · '+(p.alt_contact_phone||''));

  body.appendHorizontalRule();
  body.appendParagraph('Quality Inn & Suites McAlester on Hwy 69  ·  Group Inquiry  ·  '+ new Date().toLocaleDateString())
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(7).setForegroundColor('#a0aec0').setItalic(true);

  doc.saveAndClose();
  var tmp=DriveApp.getFileById(doc.getId());
  var pdf=tmp.getAs('application/pdf').setName(fileName);
  var saved=folder.createFile(pdf);
  tmp.setTrashed(true);
  return saved;
}

function sendGroupTravelEmail(p, pdfFile) {
  var name    = ((p.first_name||'')+' '+(p.last_name||'')).trim();
  var org     = p.org_name || '—';
  var subject = 'Group Inquiry — '+org+' — '+name+' — Arrive '+(p.checkin_date||'TBD');
  var bodyTxt =
    'New group/corporate rate inquiry received.\n\n'+
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nORGANIZATION\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'+
    'Organization:    '+(p.org_name||'—')+'\n'+
    'Group Type:      '+(p.group_type||'—')+'\n'+
    'Rooms Needed:    '+(p.rooms_needed||'—')+'\n'+
    'Arrival:         '+(p.checkin_date||'—')+'\n'+
    'Departure:       '+(p.checkout_date||'—')+'\n'+
    'Stay Type:       '+(p.stay_type||'—')+'\n'+
    'Room Pref:       '+(p.room_type_preference||'—')+'\n'+
    'Billing:         '+(p.billing_method||'—')+'\n'+
    'Pets:            '+(p.pets_in_group||'—')+'\n'+
    'Special Notes:   '+(p.special_requirements||'—')+'\n\n'+
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCONTACT\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'+
    'Name:    '+name+'\nTitle:   '+(p.job_title||'—')+'\nPhone:   '+(p.contact_phone||'—')+'\nEmail:   '+(p.contact_email||'—')+'\nAlt:     '+((p.alt_contact_name||'')+' '+(p.alt_contact_phone||'')).trim()+'\n\n'+
    'Drive PDF: '+pdfFile.getUrl()+'\n\nQuality Inn & Suites McAlester on Hwy 69\n(918) 426-8091';

  GmailApp.sendEmail(GT_EMAIL, subject, bodyTxt, {
    attachments:[pdfFile.getAs('application/pdf').setName(pdfFile.getName())],
    name:'Quality Inn & Suites McAlester on Hwy 69',
    replyTo: p.contact_email||'QualityMcAlester@gmail.com'
  });
  if (p.contact_email) {
    GmailApp.sendEmail(p.contact_email,'Group Rate Request Received — Quality Inn & Suites McAlester on Hwy 69',
      'Dear '+(p.first_name||'there')+',\n\nThank you for your group rate inquiry for '+(p.org_name||'your group')+'.\n\nWe have received your request for '+(p.rooms_needed||'your rooms')+' arriving '+(p.checkin_date||'TBD')+'.\nA member of our team will contact you within 1 business day with a custom rate quote.\n\nFor immediate assistance, call (918) 426-8091 — available 24/7.\n\nQuality Inn & Suites McAlester on Hwy 69\n400 S George Nigh Expy, McAlester, OK 74501',
      {name:'Quality Inn & Suites McAlester on Hwy 69',replyTo:'QualityMcAlester@gmail.com'});
  }
  Logger.log('Group travel emails sent.');
}

function testGroupTravel() {
  doPostGroupTravel({parameter:{
    org_name:'Union Pacific Railroad',group_type:'Railroad / Transportation Crew',
    rooms_needed:'10-19 rooms',checkin_date:'2026-06-01',checkout_date:'2026-06-08',
    stay_type:'Weekly recurring',room_type_preference:'King Rooms',billing_method:'Master folio / Company billing',
    pets_in_group:'No pets',special_requirements:'Soundproofed rooms required. Crew on rest-period schedule.',
    first_name:'Bob',last_name:'Conductor',job_title:'Crew Coordinator',
    contact_phone:'9185550100',contact_email:'bob@up.com',
    alt_contact_name:'Jane Rail',alt_contact_phone:'9185550101'
  }});
  Logger.log('Group travel test done.');
}


// ============================================================
// GUEST FEEDBACK HANDLER
// ============================================================

var FB_EMAIL  = 'QualityMcAlester@gmail.com';
var FB_FOLDER = 'Guest Feedback';

function doPostFeedback(e) {
  if (!e || !e.parameter) return jsonResponse({status:'error',message:'No data.'});
  try {
    var p = e.parameter || {};
    var folder  = getOrCreateFolder(FB_FOLDER);
    var pdfFile = createFeedbackPDF(p, folder);
    sendFeedbackEmail(p, pdfFile);
    return jsonResponse({status:'success',message:'Feedback received.'});
  } catch(err) {
    Logger.log('FB error: '+err.toString());
    return jsonResponse({status:'error',message:err.toString()});
  }
}

function createFeedbackPDF(p, folder) {
  var name     = p.guest_name || 'Anonymous Guest';
  var today    = new Date().toISOString().split('T')[0].replace(/-/g,'');
  var overall  = p.rating_overall || '—';
  var fbStay = (p.stay_date || '').replace(/-/g,'');
  var fbDate = fbStay ? '_Stay'+fbStay : '_'+today;
  var fileName = 'Feedback_'+overall+'star_'+sanitize(name)+fbDate+'.pdf';
  var doc      = DocumentApp.create('_temp_fb_'+new Date().getTime());
  var body     = doc.getBody();
  body.setPageWidth(612).setPageHeight(792).setMarginTop(54).setMarginBottom(54).setMarginLeft(54).setMarginRight(54);

  // Header with big star rating
  body.appendParagraph('Quality Inn & Suites McAlester on Hwy 69')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(16).setBold(true).setForegroundColor('#0f1f3d');
  body.appendParagraph('400 S George Nigh Expy  ·  McAlester, OK 74501  ·  (918) 426-8091')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(9).setForegroundColor('#718096');
  body.appendParagraph('GUEST FEEDBACK — OVERALL RATING: '+overall+' / 5 STARS')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(13).setBold(true).setForegroundColor(overall>='4'?'#2d6a4f':'#c53030');
  body.appendParagraph('Submitted: '+new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}))
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(9).setForegroundColor('#a0aec0');
  body.appendHorizontalRule();

  function sec(t){var p2=body.appendParagraph(t);p2.editAsText().setFontSize(10).setBold(true).setForegroundColor('#0f1f3d').setBackgroundColor('#f5f0e8');p2.setSpacingBefore(10).setSpacingAfter(4);}
  function row(l,v){var p2=body.appendParagraph('');var t=p2.editAsText();var val=(v||'—').toString().trim();t.insertText(0,l+':  ');t.setBold(0,l.length,true).setFontSize(0,l.length,9).setForegroundColor(0,l.length,'#4a5568');t.insertText(l.length+3,val);t.setBold(l.length+3,l.length+3+val.length-1,false).setFontSize(l.length+3,l.length+3+val.length-1,10).setForegroundColor(l.length+3,l.length+3+val.length-1,'#0f1f3d');p2.setSpacingAfter(3);}

  sec('STAY INFORMATION');
  row('Date of Stay', p.stay_date);
  row('Nights Stayed', p.nights_stayed);
  row('Room Type', p.room_type);
  row('Purpose of Visit', p.travel_reason);

  sec('RATINGS');
  row('Overall Experience', (p.rating_overall||'—')+' / 5');
  row('Room Cleanliness', p.rating_cleanliness||'—');
  row('Front Desk Staff', p.rating_staff||'—');
  row('Breakfast', p.rating_breakfast||'—');
  row('Parking', p.rating_parking||'—');

  sec('COMMENTS');
  row('What Went Well', p.what_went_well||'—');
  row('What To Improve', p.what_to_improve||'—');
  row('Would Return', p.would_return||'—');
  row('Left Online Review', p.online_review||'—');

  sec('GUEST CONTACT');
  row('Name', p.guest_name||'Anonymous');
  row('Email', p.guest_email||'Not provided');
  row('Contact Preference', p.contact_preference||'—');

  body.appendHorizontalRule();
  body.appendParagraph('Quality Inn & Suites McAlester on Hwy 69  ·  Guest Feedback  ·  '+new Date().toLocaleDateString())
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(7).setForegroundColor('#a0aec0').setItalic(true);

  doc.saveAndClose();
  var tmp=DriveApp.getFileById(doc.getId());
  var pdf=tmp.getAs('application/pdf').setName(fileName);
  var saved=folder.createFile(pdf);
  tmp.setTrashed(true);
  return saved;
}

function sendFeedbackEmail(p, pdfFile) {
  var overall  = p.rating_overall || '?';
  var name     = p.guest_name || 'Anonymous';
  var stayDate = p.stay_date  || 'unknown date';
  var urgency  = parseInt(overall) <= 2 ? '🚨 URGENT — ' : (parseInt(overall) >= 5 ? '⭐ 5-Star — ' : '');
  var subject  = urgency+'Guest Feedback — '+overall+'/5 Stars — '+name+' — Stay: '+stayDate;

  var bodyTxt =
    urgency+'New guest feedback received.\n\n'+
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRATINGS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'+
    'Overall:      '+(p.rating_overall||'—')+' / 5\n'+
    'Cleanliness:  '+(p.rating_cleanliness||'—')+'\n'+
    'Staff:        '+(p.rating_staff||'—')+'\n'+
    'Breakfast:    '+(p.rating_breakfast||'—')+'\n'+
    'Parking:      '+(p.rating_parking||'—')+'\n\n'+
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCOMMENTS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'+
    'What went well:\n'+(p.what_went_well||'—')+'\n\n'+
    'What to improve:\n'+(p.what_to_improve||'—')+'\n\n'+
    'Would return: '+(p.would_return||'—')+'\n'+
    'Online review: '+(p.online_review||'—')+'\n\n'+
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nGUEST\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'+
    'Name:    '+name+'\nEmail:   '+(p.guest_email||'Not provided')+'\nStay:    '+stayDate+'\nNights:  '+(p.nights_stayed||'—')+'\nRoom:    '+(p.room_type||'—')+'\n\n'+
    'Drive PDF: '+pdfFile.getUrl()+'\n\nQuality Inn & Suites McAlester on Hwy 69\n(918) 426-8091';

  GmailApp.sendEmail(FB_EMAIL, subject, bodyTxt, {
    attachments:[pdfFile.getAs('application/pdf').setName(pdfFile.getName())],
    name:'Quality Inn & Suites McAlester on Hwy 69 — Feedback',
    replyTo:p.guest_email||'QualityMcAlester@gmail.com'
  });

  if (p.guest_email) {
    GmailApp.sendEmail(p.guest_email,'Feedback Received — Quality Inn & Suites McAlester on Hwy 69',
      'Dear '+(p.guest_name||'Guest')+',\n\nThank you for taking the time to share your feedback with us.\n\n'+(parseInt(p.rating_overall)<=2?'We are sorry your stay did not meet expectations. A manager will review your feedback and follow up with you directly within 24 hours.\n\n':'We are delighted to hear about your experience and will share your kind words with our team.\n\n')+'Quality Inn & Suites McAlester on Hwy 69\n400 S George Nigh Expy, McAlester, OK 74501\n(918) 426-8091',
      {name:'Quality Inn & Suites McAlester on Hwy 69',replyTo:'QualityMcAlester@gmail.com'});
  }
  Logger.log('Feedback emails sent. Rating: '+overall);
}

function testFeedback() {
  doPostFeedback({parameter:{
    stay_date:'2026-05-15',nights_stayed:'3 nights',room_type:'King Room',
    travel_reason:'Business / Work',rating_overall:'4',rating_cleanliness:'5',
    rating_staff:'4',rating_breakfast:'5',rating_parking:'5',
    what_went_well:'Breakfast was great every morning. Room was spotless.',
    what_to_improve:'TV remote had a dead battery on arrival.',
    would_return:'Yes - definitely',online_review:'Yes - Google',
    guest_name:'Test Guest',guest_email:'test@example.com',contact_preference:'Email'
  }});
  Logger.log('Feedback test done.');
}
