# Automated business journeys

Permanent Playwright layer; existing Jest, Node and Flutter suites remain in place.

## Run

```powershell
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e:provision
pnpm test:e2e:typecheck
pnpm test:e2e:safety
pnpm test:e2e:journey
pnpm test:e2e:stop
```

The Windows provisioner uses an already installed MySQL 8.4 binary. Set E2E_MYSQLD to its path if necessary. It initializes a fresh datadir under `.e2e-local/<run>` and binds only 127.0.0.1:33307; it never controls the Windows MySQL service. Root is assigned a random password during provisioning and is never used by migrations, fixtures or journeys. The restricted account can access only `home_fashion_e2e`, without global privileges or GRANT OPTION. No DROP, TRUNCATE or reset is run. Stop checks the server UUID and owned datadir before SHUTDOWN. Data remains for inspection. Archive the old ignored configuration/runtime before provisioning a new instance; the provisioner refuses to overwrite `.env.e2e`.

Without a dedicated instance and valid `.env.e2e`, the command exits nonzero with BLOQUEADO before starting services or writing business data. The default run exercises multipart with a controlled Cloudinary response in the isolated NestJS process. Set `HF_E2E_ISOLATED_CLOUDINARY` only with the authorized configuration helper to run against a real test account. Reports distinguish the two modes. Cloudinary folders are forced to `home-fashion-e2e/<run>/{workshop-progress,deliveries}`. The source credential file is read only for the three Cloudinary settings, never its database settings. Assets remain as QA evidence in the isolated folder; this suite does not delete Cloudinary assets.

The runner validates host, schema, restricted username, server UUID, marker and SHOW GRANTS before migrations/seeding. It applies the repository's migrations and only the role/permission seed, then seeds synthetic actors and catalog. SQL writes prepare fixtures only; business transitions use UI/API. Fixture IDs are read from MySQL and business IDs from real responses/UI. Repeated runs append synthetic business records and check reservations relative to the baseline. For long-term repeated use provision fresh disposable data when stock is exhausted.

Next.js runs on 4300 and NestJS on 4301. Existing servers are refused. Both services inherit only the E2E environment for database/Cloudinary/JWT settings, with Wompi disabled, and revalidate MySQL before starting. Playwright uses one worker and zero retries. Happy paths never intercept backend responses. Recovery alone drops responses *after* the actual backend commits; replay forwards the actual backend response.

## Coverage and evidence

1. Assisted purchase: public catalog/request → ADMIN proposal/acceptance/conversion/payment/order/assignment → WORKSHOP API authentication, STARTED/PROGRESS/PNG multipart → ADMIN approval/private tracking/schedule/start/PNG delivery → anonymous tracking COMPLETED → linked SQL joins and snapshots.
2. Mixed order: IN_STOCK reservation and MADE_TO_ORDER assignment/STARTED, with derived OPEN → IN_PROGRESS verified in SQL.
3. Direct sale: ADMIN creates customer/sale/deposit/order; snapshots, balance and reservation verified in SQL.
4. Permissions: EMPLOYEE browser navigation and forbidden BFF/API; WORKSHOP ownership and finance denial; anonymous projection excludes pending/rejected reports and private fields. Independent setup uses real ADMIN business APIs.
5. Recovery: real request committed before network loss, same requestId/code on browser retry/replay, real session refresh, ambiguous deposit not automatically retried, repeated order does not duplicate reservation.

6. Operational access: permission overrides, financial fields, inventory adjustments and session revocation.

Evidence is written to `.e2e-evidence/automated-business-journeys.md` and its adjacent folder. A complete run saves six representative screenshots. Failed runs save semantic step/error traces as JSON. Raw Playwright ZIP traces, video, HAR and storageState are disabled because they persist tokens/cookies. Evidence contains synthetic data and safe identifiers only. A green web/API run does not prove Android runtime.

Configuration follows [Playwright webServer](https://playwright.dev/docs/test-webserver) and [authentication artifact precautions](https://playwright.dev/docs/auth).


## Android emulator support

With the isolated services already running (`pnpm exec tsx tests/e2e/support/service.ts api` and `... web`),
the Android config never starts or reuses services by itself; it revalidates MySQL isolation and health first:

```powershell
$env:ANDROID_JOBS = '2'; pnpm exec playwright test -c tests/e2e/android.config.ts prepare   # ASSIGNED jobs for workshop@e2e.invalid
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4301/api                              # from apps/mobile, in the emulator
pnpm exec playwright test -c tests/e2e/android.config.ts review    # ADMIN approves/rejects app reports; anonymous tracking check
```

Prepared job IDs go to the ignored `.e2e-local/android/state.json`; screenshots go to `.e2e-evidence/android/`.
An emulator run does not prove behaviour on a physical device.

## Release protection (2026-10-10)

The catalog starts with 20 physical stock units. Direct sale, mixed order and recovery
reserve one unit each; assisted purchase and permissions manufacture their items.
Preflight checks `quantity_on_hand - quantity_reserved >= 3` for the active stock variant
before starting any service/journey, inside the isolated fixture transaction. A failure
rolls that transaction back. Reservations are never manually reset.

If stock is insufficient, from the repository root, stop the dedicated server and
preserve its configuration locally before provisioning a fresh dedicated instance:

```powershell
pnpm test:e2e:stop
if ($LASTEXITCODE -ne 0) { throw 'Stop failed; do not provision' }
# Verify the local 33307 listener is gone before proceeding.
if (Get-NetTCPConnection -LocalPort 33307 -State Listen -ErrorAction SilentlyContinue) {
  throw 'E2E listener still active'
}
$hfOwner = Get-Content -LiteralPath .e2e-local/owner.json -Raw | ConvertFrom-Json
$hfRuntime = [IO.Path]::GetFullPath($hfOwner.runtime)
$hfAllowed = [IO.Path]::GetFullPath((Join-Path (Get-Location) '.e2e-local')) + [IO.Path]::DirectorySeparatorChar
if (-not $hfRuntime.StartsWith($hfAllowed, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Runtime outside repository .e2e-local'
}
if ((Test-Path -LiteralPath (Join-Path $hfRuntime 'archived.env.e2e')) -or
    (Test-Path -LiteralPath (Join-Path $hfRuntime 'archived-owner.json'))) {
  throw 'Archive already exists; choose a new local archive name'
}
Copy-Item -LiteralPath .e2e-local/owner.json -Destination (Join-Path $hfRuntime 'archived-owner.json')
Move-Item -LiteralPath .env.e2e -Destination (Join-Path $hfRuntime 'archived.env.e2e')
pnpm test:e2e:provision
```

This archives the old credential file inside the ignored runtime, keeps the datadir
and its original owner information, and lets provisioning generate a new UUID, marker,
restricted user and catalog ID. Never share this local archive. Configure only the
explicitly authorized Cloudinary account again if another run is needed. These steps
were documented, not executed during RC closure. No Aiven access or SQL cleanup.

Every new execution has a unique ID independent of the reusable catalog's E2E_RUN_ID.
Results, reports, screenshots and semantic failure traces go under
`.e2e-evidence/automated-business-journeys/runs/<execution-id>/`.
The latest-success Markdown and JSON pointers update when all six scenarios pass
with the explicitly authorized Cloudinary test account. Runs with controlled media
still save complete reports and results under their execution IDs.
Failures, partial runs and configuration blocks update `automated-business-journeys-status.json`
and their own small `status.json`; earlier run results remain available. The
[project evidence index](../../docs/PROJECT.md#pruebas-y-evidencia) links to the
public QA summary. Keep original runs and internal screenshots in private storage.
Semantic failure traces stay ignored and are excluded
from the shareable archive. No raw HTTP traces/HAR/storageState are versioned.

Directed checks, without starting services or running journeys:

```powershell
pnpm test:release
pnpm test:e2e:typecheck
pnpm test:source-package
pnpm source:package --output <new-output-path.tar.gz>
pnpm source:package --verify <new-output-path.tar.gz>
```
