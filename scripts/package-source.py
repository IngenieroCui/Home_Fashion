"""Fail-closed, dependency-free source exporter. Never follows links or reads runtimes.
Usage: python scripts/package-source.py --output <new.tar.gz>
       python scripts/package-source.py --verify <archive.tar.gz>
       Append --commit HEAD to package or verify committed bytes.
"""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DENIED_DIRS = set('node_modules .git .next .next-e2e .vercel dist build out coverage .pnpm-store .e2e-local .e2e-results certs .cache .turbo cache caches __pycache__ .dart_tool .dart-appdata .gradle .idea .vscode .tmp tmp temp work outputs logs sessions secrets credentials private datadir mysql playwright-report test-results'.split())
# Application database SOURCE (apps/api/src/database) is allowed; local DB files are not.
SOURCE_DIRS = {'apps', 'packages', 'scripts', 'tests', 'docs'}
SOURCE_TYPES = set('.ts .tsx .js .jsx .mjs .cjs .json .yaml .yml .md .mmd .dbml .py .ps1 .sh .bat .cmd .dart .java .kt .xml .gradle .kts .properties .lock .toml .css .scss .html .svg .png .jpg .jpeg .webp .ico .ttf .woff .woff2 .pdf .csv .txt .sql .h .c .cpp .cmake .xcconfig .pbxproj .plist .storyboard .xcscheme .xcworkspacedata .xib .entitlements'.split())
CODE_TYPES = set('.ts .tsx .js .jsx .mjs .cjs .py .ps1 .sh .bat .cmd .dart .java .kt .h .c .cpp'.split())
ROOT_FILES = {'.editorconfig', '.gitignore', '.npmrc', '.vercelignore', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'}
REVIEWED_NAMES = {'apps/web/src/app/tokens.css', 'docs/thesis/evidence/automated-business-journeys/permissions-session-06-permiso-denegado.png'}
SPECIAL_FILES = {'Dockerfile', 'CMakeLists.txt', 'Podfile', 'gradlew', '.gitignore', '.metadata', '.prettierrc', '.prettierignore', '.eslintrc', '.npmrc'}
SECRET_NAME = re.compile(r'(?:^|[._-])(?:owner|credential[s]?|secret[s]?|token[s]?|cookie[s]?|session[s]?|storage[-_]?state|auth[-_]?state|http[-_]?trace|network[-_]?console|failure[-_]?trace|dump|backup)(?:[._-]|$)', re.I)
FORBIDDEN_SUFFIX = set('.pem .key .crt .cer .p12 .pfx .jks .keystore .db .sqlite .sqlite3 .sql .ibd .ibdata .sdi .myd .myi .frm .cnf .har .log .tmp .bak .zip .gz .tar .7z .rar .apk .aab .tsbuildinfo .pyc'.split())
PRIVATE_KEY = re.compile(rb'-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----')
JWT = re.compile(rb'eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}')
URL_CREDENTIAL = re.compile(rb'(?:mysql|postgres(?:ql)?|https?)://[^\s/:@]+:[^\s/@]+@')

def allowed(name):
    p = PurePosixPath(name)
    parts = p.parts
    if not parts or p.is_absolute() or '..' in parts or '\\' in name or ':' in name:
        return False
    if any(part.lower() in DENIED_DIRS for part in parts[:-1]):
        return False
    base = p.name
    example = base.endswith('.example')
    if base.startswith('.env') and not example:
        return False
    if p.suffix.lower() in FORBIDDEN_SUFFIX or (SECRET_NAME.search(base) and not example and name not in REVIEWED_NAMES and p.suffix.lower() not in CODE_TYPES):
        return False
    if base in {'local.properties', '.flutter-plugins', '.flutter-plugins-dependencies', '.packages'}:
        return False
    if len(parts) == 1:
        return base in ROOT_FILES or example or p.suffix.lower() == '.md'
    if parts[0] not in SOURCE_DIRS:
        return False
    if parts[0] == 'docs':
        # Binary evidence needs an explicit reviewed directory. JSON/CSV reports are
        # enumerated so future arbitrary exports never enter a source archive.
        if parts[:5] == ('docs', 'thesis', 'evidence', 'automated-business-journeys', 'runs'):
            return False
        if p.suffix.lower() in {'.md', '.mmd', '.dbml'}:
            return True
        if parts[:3] == ('docs', 'diagrams', 'export'):
            return p.suffix.lower() in {'.svg', '.pdf'}
        if parts[:4] == ('docs', 'thesis', 'evidence', 'qa-2-screenshots'):
            return p.suffix.lower() == '.png'
        if parts[:4] == ('docs', 'thesis', 'evidence', 'automated-business-journeys'):
            return p.suffix.lower() == '.png' or base in {'results.json', 'validation.json', 'status.json'}
        return '/'.join(parts[:3]) == 'docs/thesis/evidence' and base in {
            'qa-2-summary.json', 'qa-2-validation.json', 'qa-2-scenarios.json', 'qa-2-scenarios.csv',
            'qa-2-cleanup.json', 'qa-2-android-environment.json',
            'automated-business-journeys-last-success.json',
            'release-validation-2026-10-10.json'}
    return example or p.suffix.lower() in SOURCE_TYPES or base in SPECIAL_FILES or name == 'apps/mobile/android/gradle/wrapper/gradle-wrapper.jar'

def local_secrets(root):
    """Read only known credential files to detect accidental copies; never print values."""
    values = set()
    for path in [root / '.env', root / '.env.e2e', root / 'apps/api/.env.local', root / 'apps/web/.env.local']:
        if path.is_file():
            for line in path.read_text(encoding='utf-8-sig').splitlines():
                match = re.match(r'\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$', line)
                if match and re.search(r'PASSWORD|SECRET|TOKEN|API_KEY|MARKER|CA_BASE64', match[1]):
                    value = match[2].strip('"\'')
                    if len(value) >= 8 and not re.match(r'change_me|replace_|generate-', value):
                        values.add(value.encode())
    owner = root / '.e2e-local/owner.json'
    if owner.is_file():
        value = json.loads(owner.read_text(encoding='utf-8')).get('password', '')
        if len(value) >= 8:
            values.add(value.encode())
    return values

def check_content(name, data, secrets=()):
    if PRIVATE_KEY.search(data) or JWT.search(data) or URL_CREDENTIAL.search(data) or any(value in data for value in secrets):
        raise ValueError('Secret material detected in file (content withheld): ' + name)
    if name.endswith('.example'):
        for line in data.decode('utf-8-sig').splitlines():
            match = re.match(r'\s*([A-Z_]*(?:PASSWORD|SECRET|TOKEN|API_KEY|CA_BASE64))\s*=\s*(.*?)\s*$', line)
            if match:
                value = match[2].strip('"\'')
                if value and not re.match(r'^(?:change_me|replace[_-]|generate[_-]|<[^>]+>|\$\{)', value):
                    raise ValueError('Non-placeholder credential in example (content withheld): ' + name)

def selected_files(root):
    for current, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d.lower() not in DENIED_DIRS and not (Path(current) / d).is_symlink() and not (Path(current) / d).is_junction())
        for base in sorted(files):
            path = Path(current) / base
            if path.is_symlink() or path.is_junction():
                continue
            name = path.relative_to(root).as_posix()
            if allowed(name):
                yield name, path

def committed_files(root, revision):
    commit = subprocess.check_output(
        ['git', 'rev-parse', '--verify', '--end-of-options', revision + '^{commit}'], cwd=root
    ).decode('ascii').strip()
    contents = subprocess.check_output(['git', 'archive', '--format=tar', commit], cwd=root)
    files = {}
    with tarfile.open(fileobj=io.BytesIO(contents)) as source:
        for member in source:
            if member.isfile() and allowed(member.name):
                files[member.name] = (member.mode, source.extractfile(member).read())
    return commit, files


def verify(archive, root=ROOT, expected=None):
    secrets = local_secrets(root)
    entries = []
    with tarfile.open(archive, 'r:gz') as tar:
        for member in tar:
            prefix = 'home-fashion/'
            name = member.name.removeprefix(prefix)
            if not member.name.startswith(prefix) or not member.isfile() or not allowed(name) or name in entries:
                raise ValueError('Unsafe archive member: ' + member.name)
            data = tar.extractfile(member).read()
            check_content(name, data, secrets)
            if expected is not None and (name not in expected or data != expected[name][1]):
                raise ValueError('Archive differs from the Git commit: ' + name)
            entries.append(name)
    if not entries or 'package.json' not in entries:
        raise ValueError('Incomplete source archive')
    if expected is not None and set(entries) != expected.keys():
        raise ValueError('Archive is missing allowlisted committed files')
    return entries


def package(root, output, revision=None):
    output = Path(output).resolve()
    if output.exists():
        raise ValueError('Refusing to overwrite existing archive: ' + str(output))
    output.parent.mkdir(parents=True, exist_ok=True)
    secrets = local_secrets(root)
    if revision is None:
        commit = None
        files = {name: (path.stat().st_mode, path.read_bytes()) for name, path in selected_files(root)}
    else:
        commit, files = committed_files(root, revision)
    # Check ALL content before creating an archive, so failed scans publish nothing.
    for name, (_, data) in files.items():
        check_content(name, data, secrets)
    with tempfile.TemporaryDirectory(prefix='hf-source-', dir=output.parent) as tmp:
        staged = Path(tmp) / 'source.tar.gz'
        with staged.open('wb') as output_stream, gzip.GzipFile(filename='', mode='wb', fileobj=output_stream, mtime=0) as compressed:
            with tarfile.open(mode='w', fileobj=compressed) as tar:
                for name, (mode, data) in sorted(files.items()):
                    info = tarfile.TarInfo('home-fashion/' + name)
                    info.size = len(data)
                    info.mode = 0o755 if mode & 0o100 else 0o644
                    tar.addfile(info, io.BytesIO(data))
        entries = verify(staged, root, files if commit else None)
        staged.rename(output)
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    manifest = {'archive': output.name, 'sha256': digest, 'fileCount': len(entries),
                'inspection': 'PASS: regular allowlisted files; no credentials, runtime, links, DB, build or private keys', 'files': entries}
    if commit:
        manifest['commit'] = commit
    output.with_name(output.name + '.manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return manifest

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--output', type=Path)
    action.add_argument('--verify', type=Path)
    parser.add_argument('--commit', help='Read and verify Git blobs from this commit or ref')
    args = parser.parse_args()
    try:
        if args.verify:
            commit, expected = committed_files(ROOT, args.commit) if args.commit else (None, None)
            print(json.dumps({'inspection': 'PASS', 'fileCount': len(verify(args.verify, ROOT, expected)), 'commit': commit}))
        else:
            result = package(ROOT, args.output, args.commit)
            print(json.dumps({key: value for key, value in result.items() if key != 'files'}))
    except (OSError, ValueError, tarfile.TarError, subprocess.CalledProcessError):
        # Do not echo exception payloads: third-party parsers can embed secret data.
        print('BLOQUEADO: source packaging/inspection failed; no credential content printed. Review policy or run directed tests.')
        raise SystemExit(1)
