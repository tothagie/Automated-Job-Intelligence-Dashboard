/****************************************************
 * 4. LINKEDIN EMAIL ALERT MODULE
 ****************************************************/

function fetchLinkedInJobsFromEmails() {

  setupJobTracker(false);

  const queries = [
    'newer_than:14d from:linkedin.com',
    'newer_than:14d "LinkedIn Job Alert"',
    'newer_than:14d "new jobs for you"',
    'newer_than:14d "jobs matching"',
    'newer_than:14d subject:(job alert)'
  ];

  const threadMap = {};

  queries.forEach(query => {

    const threads = GmailApp.search(query, 0, 30);

    threads.forEach(thread => {
      threadMap[thread.getId()] = thread;
    });

  });

  const threads = Object.keys(threadMap).map(id => threadMap[id]);

  Logger.log("LinkedIn email threadek száma: " + threads.length);

  let newJobs = 0;

  threads.forEach(thread => {

    const messages = thread.getMessages();

    messages.forEach(message => {

      const subject = message.getSubject();
      const date = message.getDate();

      const body =
        message.getPlainBody()
        + "\n"
        + message.getBody();

      const jobs = extractLinkedInJobsFromEmailBody(body, subject);

      Logger.log(
        "LinkedIn email: "
        + subject
        + " | kinyert álláslinkek: "
        + jobs.length
      );

      jobs.forEach(job => {

        const saved = saveJob({

          title: job.title || "LinkedIn Job",

          company: job.company || "Unknown",

          location: job.location || "Austria / Remote",

          source: "LinkedIn email",

          url: job.url,

          description: job.description || "",

          keyword: "LinkedIn Job Alert",

          notes: "LinkedIn email / " + subject + " / " + date

        });

        if (saved) {
          newJobs++;
        }

      });

    });

  });

  Logger.log("LinkedIn emailből mentett új állások: " + newJobs);

  return newJobs;

}



function extractLinkedInJobsFromEmailBody(body, subject) {

  const jobs = [];

  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let anchorMatch;

  while ((anchorMatch = anchorRegex.exec(body)) !== null) {

    const rawUrl = liHtmlDecode(anchorMatch[1]);

    if (!isLinkedInJobUrl(rawUrl)) {
      continue;
    }

    const jobUrl = normalizeLinkedInJobUrl(rawUrl);

    if (!jobUrl) {
      continue;
    }

    let title = liCleanText(
      liStripHtml(
        liHtmlDecode(anchorMatch[2])
      )
    );

    if (isBadLinkedInTitle(title)) {
      title = guessLinkedInTitleNearText(body, rawUrl);
    }

    if (!title) {
      title = subject || "LinkedIn Job";
    }

    addLinkedInJobIfUnique(jobs, {
      title: title,
      company: "Unknown",
      location: guessLinkedInLocationFromText(body) || "Austria / Remote",
      url: jobUrl,
      description: subject || ""
    });

  }

  const plainUrlRegex = /https?:\/\/[^\s"'<>]+/gi;

  let urlMatch;

  while ((urlMatch = plainUrlRegex.exec(body)) !== null) {

    const rawUrl = liHtmlDecode(urlMatch[0]);

    if (!isLinkedInJobUrl(rawUrl)) {
      continue;
    }

    const jobUrl = normalizeLinkedInJobUrl(rawUrl);

    if (!jobUrl) {
      continue;
    }

    const title =
      guessLinkedInTitleNearText(body, rawUrl)
      || subject
      || "LinkedIn Job";

    addLinkedInJobIfUnique(jobs, {
      title: title,
      company: "Unknown",
      location: guessLinkedInLocationFromText(body) || "Austria / Remote",
      url: jobUrl,
      description: subject || ""
    });

  }

  return jobs;

}



function addLinkedInJobIfUnique(jobs, job) {

  const exists = jobs.some(existingJob => {
    return existingJob.url === job.url;
  });

  if (!exists) {
    jobs.push(job);
  }

}



function isLinkedInJobUrl(url) {

  if (!url) {
    return false;
  }

  const decoded = liHtmlDecode(String(url));

  return (
    /linkedin\.com\/(?:comm\/)?jobs\/view\/\d+/i.test(decoded) ||
    /[?&](currentJobId|jobId|jobPostingId)=\d+/i.test(decoded)
  );

}



function normalizeLinkedInJobUrl(rawUrl) {

  if (!rawUrl) {
    return "";
  }

  let url = liHtmlDecode(String(rawUrl))
    .replace(/&amp;/g, "&")
    .trim();

  if (url.indexOf("url=") !== -1) {

    const match = url.match(/[?&]url=([^&]+)/i);

    if (match && match[1]) {

      try {
        url = decodeURIComponent(match[1]);
      } catch (error) {
        // Ha nem dekódolható, marad az eredeti URL.
      }

    }

  }

  let idMatch = url.match(/\/(?:comm\/)?jobs\/view\/(\d+)/i);

  if (!idMatch) {
    idMatch = url.match(/[?&](?:currentJobId|jobId|jobPostingId)=([0-9]+)/i);
  }

  if (idMatch && idMatch[1]) {
    return "https://www.linkedin.com/jobs/view/" + idMatch[1];
  }

  if (url.indexOf("linkedin.com") !== -1 && url.indexOf("/jobs/") !== -1) {
    return url.split("?")[0].split("#")[0];
  }

  return "";

}



function guessLinkedInTitleNearText(body, rawUrl) {

  const index = body.indexOf(rawUrl);

  if (index === -1) {
    return "";
  }

  const start = Math.max(0, index - 500);
  const end = Math.min(body.length, index + 200);

  const snippet = liStripHtml(
    body.substring(start, end)
  );

  const lines = snippet
    .split(/\n|\r| {2,}/)
    .map(line => liCleanText(line))
    .filter(line => line.length > 3)
    .filter(line => line.length < 120);

  for (let i = lines.length - 1; i >= 0; i--) {

    const line = lines[i];

    if (!isBadLinkedInTitle(line)) {
      return line;
    }

  }

  return "";

}



function guessLinkedInLocationFromText(body) {

  const text = liCleanText(
    liStripHtml(body)
  );

  if (/vienna|wien/i.test(text)) {
    return "Vienna";
  }

  if (/remote/i.test(text)) {
    return "Remote";
  }

  if (/austria|österreich/i.test(text)) {
    return "Austria";
  }

  return "";

}



function isBadLinkedInTitle(title) {

  if (!title) {
    return true;
  }

  const cleaned = liCleanText(title);

  if (cleaned.length < 4) {
    return true;
  }

  const badPatterns = [
    /view job/i,
    /apply/i,
    /see job/i,
    /show more/i,
    /unsubscribe/i,
    /manage alert/i,
    /linkedin/i,
    /privacy/i,
    /terms/i,
    /job alert/i,
    /jobs for you/i,
    /recommended/i,
    /notification/i,
    /email/i
  ];

  return badPatterns.some(pattern => pattern.test(cleaned));

}


