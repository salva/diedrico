# Sources for Reconstructing Historical Data About Current IBEX 35 Stocks

## Goal

The goal is to collect historical information about the **stocks currently included in the IBEX 35**, but not the history of the IBEX 35 index itself.

The target dataset is therefore a **stock/security history dataset**, not an index-constituent dataset.

For each selected stock, we want to reconstruct as much as possible of:

- current ticker and ISIN
- issuer name
- security/instrument name
- historical ticker changes
- historical name changes
- admission/listing date
- delisting or active status
- market, segment and trading venue
- corporate actions affecting security identity or continuity
- daily price history
- dividends, splits and adjustment factors where available
- source/provenance for every field

The IBEX 35 is only useful as a way to define the initial universe: “the stocks currently in the IBEX 35”.

---

## 1. BME current IBEX 35 constituents

**URL**

https://www.bolsasymercados.es/en/bme-exchange/indices/ibex/constituents.html

Alternative official index detail page:

https://www.bolsasymercados.es/en/bme-exchange/indices/detail.ibex-35-es0si0000005.html

### What you can expect to obtain

This is the best official free starting point for the current universe.

Expected fields:

- current IBEX 35 constituents
- current BME ticker / symbol
- current company name
- current ISIN
- index weight or index-related data, depending on the page layout

### How to use it

Use this only to create the initial seed table:

```text
asof_date
current_ticker
current_isin
current_name
source_url
retrieved_at
```

After this step, the IBEX itself should be ignored if the goal is stock history rather than index history.

### Limitations

- It gives current constituents, not full stock history.
- It does not provide complete admission, delisting, ticker-history or corporate-action history.
- It is not a historical security master.

---

## 2. BME listed companies

**URL**

https://www.bolsasymercados.es/en/bme-exchange/prices-and-markets/shares/listed-companies.html

### What you can expect to obtain

This is useful for current official information about companies listed on the Spanish stock exchange.

Expected fields may include:

- current company name
- ticker
- sector
- market
- index membership
- links to individual company/security pages

### How to use it

Use it to enrich the current IBEX 35 seed with current exchange metadata:

```text
current_ticker
current_name
sector
market
indices
company_page_url
source_url
retrieved_at
```

### Limitations

- Mostly current-state information.
- Not a full historical ticker/name/security master.
- Does not reliably provide complete 2006–2025 listing lifecycle history.

---

## 3. BME Market Data Services

**URL**

https://www.bolsasymercados.es/en/bme-exchange/prices-and-markets/market-data-services.html

### What you can expect to obtain

This is the official BME route for complete market data products.

BME describes its market data services as covering information from regulated markets and multilateral trading facilities, including products for BME-listed financial instruments through real-time, end-of-day and historical products.

Potentially relevant datasets:

- securities master
- listed instruments
- price and volume data
- relevant facts
- historical information
- corporate-action-related data
- session data

### How to use it

This is the route to investigate if the free sources are not enough and you need a reliable, rights-cleared dataset.

Ask BME/SIX specifically for:

```text
Historical Spanish equity security master for selected current IBEX 35 stocks
Historical ticker/code changes
Historical instrument-name changes
Admissions and exclusions
Market/segment history
Corporate actions affecting identity
Daily prices and volumes
Data dictionary
License terms for internal research caching
```

### Limitations

- Likely requires subscription or commercial agreement.
- This is not the free route, but it is probably the cleanest official route for a complete dataset.

---

## 4. BME End-of-Day and Historical Services

**URL**

https://www.bolsasymercados.es/en/bme-exchange/prices-and-markets/market-data-services/end-of-day-and-historical-services.html

### What you can expect to obtain

This is one of the most relevant official BME pages for the desired dataset.

BME states that its historical services include files with financial instruments admitted to trading in BME trading centers. It also mentions references from:

- Securities Masters
- FIRDS Regulatory Files
- Relevant Facts
- Closing Prices
- Tick Data
- End-of-Day Indices
- E-Data Services
- Analytical Data

### How to use it

This is the right product family for:

```text
security master
historical admitted instruments
listing/admission information
instrument reference data
relevant facts
historical prices
```

If requesting data from BME/SIX, this page is one of the main references to cite.

### Limitations

- Access to the actual files is likely commercial.
- Public pages describe the products but do not expose the complete historical dataset directly.

---

## 5. BME End-of-Day product documentation / e-Data Services

**URL**

https://www.bolsasymercados.es/en/bme-exchange/prices-and-markets/market-data-services/documentation/end-of-day-products.html

### What you can expect to obtain

This page documents end-of-day products and mentions subscription access to data such as:

- prices and volumes
- Master of Securities
- Relevant Facts
- statistics
- indices and publications
- historical information
- session data

### How to use it

This source is important because it explicitly points to the **Master of Securities**, which is the type of dataset needed to solve ticker/history/security-master problems.

Use it when formulating a data request such as:

```text
We need the Master of Securities and historical information for the current IBEX 35 stocks, including ticker history, admission/exclusion dates, instrument modifications and data dictionary.
```

### Limitations

- Mostly documentation.
- Actual access appears to require subscription.

---

## 6. BME admissions / new listings

**URL**

https://www.bolsasymercados.es/en/bme-exchange/prices-and-markets/shares/corporate-actions/new-listings.html

### What you can expect to obtain

This source can provide official information about recent admissions/new listings.

Expected data:

- company/security admitted to trading
- date
- market or segment
- possibly ISIN or ticker, depending on the page
- related corporate-action context

### How to use it

Use this for recent events and for validating specific admission dates.

Useful table:

```text
ticker
isin
company_name
admission_date
market
source_url
retrieved_at
```

### Limitations

- The public page is not a complete historical archive.
- For older historical data, BME points users toward Market Data services.

---

## 7. BME delistings / exclusions

**URL**

https://www.bolsasymercados.es/en/bme-exchange/prices-and-markets/shares/corporate-actions/delistings.html

### What you can expect to obtain

This source can provide official recent delisting or exclusion events.

Expected data:

- company/security excluded or delisted
- date
- ISIN or ticker, if available
- market or segment
- possible reason or reference

### How to use it

Use this to validate whether a current or predecessor security was delisted, excluded, merged or replaced.

Useful table:

```text
ticker
isin
company_name
exclusion_date
reason_or_note
source_url
retrieved_at
```

### Limitations

- Public online coverage is limited.
- Historical exclusions usually require BME Market Data.

---

## 8. BME historical IBEX 35 constituents PDF

**URL**

https://www.bolsasymercados.es/dam/descargas/indices/composicion-ibex-35-es-en.pdf

### What you can expect to obtain

This document provides historical IBEX 35 index entry/exit events.

Expected fields:

- review number
- effective date
- additions to the IBEX 35
- deletions from the IBEX 35

### How to use it

Use it only if you want to know whether one of the selected stocks entered or left the IBEX 35 at some point.

It can be useful as secondary context:

```text
stock was included in IBEX 35 from date X
stock was removed from IBEX 35 on date Y
```

### Limitations

This document is **not** a stock-exchange security master.

It does not provide:

- full listing history
- admission dates
- delisting dates
- full ticker history
- full name history
- ISIN history
- corporate-action continuity
- price history

For the current project, this source is optional and secondary.

---

## 9. CNMV ISIN search

**URL**

https://www.cnmv.es/portal/ancv/consultaisin?lang=en

### What you can expect to obtain

The CNMV ISIN search provides official information about securities ISIN codes allocated by the Spanish National Numbering Agency and some securities from other NNAs traded on Spanish regulated markets.

Expected fields may include:

- ISIN
- issuer/security name
- FISN
- number of securities
- issue date
- nominal value
- currency
- CFI code

### How to use it

Use CNMV ISIN search to validate the identity of each security.

Useful table:

```text
isin
issuer_or_security_name
fisn
cfi
currency
nominal_value
issue_date
source_url
retrieved_at
```

### Limitations

- It is a lookup/reference source, not a full historical stock-exchange membership dataset.
- It does not necessarily provide ticker history.
- It does not reconstruct market admission/exclusion intervals.

---

## 10. CNMV companies search / official registers

**URL**

https://www.cnmv.es/portal/consultas/busquedaporentidad?lang=en

### What you can expect to obtain

The CNMV companies search allows searching official records for information filed about a company.

Expected information may include:

- registered issuer/company information
- filings
- prospectuses
- financial reports
- regulatory documents
- links to relevant information

### How to use it

Use this for company-level validation and for finding official documents around:

- IPOs
- mergers
- takeovers
- name changes
- major corporate actions
- changes in share capital
- delistings
- prospectuses

Useful table:

```text
company_name
cnmv_entity_url
document_type
document_date
document_title
source_url
retrieved_at
```

### Limitations

- Requires per-company search.
- Data is document-oriented, not a ready-made normalized table.
- Extraction may be manual or semi-automated.

---

## 11. CNMV inside information / other relevant information

**URL**

https://www.cnmv.es/portal/otra-informacion-relevante/consulta-oir?lang=en

### What you can expect to obtain

This source provides access to inside information, other relevant information and related disclosures.

Expected information:

- corporate announcements
- relevant facts
- mergers and acquisitions
- takeover-related notices
- capital increases
- share buybacks
- name changes or restructurings
- delisting-related announcements

### How to use it

Use this to reconstruct event history for each stock.

Useful event table:

```text
company_name
isin
event_date
publication_date
event_type
document_title
document_url
notes
source
```

### Limitations

- It is not a clean security master.
- Requires search and classification.
- Some older records may require careful manual handling.

---

## 12. ESMA FIRDS

**URL**

https://registers.esma.europa.eu/publication/searchRegister?core=esma_registers_firds

ESMA databases and registers:

https://www.esma.europa.eu/publications-and-data/databases-and-registers

### What you can expect to obtain

FIRDS contains financial instrument reference data submitted under MiFID II / MiFIR.

Expected fields may include:

- ISIN
- instrument name
- CFI
- FISN
- trading venue
- MIC
- issuer-related identifiers where available
- instrument classification
- validity/reference information

### How to use it

Use ESMA FIRDS to validate post-2018 instrument reference data.

Useful table:

```text
isin
instrument_name
cfi
fisn
trading_venue
mic
validity_or_publication_date
source_file
retrieved_at
```

### Limitations

- Mainly useful from the MiFID II period onward.
- Does not cover the full 2006–2025 history.
- Does not directly provide IBEX membership or full ticker history.
- It may not contain the exact BME ticker-history fields needed for backtesting.

---

## 13. Company investor-relations websites

**URL**

Use the investor-relations site of each company.

Examples:

```text
https://www.santander.com/en/shareholders-and-investors
https://www.bbva.com/en/economy-and-finance/
https://www.inditex.com/itxcomweb/en/investors
https://www.iberdrola.com/shareholders-investors
```

### What you can expect to obtain

Company IR pages are often useful for historical narrative and corporate actions.

Expected information:

- IPO or listing history
- old company names
- mergers and acquisitions
- spin-offs
- share capital history
- dividend history
- stock split history
- annual reports
- shareholder documentation
- ticker and ISIN references
- exchange listings

### How to use it

Use IR pages to fill gaps and validate events from BME/CNMV.

Useful table:

```text
company_name
event_date
event_type
description
document_url
source_type
retrieved_at
```

### Limitations

- Not standardized.
- Coverage differs by company.
- May present corporate history rather than security-level history.
- Not always suitable as a canonical source for ticker-validity intervals.

---

## 14. Free daily price sources

### Stooq

**URL**

https://stooq.com/

### Yahoo Finance

**URL**

https://finance.yahoo.com/

### Investing.com

**URL**

https://www.investing.com/

### MarketScreener

**URL**

https://www.marketscreener.com/

### What you can expect to obtain

These sources may provide:

- daily open, high, low, close
- adjusted close, depending on provider
- volume
- dividend information, depending on provider
- split information, depending on provider
- historical chart data

### How to use them

Use them as practical free sources for historical price data.

Possible table:

```text
ticker
date
open
high
low
close
adjusted_close
volume
source
retrieved_at
```

### Limitations

- Not official security-master sources.
- Ticker mappings can be fragile.
- Delisted or renamed securities may be difficult to retrieve.
- Adjusted prices may differ between providers.
- Usage rights may restrict bulk downloading, caching or redistribution.
- They should not be treated as canonical for ticker-history or listing-history fields.

---

## 15. Paid/commercial alternatives

If the free route is not enough, the most relevant commercial sources are:

### BME/SIX Market Data

Best source for official Spanish exchange data.

Expected coverage:

- securities master
- historical admitted instruments
- admissions
- exclusions
- modifications
- relevant facts
- prices and volumes
- possibly corporate-action data

### LSEG / Refinitiv

Useful for:

- RIC mappings
- historical prices
- security reference data
- corporate actions
- identifier mapping

### Bloomberg

Useful for:

- ticker history
- corporate actions
- historical prices
- security identifiers
- delisted securities, depending on license

### FactSet

Useful for:

- security master
- corporate actions
- historical prices
- entity/security mapping

### Limitation

These sources are usually paid, and the license terms must be checked carefully if the goal includes internal caching, derived datasets or downstream QA artifacts.

---

## Recommended reconstruction workflow

### Step 1: Build the current stock universe

Source:

- BME current IBEX 35 constituents

Output:

```text
current_ticker
current_isin
current_name
asof_date
source_url
retrieved_at
```

### Step 2: Enrich current identity

Sources:

- BME listed companies
- CNMV ISIN search
- ESMA FIRDS

Output:

```text
current_ticker
isin
issuer_name
instrument_name
sector
market
segment
mic
cfi
fisn
source_url
retrieved_at
```

### Step 3: Reconstruct stock/security history

Sources:

- BME admissions/new listings
- BME delistings/exclusions
- CNMV company filings
- CNMV inside information / other relevant information
- company investor-relations pages

Output:

```text
security_id
isin
event_date
event_type
old_value
new_value
description
source_url
confidence
retrieved_at
```

### Step 4: Reconstruct ticker and name history

Sources:

- BME Market Data, if available
- CNMV filings
- company annual reports
- company IR pages
- public financial portals for cross-checking

Output:

```text
security_id
isin
ticker
valid_from
valid_to
source_url
confidence
```

And:

```text
security_id
isin
name
valid_from
valid_to
source_url
confidence
```

### Step 5: Collect price history

Sources:

- Stooq
- Yahoo Finance
- Investing.com
- MarketScreener
- BME historical prices, if accessible

Output:

```text
security_id
ticker_as_used_by_vendor
date
open
high
low
close
adjusted_close
volume
source
retrieved_at
```

### Step 6: Keep provenance per field

Because the free route is reconstructed, every fact should have its own provenance.

Recommended provenance fields:

```text
field_name
field_value
source_name
source_url
retrieved_at
source_type
confidence
notes
```

Suggested `source_type` values:

```text
official_exchange_public
official_regulator_public
official_company_public
public_vendor
commercial_vendor
manual_reconstruction
```

Suggested `confidence` values:

```text
high
medium
low
requires_validation
```

---

## Expected quality of the free dataset

### Good free coverage

You can usually get:

- current ticker
- current ISIN
- current issuer/security name
- current market/sector
- basic company history
- many major corporate actions
- daily price history for currently listed stocks

### Partial free coverage

You may be able to reconstruct:

- old names
- old tickers
- IPO/listing dates
- mergers and spin-offs
- historical ISIN changes
- dividend and split history

### Weak free coverage

These are hard to obtain completely without paid data:

- exact ticker validity intervals
- complete historical BME security master
- all instrument modifications
- full admission/exclusion history back to 2006
- clean delisted/predecessor security mapping
- official adjustment factors
- rights-cleared bulk internal cache

---

## Recommended final data model

### `stock_seed`

```text
stock_id
asof_date
current_ticker
current_isin
current_name
source_url
retrieved_at
```

### `security_identity`

```text
stock_id
isin
issuer_name
instrument_name
cfi
fisn
currency
source_url
retrieved_at
```

### `listing_history`

```text
stock_id
isin
market
segment
mic
admission_date
exclusion_date
active_status
source_url
confidence
```

### `ticker_history`

```text
stock_id
isin
ticker
valid_from
valid_to
market
source_url
confidence
```

### `name_history`

```text
stock_id
isin
name
valid_from
valid_to
source_url
confidence
```

### `corporate_action_history`

```text
stock_id
isin
event_date
publication_date
event_type
description
old_value
new_value
source_url
confidence
```

### `price_history`

```text
stock_id
vendor
vendor_ticker
date
open
high
low
close
adjusted_close
volume
source_url
retrieved_at
```

### `source_provenance`

```text
source_id
source_name
source_url
source_type
retrieved_at
license_notes
usage_restrictions
checksum
```

---

## Summary

For a no-cost or low-cost reconstruction, use:

1. **BME current IBEX 35 constituents** to define the universe.
2. **BME listed companies** for current exchange metadata.
3. **CNMV ISIN search** for official ISIN/security validation.
4. **CNMV company records and relevant information** for corporate events.
5. **ESMA FIRDS** for post-2018 reference data.
6. **Company investor-relations pages** for IPOs, mergers, name changes and corporate history.
7. **Stooq/Yahoo/Investing/MarketScreener** for practical daily price history.
8. **BME Market Data / Master of Securities** if complete official history is required.

The free route can produce a useful research dataset, but it should be marked as **reconstructed from public sources**. For a complete and rights-cleared historical security master, the likely source is **BME/SIX Market Data**, not the public IBEX pages.
