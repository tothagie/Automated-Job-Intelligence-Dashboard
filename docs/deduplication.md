# Deduplication Logic

## Overview

Duplicate prevention is a critical part of the job intelligence workflow because the same vacancy can appear multiple times during data collection.

A job opportunity may be received from different sources, appear in multiple LinkedIn notifications, or be collected again during scheduled executions.

The deduplication process ensures that the database contains unique job records and avoids unnecessary manual review.

---

## Objective

The objective of the deduplication logic is to:

- prevent duplicate job entries
- maintain a clean and reliable dataset
- reduce repeated processing
- improve the quality of job market analysis

---

## UniqueKey Concept

Each job record contains a `UniqueKey` field that is used to identify whether a vacancy has already been collected.

The UniqueKey is generated from a combination of relevant job attributes.

Current logic is based on:

- Company
- Position
- Location
- URL information (when available)

The generated identifier represents the uniqueness of the job opportunity.

---

## Deduplication Process

The duplicate detection workflow follows these steps:

```
New Job Record
       │
       ▼
Generate UniqueKey
       │
       ▼
Compare with Existing Records
       │
       ▼
Duplicate Found?
       │
 ┌─────┴─────┐
 │           │
Yes          No
 │            │
 ▼            ▼
Skip       Add New Record
Record
```

---

## Data Quality Benefits

The deduplication process improves data quality by:

- maintaining one record per job opportunity
- preventing database inflation
- ensuring more accurate job counts
- reducing manual review effort

---

## Future Improvements

The current rule-based approach can be extended with more advanced matching methods, such as:

- fuzzy matching of company and position names
- similarity-based description comparison
- AI-assisted duplicate detection
- confidence scoring for uncertain matches
