# Solution Architecture

## Overview

The AI Job Market Intelligence Automation project was designed to automate the repetitive process of monitoring job opportunities from multiple recruitment sources.

Instead of manually checking job portals and reviewing email notifications, the solution collects job postings, standardizes the information, removes duplicates and stores the results in a centralized dataset.

The current implementation integrates:

- Karriere.at job search results
- LinkedIn Job Alert emails

The architecture has been designed to allow additional job sources to be integrated with minimal changes.

---

## Architecture

```
                Karriere.at
                      │
                      │
      LinkedIn Job Alert Emails
                      │
                      ▼
            Google Apps Script
                      │
        Data Collection & Parsing
                      │
                      ▼
         Data Standardization
                      │
                      ▼
          Duplicate Detection
                      │
                      ▼
          Google Sheets Database
                      │
                      ▼
            Daily Updated Dataset
```

---

## Components

### Data Sources

The system currently retrieves job information from:

- Karriere.at search results
- LinkedIn Job Alert email notifications

Each source provides job postings in a different format, requiring separate parsing logic before the data can be processed uniformly.

---

### Processing Layer

Google Apps Script acts as the orchestration layer.

Its responsibilities include:

- retrieving new job postings
- extracting relevant fields
- normalizing the data structure
- detecting duplicate records
- writing new entries into the central database

---

### Storage Layer

Google Sheets serves as the project's central data repository.

Each row represents a single job posting with standardized fields, making the dataset suitable for filtering, reporting and future analytics.

---

## Scalability

The solution follows a modular design.

Additional job portals can be integrated by implementing a new data collection module without redesigning the overall workflow.

Future extensions may include:

- additional recruitment platforms
- salary extraction
- AI-powered relevance scoring
- Power BI dashboards
- automated email summaries
