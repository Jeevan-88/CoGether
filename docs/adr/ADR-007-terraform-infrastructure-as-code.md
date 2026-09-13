# ADR-007: Terraform Infrastructure as Code

## Status
Accepted

## Context
Manual cloud infrastructure provisioning results in configuration drift, non-reproducible environments, and elevated operational risk during disaster recovery.

## Decision
Adopt **Terraform (v1.6+)** with a modular structure:
- Root modules under `infra/terraform/modules/` (`vpc`, `kubernetes`, `database`, `cache`, `eventstream`, `storage`).
- Environment stacks under `infra/terraform/environments/` (`dev`, `staging`, `prod`).
- Remote state stored in encrypted cloud object storage with DynamoDB/state locking.

## Consequences
- **Positive**: 100% reproducible environments; automated drift detection; auditability of cloud infrastructure changes.
- **Negative**: Requires strict discipline around state file management and credential provisioning.
