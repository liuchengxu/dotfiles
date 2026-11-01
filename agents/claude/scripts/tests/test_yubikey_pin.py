"""Check the prototype CLI without reading or changing a real PIN."""

import os
from pathlib import Path
import subprocess
import unittest
import uuid


class PinHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        binary = os.environ.get("YUBIKEY_PIN_TEST_BINARY")
        if not binary:
            raise unittest.SkipTest("Set YUBIKEY_PIN_TEST_BINARY to the compiled prototype")
        cls.binary = Path(binary).resolve(strict=True)

    def invoke(self, *args):
        return subprocess.run(
            [str(self.binary), *args], capture_output=True, text=True, timeout=10,
        )

    def assert_rejected(self, result, message):
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertIn(message, result.stderr)
        self.assertNotIn("dummy-initial", result.stderr)
        self.assertNotIn("dummy-updated", result.stderr)

    def test_rejects_real_service_names_and_malformed_ids(self):
        for value in ["yubikey-fido-pin", "../login.keychain-db", "", "not-a-uuid"]:
            with self.subTest(value=value):
                self.assert_rejected(self.invoke("create", value), "UUID must use")

    def test_rejects_secret_and_migration_commands(self):
        for command in ["get", "set", "import", "migrate"]:
            with self.subTest(command=command):
                self.assert_rejected(self.invoke(command, str(uuid.uuid4())), "usage:")

    def test_rejects_extra_arguments(self):
        self.assert_rejected(
            self.invoke("create", str(uuid.uuid4()), "extra"), "usage:",
        )

    def test_rejects_unknown_expected_value(self):
        self.assert_rejected(
            self.invoke("check", str(uuid.uuid4()), "secret"), "check requires",
        )

    def test_rejects_missing_arguments(self):
        self.assert_rejected(self.invoke(), "usage:")


if __name__ == "__main__":
    unittest.main()
