# Data Model

## Overview

The automation stores collected job opportunities in a centralized Google Sheets database.

Each row represents a single job posting collected from an external source. The data model combines operational tracking fields, source information and technical attributes required for data quality management and duplicate prevention.

The standardized structure allows efficient filtering, monitoring and future analysis of job market data.

---

## Data Structure

| Field | Description |
|--------|-------------|
| JobID | Unique identifier assigned to each job record |
| Date Found | Date when the job opportunity was collected by the automation |
| Company | Name of the hiring company |
| Position | Job title or position name |
| Location | Job location information |
| Source | Origin of the job posting (e.g. Karriere.at, LinkedIn Job Alerts) |
| URL | Direct link to the original job advertisement |
| Description | Job description or extracted summary information |
| Score | Optional relevance score used for prioritization |
| Status | Tracking status of the opportunity (e.g. New, Applied, Interview, Rejected) |
| Notes | Additional comments or personal tracking information |
| UniqueKey | Technical identifier used for duplicate detection |

---

## Data Flow

The data model is designed to support the complete lifecycle of a job opportunity:

1. A new vacancy is collected from a source.
2. Relevant information is extracted and mapped into the standardized structure.
3. A unique identifier is generated for duplicate checking.
4. The record is stored in the central database.
5. The opportunity can be reviewed and tracked through its status.

---

## Data Standardization

Since different sources provide job information in different formats, the collected data is transformed into a consistent structure.

Standardization activities include:

- mapping source-specific fields into common attributes
- cleaning text fields
- normalizing URLs
- validating required information
- generating unique identifiers

---

## Data Quality Management

The data model supports basic data quality controls:

- prevention of duplicate job records
- consistent source tracking
- structured storage of job information
- traceability of collected opportunities

---

## Future Analytics Potential

The structured dataset provides a foundation for future enhancements, including:

- job market trend analysis
- company activity tracking
- skill demand analysis
- application funnel reporting
- dashboard visualization
