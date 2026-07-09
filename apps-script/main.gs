/****************************************************
 * * AI Job Market Intelligence Automation
 *
 * Portfolio version
 *
 * Sensitive configuration values and environment-
 * specific settings have been removed.
 ****************************************************/

const JOBS_SHEET_NAME = "Jobs";
const SETTINGS_SHEET_NAME = "Settings";

const JOB_HEADERS = [
  "JobID",
  "Date Found",
  "Company",
  "Position",
  "Location",
  "Source",
  "URL",
  "Description",
  "Score",
  "Status",
  "Notes",
  "UniqueKey"
];

const MAX_DETAIL_FETCH_PER_RUN = 30;
const SAFE_RUNTIME_MS = 270000;
const SAVE_DESCRIPTION = false;


/****************************************************
 * 1. MAIN FUNCTIONS
 ****************************************************/

function fetchAllJobs() {

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    Logger.log("Másik futás még folyamatban van, ezért ez a futás most kilép.");
    return;
  }

  try {

    setupJobTracker();

    const sites = getSites();

    let totalNewJobs = 0;

    Logger.log("Bekapcsolt források: " + JSON.stringify(sites));

    if (siteEnabled(sites, "linkedin-email")) {

      Logger.log("LinkedIn email modul indul.");

      totalNewJobs += fetchLinkedInJobsFromEmails();

    }

    if (siteEnabled(sites, "karriere.at")) {

      Logger.log("Karriere.at modul indul.");

      totalNewJobs += fetchKarriereJobsMulti();

    }

    Logger.log("Összes új állás ebben a futásban: " + totalNewJobs);

  } finally {

    lock.releaseLock();

  }

}



function setupJobTracker(verbose) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let jobsSheet = ss.getSheetByName(JOBS_SHEET_NAME);

  if (!jobsSheet) {
    jobsSheet = ss.insertSheet(JOBS_SHEET_NAME);
  }

  ensureHeaders(jobsSheet, JOB_HEADERS);

  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);

  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  }

  ensureSettings(settingsSheet);

  if (verbose !== false) {
    Logger.log("Setup kész.");
  }

}



function testSaveJob() {

  setupJobTracker();

  saveJob({
    title: "Test Business Analyst",
    company: "Test Company",
    location: "Vienna",
    source: "Test",
    url: "https://example.com/test-job",
    description: "This is a test job.",
    keyword: "Test",
    notes: "Manual test"
  });

}



/****************************************************
 * 2. SHEET SETUP
 ****************************************************/

function ensureHeaders(sheet, headers) {

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);

  headerRange.setFontWeight("bold");
  headerRange.setBackground("#d9eaf7");

  sheet.autoResizeColumns(1, headers.length);

}



function ensureSettings(sheet) {

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 2).setValues([["Key", "Value"]]);
  }

  const firstRow = sheet.getRange(1, 1, 1, 2).getValues()[0];

  if (firstRow[0] !== "Key" || firstRow[1] !== "Value") {
    sheet.getRange(1, 1, 1, 2).setValues([["Key", "Value"]]);
  }

  const defaults = {
    "Location": "Vienna",
    "Keyword1": "Business Analyst",
    "Keyword2": "Operations Analyst",
    "Keyword3": "Business Operations",
    "Keyword4": "Office Administrator",
    "Keyword5": "Back Office",
    "Keyword6": "Data Entry",
    "Language": "English OR German",
    "Sites": "karriere.at, linkedin-email"
  };

  const existingKeys = {};

  if (sheet.getLastRow() >= 2) {

    const data = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 2)
      .getValues();

    data.forEach(row => {

      const key = String(row[0] || "").trim();

      if (key) {
        existingKeys[key] = true;
      }

    });

  }

  Object.keys(defaults).forEach(key => {

    if (!existingKeys[key]) {
      sheet.appendRow([key, defaults[key]]);
    }

  });

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);

}
