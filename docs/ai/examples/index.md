# AI04 execution examples

These files are reproducible request/response examples for the IARTI report.
Bodies and response envelopes follow the current backend controllers and
OpenAPI contract. Values marked `representative` are fixtures for explaining
the contract and must not be presented as a fresh runtime capture.

| File | Scenario | Status |
|---|---|---:|
| [bom-valid.http](bom-valid.http) | AI01 valid BOM calculation | 201 |
| [planning-valid.http](planning-valid.http) | AI02 valid requirements planning | 201 |
| [bom-invalid-400.http](bom-invalid-400.http) | Missing orders | 400 |
| [planning-invalid-422-missing-stock-units.http](planning-invalid-422-missing-stock-units.http) | Missing `stockUnitsPerSale` | 422 |
| [planning-invalid-422-inactive.http](planning-invalid-422-inactive.http) | Inactive forecast product | 422 |
| [planning-invalid-422-missing-size-config.http](planning-invalid-422-missing-size-config.http) | Missing component size configuration | 422 |
| [planning-missing-offer.http](planning-missing-offer.http) | Confirmed scenario without an offer | 201 |
| [planning-404-forecast.http](planning-404-forecast.http) | Unknown forecast | 404 |
| [planning-409-unconfirmed.http](planning-409-unconfirmed.http) | Unconfirmed scenario | 409 |
| [planning-502-prolog-down.http](planning-502-prolog-down.http) | Prolog unavailable | 502 |

Before using a file as an evidence capture, run it against the current seeded
environment and preserve the returned body and timestamp in the submission
evidence. The examples deliberately do not contain credentials or customer
data.
