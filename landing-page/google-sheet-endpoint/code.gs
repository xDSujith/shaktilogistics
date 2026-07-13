function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    const headers = sheet.getLastRow() === 0;
    if (headers) {
      sheet.appendRow([
        'Timestamp', 'Name', 'Steam / TMP URL', 'Timezone',
        'Experience', 'Why Join', 'Submitted At'
      ]);
    }

    sheet.appendRow([
      new Date(),
      data.name,
      data.steamUrl,
      data.timezone,
      data.experience,
      data.whyJoin,
      data._ts || new Date().toISOString()
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'Shakti Logistics — Form Endpoint' }))
    .setMimeType(ContentService.MimeType.JSON);
}
