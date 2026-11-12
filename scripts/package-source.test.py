import importlib.util
from pathlib import Path
import io
import subprocess
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('package_source', Path(__file__).with_name('package-source.py'))
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)

class SourceSafety(unittest.TestCase):
    def test_commit_archive_is_reproducible_and_ignores_worktree_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'repo'
            root.mkdir()
            tracked = root / 'package.json'
            tracked.write_bytes(b'{}\n')

            def git(*args):
                return subprocess.check_output(
                    ['git', '-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid', *args], cwd=root
                )

            git('init', '-q')
            git('add', 'package.json')
            git('commit', '-qm', 'Synthetic packaging fixture')
            first, second = Path(tmp) / 'first.tar.gz', Path(tmp) / 'second.tar.gz'
            result = source.package(root, first, 'HEAD')
            tracked.write_bytes(b'{"worktreeOnly":true}\n')
            source.package(root, second, 'HEAD')
            self.assertEqual(first.read_bytes(), second.read_bytes())
            self.assertEqual(result['commit'], git('rev-parse', 'HEAD').decode().strip())
            self.assertEqual(source.verify(first, root, source.committed_files(root, 'HEAD')[1]), ['package.json'])

    def test_denied_categories_and_examples(self):
        for name in ['.e2e-local/owner.json', 'apps/api/.env.local', '.env.e2e', 'apps/web/.next/page.js',
                     'node_modules/pkg/a.js', '.git/config', 'certs/a.pem', 'docs/export.har',
                     'docs/thesis/evidence/storageState.json', 'docs/thesis/evidence/qa-2-network-console.json',
                     'docs/thesis/evidence/automated-business-journeys/unknown-session.png', 'apps/web/src/app/secrets.css',
                     'apps/mobile/build/a.apk', 'apps/api/data/mysql.ibd', 'docs/new-unknown.json', '../outside.md']:
            self.assertFalse(source.allowed(name), name)
        for name in ['.env.example', '.env.e2e.example', 'apps/api/.env.example',
                     'docs/thesis/traceability-matrix.md', 'docs/diagrams/source/a.mmd', 'apps/api/src/database/migrations/a.ts',
                     'apps/mobile/lib/core/storage/token_storage.dart', 'apps/web/src/lib/auth/cookies.ts',
                     'apps/mobile/android/app/src/main/kotlin/app/MainActivity.kt',
                     'apps/web/src/app/tokens.css',
                     'docs/thesis/evidence/automated-business-journeys/permissions-session-06-permiso-denegado.png']:
            self.assertTrue(source.allowed(name), name)

    def test_archive_contains_source_but_no_runtime_or_embedded_secret(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'repo'; root.mkdir()
            for name, content in [('package.json', '{}'), ('.env', 'DB_PASSWORD=synthetic-private-value'),
                                  ('.env.example', 'DB_PASSWORD=change_me'), ('.e2e-local/owner.json', '{"password":"synthetic-owner-value"}'),
                                  ('apps/api/src/main.ts', 'export {};'), ('node_modules/pkg/index.js', 'private'),
                                  ('docs/thesis/evidence/release.md', '# Safe')]:
                path = root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(content)
            output = Path(tmp) / 'safe.tar.gz'
            result = source.package(root, output)
            self.assertEqual(result['fileCount'], 4)
            self.assertTrue((root / '.e2e-local/owner.json').exists())
            self.assertEqual(source.verify(output, root), result['files'])
            (root / 'apps/api/src/main.ts').write_text('synthetic-private-value')
            with self.assertRaisesRegex(ValueError, 'content withheld'):
                source.package(root, Path(tmp) / 'leak.tar.gz')
            self.assertFalse((Path(tmp) / 'leak.tar.gz').exists())

    def test_inspection_rejects_links_and_private_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); output = root / 'bad.tar.gz'
            with tarfile.open(output, 'w:gz') as tar:
                info = tarfile.TarInfo('home-fashion/package.json'); info.type = tarfile.SYMTYPE; info.linkname = '../.env'
                tar.addfile(info)
            with self.assertRaisesRegex(ValueError, 'Unsafe archive'):
                source.verify(output, root)
            with self.assertRaisesRegex(ValueError, 'content withheld'):
                source.check_content('example.ts', b'-----BEGIN ' + b'PRIVATE KEY-----\nSYNTHETIC')
            with self.assertRaisesRegex(ValueError, 'Non-placeholder'):
                source.check_content('.env.example', b'DB_PASSWORD=synthetic-real-credential')

if __name__ == '__main__':
    unittest.main()
