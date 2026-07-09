/****************************************************
 * 3. KARriere.at MODULE
 ****************************************************/

function fetchKarriereJobsMulti() {

  const startTime = Date.now();

  setupJobTracker(false);

  const locations = getSearchLocations();
  const keywords = getKeywords();

  const urlMap = {};

  Logger.log("Karriere.at keresés indul.");
  Logger.log("Lokációk: " + locations.join(", "));
  Logger.log("Kulcsszavak: " + keywords.join(", "));

  keywords.forEach(keyword => {

    locations.forEach(location => {

      const searchUrl = buildKarriereSearchUrl(keyword, location);

      try {

        const html = fetchHtml(searchUrl);
        const jobUrls = extractKarriereJobUrls(html);

        Logger.log(
          keyword + " | " + location + " | karriere.at találatok: " + jobUrls.length
        );

        jobUrls.forEach(jobUrl => {

          if (!urlMap[jobUrl]) {

            urlMap[jobUrl] = {
              url: jobUrl,
              notes: []
            };

          }

          urlMap[jobUrl].notes.push(keyword + " / " + location);

        });

        Utilities.sleep(200);

      } catch (error) {

        Logger.log(
          "Karriere hiba: "
          + keyword
          + " | "
          + location
          + " | "
          + error
        );

      }

    });

  });

  const uniqueUrls = Object.keys(urlMap);

  Logger.log("Karriere.at egyedi URL-ek száma: " + uniqueUrls.length);

  const existingKeys = getExistingUniqueKeys();

  let checkedJobs = 0;
  let skippedExisting = 0;
  let newJobs = 0;

  for (let i = 0; i < uniqueUrls.length; i++) {

    if (Date.now() - startTime > SAFE_RUNTIME_MS) {

      Logger.log("Biztonsági időlimit elérve. A következő futás folytatja.");
      break;

    }

    if (checkedJobs >= MAX_DETAIL_FETCH_PER_RUN) {

      Logger.log("MAX_DETAIL_FETCH_PER_RUN limit elérve: " + MAX_DETAIL_FETCH_PER_RUN);
      break;

    }

    const jobUrl = uniqueUrls[i];
    const urlKey = createUniqueKeyFromUrl(jobUrl);

    if (urlKey && existingKeys[urlKey]) {

      skippedExisting++;
      continue;

    }

    checkedJobs++;

    const meta = urlMap[jobUrl];
    const jobData = getJobDetails(jobUrl);

    const saved = saveJob({

      title: jobData.title,

      company: jobData.company,

      location: jobData.location || "Vienna",

      source: "karriere.at",

      url: jobUrl,

      description: jobData.description,

      keyword: "karriere.at",

      notes: meta.notes.join(" | ")

    });

    if (saved) {
      newJobs++;
      const savedKey = createUniqueKeyFromUrl(jobUrl);
      if (savedKey) {
        existingKeys[savedKey] = true;
      }
    }

    Utilities.sleep(200);

  }

  Logger.log("Karriere.at már ismert URL-ek kihagyva: " + skippedExisting);
  Logger.log("Karriere.at ellenőrzött új URL-ek: " + checkedJobs);
  Logger.log("Karriere.at új állások: " + newJobs);

  return newJobs;

}



function buildKarriereSearchUrl(keyword, location) {

  return "https://www.karriere.at/jobs?keywords="
    + encodeURIComponent(keyword)
    + "&location="
    + encodeURIComponent(toKarriereLocation(location));

}



function extractKarriereJobUrls(html) {

  const urls = [];

  const regex = /href=["']([^"']*\/jobs\/[0-9][^"']*)["']/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {

    let jobUrl = ensureAbsoluteUrl(
      match[1],
      "https://www.karriere.at"
    );

    jobUrl = cleanUrl(jobUrl);

    if (
      jobUrl.indexOf("/jobs/") !== -1 &&
      urls.indexOf(jobUrl) === -1
    ) {
      urls.push(jobUrl);
    }

  }

  return urls;

}



function toKarriereLocation(location) {

  const normalized = normalizeLocation(location);

  if (normalized === "Vienna") {
    return "Wien";
  }

  if (normalized === "Remote Austria") {
    return "Österreich";
  }

  if (normalized === "Austria") {
    return "Österreich";
  }

  return normalized;

}


