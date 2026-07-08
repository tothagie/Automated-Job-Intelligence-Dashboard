# Data Model

## Overview

The automation stores all collected job postings in a centralized Google Sheets database.

Each row represents a single standardized job posting, regardless of the original source. The common structure enables filtering, reporting and future analytics without requiring source-specific processing.

---

## Data Structure

| Field | Description |
|--------|-------------|
| Job Title | Position title extracted from the source |
| Company | Hiring company |
| Location | Job location |
| Source | Origin of the job posting (e.g. Karriere.at or LinkedIn Alerts) |
| URL | Direct link to the job advertisement |
| Publication Date | Original publication date, when available |
| Collection Date | Date the automation collected the record |
| Status | Optional tracking field (e.g. New, Applied, Interview, Closed) |
| Duplicate | Indicates whether the posting has already been processed |

---

## Data Standardization

Because different sources present job information differently, all collected records are transformed into a common structure before storage.

The standardization process includes:

- consistent field mapping
- URL normalization
- whitespace cleanup
- validation of required fields
- handling of missing values

This ensures that every record follows the same format regardless of its origin.

---

## Data Quality

The workflow performs basic quality checks before storing new records.

These include:

- mandatory field validation
- duplicate detection
- standardized formatting
- consistent source identification

---

## Benefits

Using a standardized data model enables:

- faster job review
- easier filtering and searching
- consistent reporting
- scalable integration of additional job sources
- future dashboard and analytics development
