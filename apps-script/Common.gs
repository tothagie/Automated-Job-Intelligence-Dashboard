/****************************************************
 * 5. OPTIONAL DEBUG FUNCTIONS
 ****************************************************/

function debugShowSitesSetting() {

  setupJobTracker();

  const sites = getSites();

  Logger.log("Sites lista:");
  Logger.log(JSON.stringify(sites));

  Logger.log("karriere.at enabled: " + siteEnabled(sites, "karriere.at"));
  Logger.log("linkedin-email enabled: " + siteEnabled(sites, "linkedin-email"));

}



function debugFindLinkedInJobAlertEmails() {

  const queries = [
    'newer_than:30d from:linkedin.com',
    'newer_than:30d "LinkedIn Job Alert"',
    'newer_than:30d "new jobs for you"',
    'newer_than:30d "jobs matching"',
    'newer_than:30d subject:(LinkedIn job)',
    'newer_than:30d subject:(job alert)'
  ];

  queries.forEach(query => {

    Logger.log("----------");
    Logger.log("Keresés: " + query);

    const threads = GmailApp.search(query, 0, 10);

    Logger.log("Talált threadek száma: " + threads.length);

    threads.forEach(thread => {

      const messages = thread.getMessages();
      const lastMessage = messages[messages.length - 1];

      Logger.log(
        "FROM: "
        + lastMessage.getFrom()
        + " | SUBJECT: "
        + lastMessage.getSubject()
        + " | DATE: "
        + lastMessage.getDate()
      );

    });

  });

}



function debugLinkedInEmailImport() {

  const newJobs = fetchLinkedInJobsFromEmails();

  Logger.log("Debug LinkedIn email import kész. Új állások: " + newJobs);

}



/****************************************************
 * 6. JOB DETAILS PARSING
 ****************************************************/

function getJobDetails(url) {

  try {

    const html = fetchHtml(url);

    const posting = getJobPostingFromJsonLd(html);

    if (posting) {

      return {
        title: cleanText(posting.title) || extractTitleFromHtml(html),
        company: cleanText(getPostingCompany(posting)) || extractCompanyFromHtml(html),
        location: cleanText(getPostingLocation(posting)) || extractLocationFromHtml(html),
        description: limitText(stripHtml(posting.description || ""), 3000)
      };

    }

    return {
      title: extractTitleFromHtml(html),
      company: extractCompanyFromHtml(html),
      location: extractLocationFromHtml(html),
      description: extractDescriptionFromHtml(html)
    };

  } catch (error) {

    Logger.log("getJobDetails hiba: " + url + " | " + error);

    return {
      title: "Unknown",
      company: "Unknown",
      location: "",
      description: ""
    };

  }

}



function getJobPostingFromJsonLd(html) {

  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {

    try {

      let jsonText = htmlDecode(match[1])
        .replace(/^\s*<!--/, "")
        .replace(/-->\s*$/, "")
        .trim();

      const data = JSON.parse(jsonText);

      const posting = findJobPosting(data);

      if (posting) {
        return posting;
      }

    } catch (error) {
      // Nem minden JSON-LD blokk JobPosting. Ezt csendben átugorjuk.
    }

  }

  return null;

}



function findJobPosting(data) {

  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {

    for (let i = 0; i < data.length; i++) {

      const found = findJobPosting(data[i]);

      if (found) {
        return found;
      }

    }

    return null;

  }

  if (typeof data === "object") {

    const type = data["@type"];

    if (
      type === "JobPosting" ||
      (
        Array.isArray(type) &&
        type.indexOf("JobPosting") !== -1
      )
    ) {
      return data;
    }

    if (data["@graph"]) {

      const graphFound = findJobPosting(data["@graph"]);

      if (graphFound) {
        return graphFound;
      }

    }

    const keys = Object.keys(data);

    for (let i = 0; i < keys.length; i++) {

      const value = data[keys[i]];

      if (typeof value === "object") {

        const found = findJobPosting(value);

        if (found) {
          return found;
        }

      }

    }

  }

  return null;

}



function getPostingCompany(posting) {

  const org = posting.hiringOrganization;

  if (!org) {
    return "";
  }

  if (Array.isArray(org)) {
    return getPostingCompany({ hiringOrganization: org[0] });
  }

  if (typeof org === "string") {
    return org;
  }

  return org.name || "";

}



function getPostingLocation(posting) {

  const loc = posting.jobLocation;

  if (!loc) {
    return "";
  }

  if (Array.isArray(loc)) {
    return loc.map(item => getPostingLocation({ jobLocation: item })).join(", ");
  }

  if (typeof loc === "string") {
    return loc;
  }

  const address = loc.address || loc;

  if (typeof address === "string") {
    return address;
  }

  const parts = [
    address.addressLocality,
    address.addressRegion,
    address.addressCountry
  ].filter(Boolean);

  return parts.join(", ");

}



function extractTitleFromHtml(html) {

  const patterns = [
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ];

  for (let i = 0; i < patterns.length; i++) {

    const match = html.match(patterns[i]);

    if (match && match[1]) {

      let title = cleanText(stripHtml(match[1]));

      title = title
        .replace(/\s+\|\s+karriere\.at.*$/i, "")
        .replace(/\s+-\s+karriere\.at.*$/i, "")
        .trim();

      if (title) {
        return title;
      }

    }

  }

  return "Unknown";

}



function extractCompanyFromHtml(html) {

  const patterns = [
    /"hiringOrganization"\s*:\s*\{[\s\S]*?"name"\s*:\s*"([^"]+)"/i,
    /"company"\s*:\s*"([^"]+)"/i,
    /"companyName"\s*:\s*"([^"]+)"/i,
    /"employer"\s*:\s*"([^"]+)"/i
  ];

  for (let i = 0; i < patterns.length; i++) {

    const match = html.match(patterns[i]);

    if (match && match[1]) {
      return cleanText(match[1]);
    }

  }

  return "Unknown";

}



function extractLocationFromHtml(html) {

  const patterns = [
    /"addressLocality"\s*:\s*"([^"]+)"/i,
    /"location"\s*:\s*"([^"]+)"/i,
    /"jobLocation"\s*:\s*"([^"]+)"/i
  ];

  for (let i = 0; i < patterns.length; i++) {

    const match = html.match(patterns[i]);

    if (match && match[1]) {
      return cleanText(match[1]);
    }

  }

  return "";

}



function extractDescriptionFromHtml(html) {

  const patterns = [
    /"description"\s*:\s*"([\s\S]*?)","/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<body[^>]*>([\s\S]*?)<\/body>/i
  ];

  for (let i = 0; i < patterns.length; i++) {

    const match = html.match(patterns[i]);

    if (match && match[1]) {
      return limitText(stripHtml(match[1]), 3000);
    }

  }

  return "";

}



/****************************************************
 * 7. SAVE / DUPLICATE HANDLING
 ****************************************************/

function saveJob(job) {

  setupJobTracker(false);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(JOBS_SHEET_NAME);

  const uniqueKey = createUniqueKey(job);

  const uniqueKeyCol = getHeaderIndex(sheet, "UniqueKey");

  if (sheet.getLastRow() >= 2) {

    const keys = sheet
      .getRange(2, uniqueKeyCol, sheet.getLastRow() - 1, 1)
      .getValues()
      .map(row => String(row[0] || ""));

    const existingIndex = keys.indexOf(uniqueKey);

    if (existingIndex !== -1) {

      const rowNumber = existingIndex + 2;

      mergeJobSource(
        sheet,
        rowNumber,
        job.source,
        job.url,
        job.notes
      );

      Logger.log("Duplikáció összevonva: " + job.title);

      return false;

    }

  }

  const score = calculateScore(job);

  const row = [
    "JOB-" + Utilities.getUuid().substring(0, 8),
    new Date(),
    job.company || "Unknown",
    job.title || "Unknown",
    job.location || "",
    job.source || "",
    job.url || "",
    "",
    score,
    "New",
    job.notes || "",
    uniqueKey
  ];

  sheet.appendRow(row);

  Logger.log("Új állás mentve: " + job.title + " | Score: " + score);

  return true;

}



function mergeJobSource(sheet, rowNumber, source, url, notes) {

  const sourceCol = getHeaderIndex(sheet, "Source");
  const urlCol = getHeaderIndex(sheet, "URL");
  const notesCol = getHeaderIndex(sheet, "Notes");

  const oldSource = sheet.getRange(rowNumber, sourceCol).getValue();
  const oldUrl = sheet.getRange(rowNumber, urlCol).getValue();
  const oldNotes = sheet.getRange(rowNumber, notesCol).getValue();

  sheet
    .getRange(rowNumber, sourceCol)
    .setValue(appendUniqueComma(oldSource, source));

  sheet
    .getRange(rowNumber, urlCol)
    .setValue(appendUniqueLine(oldUrl, url));

  sheet
    .getRange(rowNumber, notesCol)
    .setValue(appendUniqueLine(oldNotes, notes));

}



function getExistingUniqueKeys() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(JOBS_SHEET_NAME);

  const existingKeys = {};

  if (!sheet || sheet.getLastRow() < 2) {
    return existingKeys;
  }

  const uniqueKeyCol = getHeaderIndex(sheet, "UniqueKey");

  const keys = sheet
    .getRange(2, uniqueKeyCol, sheet.getLastRow() - 1, 1)
    .getValues();

  keys.forEach(row => {

    const key = String(row[0] || "").trim();

    if (key) {
      existingKeys[key] = true;
    }

  });

  return existingKeys;

}



function createUniqueKeyFromUrl(url) {

  const text = String(url || "");

  const linkedInMatch = text.match(/linkedin\.com\/jobs\/view\/([0-9]+)/i);

  if (linkedInMatch && linkedInMatch[1]) {
    return "linkedin|" + linkedInMatch[1];
  }

  const karriereMatch = text.match(/karriere\.at\/jobs\/([0-9]+)/i);

  if (karriereMatch && karriereMatch[1]) {
    return "karriere|" + karriereMatch[1];
  }

  return "";

}



function createUniqueKey(job) {

  const keyFromUrl = createUniqueKeyFromUrl(job.url);

  if (keyFromUrl) {
    return keyFromUrl;
  }

  return [
    normalizeForKey(job.title),
    normalizeForKey(job.company),
    normalizeForKey(job.location)
  ].join("|");

}



function getHeaderIndex(sheet, headerName) {

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  const index = headers.indexOf(headerName);

  if (index === -1) {
    throw new Error("Hiányzó oszlop: " + headerName);
  }

  return index + 1;

}



/****************************************************
 * 8. SCORING
 ****************************************************/

function calculateScore(job) {

  const text = normalizeText([
    job.title,
    job.company,
    job.location,
    job.description,
    job.notes
  ].join(" "));

  let score = 0;

  const keywords = getKeywords();

  keywords.forEach(keyword => {

    const normalizedKeyword = normalizeText(keyword);

    if (
      normalizedKeyword &&
      text.indexOf(normalizedKeyword) !== -1
    ) {
      score += 10;
    }

  });

  if (/business analyst|business analysis|requirements engineer|requirement/i.test(text)) {
    score += 30;
  }

  if (/process analyst|process improvement|prozess|prozessmanager|bpmn|workflow/i.test(text)) {
    score += 25;
  }

  if (/operations analyst|business operations|operations specialist|service operations/i.test(text)) {
    score += 25;
  }

  if (/product analyst|product owner|product manager|digital product/i.test(text)) {
    score += 20;
  }

  if (/pmo|project operations|project coordinator|projektkoordination/i.test(text)) {
    score += 20;
  }

  if (/data analyst|reporting analyst|business intelligence|power bi|sql|dashboard|dwh|data warehouse|analytics/i.test(text)) {
    score += 20;
  }

  if (/vienna|wien/i.test(text)) {
    score += 10;
  }

  if (/remote|hybrid|home office/i.test(text)) {
    score += 8;
  }

  if (/english|englisch|german|deutsch/i.test(text)) {
    score += 6;
  }

  if (/office administrator|back office|data entry|administrative assistant/i.test(text)) {
    score += 8;
  }

  if (/internship|praktikum|werkstudent|studentische|professur|lehrling/i.test(text)) {
    score -= 30;
  }

  if (/senior java|developer|software engineer|devops|system administrator/i.test(text)) {
    score -= 20;
  }

  return score;

}



/****************************************************
 * 9. SETTINGS HELPERS
 ****************************************************/

function getSites() {

  const value = getSettingValue("Sites") || "karriere.at, linkedin-email";

  return splitSearchValues(value)
    .map(item => item.toLowerCase().trim())
    .filter(Boolean);

}



function getKeywords() {

  const keywords = [];

  for (let i = 1; i <= 20; i++) {

    const value = getSettingValue("Keyword" + i);

    if (value) {
      keywords.push(value);
    }

  }

  if (keywords.length === 0) {

    return [
      "Business Analyst",
      "Operations Analyst",
      "Business Operations",
      "Office Administrator",
      "Back Office",
      "Data Entry"
    ];

  }

  return keywords;

}



function getSearchLocations() {

  const value = getSettingValue("Location") || "Vienna OR Remote Austria";

  return splitSearchValues(value)
    .map(location => normalizeLocation(location))
    .filter(Boolean);

}



function getSettingValue(key) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);

  if (!sheet || sheet.getLastRow() < 2) {
    return "";
  }

  const data = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 2)
    .getValues();

  for (let i = 0; i < data.length; i++) {

    if (String(data[i][0] || "").trim() === key) {
      return String(data[i][1] || "").trim();
    }

  }

  return "";

}



function splitSearchValues(value) {

  return String(value || "")
    .split(/\s+OR\s+|,|;/i)
    .map(item => item.trim())
    .filter(Boolean);

}



function siteEnabled(sites, site) {

  const normalizedSite = String(site || "").toLowerCase().trim();

  return sites.some(item => {
    return String(item || "").toLowerCase().trim() === normalizedSite;
  });

}



function normalizeLocation(location) {

  const text = String(location || "").trim();

  if (/^(vienna|wien)$/i.test(text)) {
    return "Vienna";
  }

  if (/remote/i.test(text)) {
    return "Remote Austria";
  }

  if (/austria|österreich/i.test(text)) {
    return "Austria";
  }

  return text;

}



/****************************************************
 * 10. GENERAL HELPERS
 ****************************************************/

function fetchHtml(url) {

  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: getDefaultHeaders()
  });

  const status = response.getResponseCode();

  if (status >= 400) {
    throw new Error("HTTP " + status + " | " + url);
  }

  return response.getContentText();

}



function getDefaultHeaders() {

  return {
    "User-Agent": "Mozilla/5.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-AT,de;q=0.9,en;q=0.8"
  };

}



function ensureAbsoluteUrl(url, baseUrl) {

  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.indexOf("//") === 0) {
    return "https:" + url;
  }

  if (url.charAt(0) === "/") {
    return baseUrl.replace(/\/$/, "") + url;
  }

  return baseUrl.replace(/\/$/, "") + "/" + url;

}



function cleanUrl(url) {

  return String(url || "")
    .replace(/&amp;/g, "&")
    .split("#")[0]
    .split("?")[0]
    .replace(/[),.;]+$/g, "")
    .trim();

}



function cleanText(value) {

  return htmlDecode(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();

}



function normalizeText(value) {

  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

}



function normalizeForKey(value) {

  return normalizeText(value)
    .replace(/\(.*?m\/w\/d.*?\)/gi, "")
    .replace(/\(.*?f\/m\/d.*?\)/gi, "")
    .replace(/\(.*?all genders.*?\)/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

}



function stripHtml(value) {

  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}



function htmlDecode(value) {

  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

}



function limitText(value, maxLength) {

  const text = cleanText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";

}



function appendUniqueComma(existingValue, newValue) {

  const existing = String(existingValue || "").trim();
  const incoming = String(newValue || "").trim();

  if (!incoming) {
    return existing;
  }

  if (!existing) {
    return incoming;
  }

  const parts = existing
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  if (parts.indexOf(incoming) === -1) {
    parts.push(incoming);
  }

  return parts.join(", ");

}



function appendUniqueLine(existingValue, newValue) {

  const existing = String(existingValue || "").trim();
  const incoming = String(newValue || "").trim();

  if (!incoming) {
    return existing;
  }

  if (!existing) {
    return incoming;
  }

  const parts = existing
    .split(/\n+/)
    .map(item => item.trim())
    .filter(Boolean);

  if (parts.indexOf(incoming) === -1) {
    parts.push(incoming);
  }

  return parts.join("\n");

}



/****************************************************
 * 11. LINKEDIN TEXT HELPERS
 ****************************************************/

function liStripHtml(value) {

  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");

}



function liCleanText(value) {

  return liHtmlDecode(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();

}



function liHtmlDecode(value) {

  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

}
